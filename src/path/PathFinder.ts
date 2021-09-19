import {Point, Polyline, Vector2D} from "../utils/geometry";
import {Path} from "./Path";
import {PathSpec} from "../connection/PathSpec";
import {
    SpatialIndexer,
    SpatialIndexerIntersectRectangle,
    SpatialIndexerItemType
} from "./spatialindexer/SpatialIndexer";
import {PriorityQueue} from "../core/data-structures/PriorityQueue";

export interface FindPathAttributes {
    uuid: string;
    spec: PathSpec;
    start: Point;
    end: Point;
}

/**
 * Finds a path without moving other paths.
 * NOTE: Records path collision with existing paths (blockingPaths).
 */
export default class PathFinder {
    private uuid: string;
    private pathSpec: PathSpec;
    private start: Point;
    private end: Point;

    private gridSize: number; // Distance between nodes.
    private openNodesPq: PriorityQueue<PathFindNode>; // Nodes closer to the goal has higher priority.
    private visitedNodePoints: Map<number, Set<number>>; // Map<x, Set<y>>
    private blockingPathNodes: {
        uuid: string,
        nodeIndex: number,
        distance: number}[]; // Array of existing paths nodes that block the traversal of this path, along with the distance to goal.

    private rectangleCollisionsMap: Map<PathFindNode, SpatialIndexerIntersectRectangle[]> = new Map<PathFindNode, SpatialIndexerIntersectRectangle[]>();

    /** The solution, or best attempt if we fail. */
    private resultNode: PathFindNode = null;

    // public logger: SolutionLogger = new NullLogger();


    // Contains obstacles and existing paths, that the current path should navigate around.
    private spatialIndexer: SpatialIndexer;

    public constructor(spatialIndexer: SpatialIndexer) {
        this.spatialIndexer = spatialIndexer;
        this.openNodesPq = new PriorityQueue<PathFindNode>((a, b) => {
            return (a.lengthToStart + a.distanceToGoal) - (b.lengthToStart + b.distanceToGoal);
        })
    }

    /**
     * Attempt to find a clear path through the obstacles and boundary.
     */
    public findPath(attributes: FindPathAttributes): Path {
        this.uuid = attributes.uuid;
        this.pathSpec = attributes.spec;
        this.start = attributes.start;
        this.end = attributes.end;

        this.updateGridSize();
        this.openNodesPq.clear();
        this.visitedNodePoints = new Map<number, Set<number>>();
        this.blockingPathNodes = [];
        this.rectangleCollisionsMap.clear();
        this.resultNode = null;

        // const startTime = new Date().getTime();
        this.findSolutionNode();
        // const totalTime = new Date().getTime() - startTime;
        // this.logger.logObstacles(this.obstacles);
        // this.logger.logResult(this.resultNode, totalTime);
        return this.createPath();
    }

    public fromNodes(uuid: string,
                     nodes: Vector2D[],
                     pathSpec: PathSpec,
                     start: Point,
                     end: Point): Path | null {
        this.uuid = uuid;
        this.pathSpec = pathSpec;
        this.start = start;
        this.end = end;

        this.updateGridSize();

        this.blockingPathNodes = [];
        this.rectangleCollisionsMap.clear();

        this.resultNode = PathFindNode.initial(this.pathSpec, this.start, this.end);
        let i = nodes.length;
        while(i-- > 0) {
            const node = nodes[i];
            if (i === nodes.length - 1) {
                if (!this.start.equals(node)) {
                    return null;
                }
                continue;
            }

            // Insure nodes are in correct grid size.
            if (Math.abs(node.x - this.resultNode.point.x) > Math.ceil(this.gridSize) ||
                Math.abs(node.y - this.resultNode.point.y) > Math.ceil(this.gridSize)) {
                return null;
            }

            this.resultNode = this.resultNode.createSuccessor(node);
            if (this.resultNode.isTooLong) {
                break;
            }

            const rectangles = this.intersects(this.resultNode);

            if (!this.isIntersectsValid(rectangles)) {
                this.rectangleCollisionsMap.set(this.resultNode, rectangles);
            }
        }

        return this.createPath();
    }

    /**
     * If the grid is too fine, the performance suffers. If the grid is too
     * coarse, we'll fail to find a path through tight spaces.
     */
    private updateGridSize(): void {
        // Empirically determined; tweak if needed.
        const cutoff = 40;
        // Prevents "needless" collisions with the starting module.
        const shim = 1;
        this.gridSize =  this.pathSpec.width >= cutoff
            ? (this.pathSpec.width / 2) + shim
            : this.pathSpec.width;
        // Integers are persisted for coordinates (prevent node coordinates
        // from changing after loading paths from the server).
        this.gridSize = Math.round(this.gridSize);
    }

    private findSolutionNode(): void {
        this.visitedNodePoints = new Map<number, Set<number>>();
        this.resultNode = PathFindNode.initial(this.pathSpec, this.start, this.end);
        this.openNodesPq.add(this.resultNode);
        while (!this.openNodesPq.isEmpty()) {
            const currentNode = this.openNodesPq.poll();
            if (currentNode.point.equals(this.end)) {
                this.resultNode = currentNode;
                return;
            } else if (this.isCloseEnough(currentNode)) {
                this.resultNode = currentNode.createSuccessor(this.end);
                return;
            }
            const newOpenNodes = this.generateAdjacentNode(currentNode);
            newOpenNodes.forEach(newOpenNode => {
                this.openNodesPq.add(newOpenNode);
            })
        }
    }

    private addVisited(point: Point): void {
        if (!this.visitedNodePoints.has(point.x)) {
            this.visitedNodePoints.set(point.x, new Set<number>());
        }
        this.visitedNodePoints.get(point.x).add(point.y);
    }

    private isVisited(point: Point): boolean {
        if (!this.visitedNodePoints.has(point.x)) {
            return false;
        }
        return this.visitedNodePoints.get(point.x).has(point.y);
    }

    private generateAdjacentNode(current: PathFindNode): PathFindNode[] {
        const validNodes = [];
        const points = this.findAdjacentPoints(current.point);
        const possibleNodes = points.map(point => current.createSuccessorWithGridSize(point, this.gridSize));
        for (const node of possibleNodes) {
            if (this.isVisited(node.point)) {
                continue;
            }
            this.addVisited(node.point);

            if (node.isTooLong) {
                this.updateFailure(node);
                continue;
            }
            const rectangles = this.intersects(node);
            if (!this.isIntersectsValid(rectangles)) {
                this.rectangleCollisionsMap.set(node, rectangles);
                this.updateBlockPaths(node, rectangles[0]);
                this.updateFailure(node);
                continue;
            }
            validNodes.push(node);
        }
        return validNodes;
    }

    protected isIntersectsValid(rectangles: SpatialIndexerIntersectRectangle[]): boolean {
        return rectangles.length == 0;
    }

    private updateFailure(failure: PathFindNode): void {
        if (null === this.resultNode) {
            this.resultNode = failure;
        } else if (failure.distanceToGoal < this.resultNode.distanceToGoal) {
            this.resultNode = failure;
        }
    }

    private updateBlockPaths(node: PathFindNode,
                             rectangle: SpatialIndexerIntersectRectangle): void {
        if (rectangle.type !== SpatialIndexerItemType.PATH) {
            return;
        }

        this.blockingPathNodes.push({
            uuid: rectangle.uuid,
            nodeIndex: rectangle.data['nodeIndex'],
            distance: node.distanceToGoal,
        });
    }

    private findAdjacentPoints(current: Point): Point[] {
        const step = this.gridSize;
        return [
            current.add(new Point(step, 0)),
            current.add(new Point(-step, 0)),
            current.add(new Point(0, step)),
            current.add(new Point(0, -step)),
        ];
    }

    private intersects(node: PathFindNode): SpatialIndexerIntersectRectangle[] {
        if (this.containsEndpoint(node)) {
            return [];
        }
        return this.spatialIndexer.intersectRectangles(node.keepout);
    }

    /**
     * True if the polygon contains the start or end points.
     *
     * We typically do not want to consider this to be a collision.
     */
    private containsEndpoint(node: PathFindNode): boolean {
        return node.isStartNode || node.keepout.contains(this.end);
    }

    /**
     * The end point probably won't lie exactly on the grid.
     */
    private isCloseEnough(solution: PathFindNode): boolean {
        const box = solution.keepout;
        return box.contains(this.end);
    }

    /**
     * Update the path so it can be shown to the user.
     */
    private createPath(): Path {
        const isComplete = this.resultNode.isComplete;

        const nodes: Vector2D[] = [];
        const keepouts: Polyline[] = [];

        const collisions: Point[] = [];
        const collisionWithUuids = new Set<string>();

        let currentNode = this.resultNode;
        while (currentNode) {
            nodes.push({x: currentNode.point.x, y: currentNode.point.y});
            keepouts.push(currentNode.keepout);

            const rectangleCollisions = this.rectangleCollisionsMap.get(currentNode);

            if (rectangleCollisions) {
                for (const rectangleCollision of rectangleCollisions) {
                    if (rectangleCollision.type === SpatialIndexerItemType.BOARD) {
                        continue;
                    }
                    collisionWithUuids.add(rectangleCollision.uuid);
                    const newCollisions = rectangleCollision.rectangle.intersectionPoints(currentNode.keepout);
                    if (newCollisions.length > 0) {
                        collisions.push(...newCollisions);
                    }

                }
            }

            currentNode = currentNode.cameFrom;
        }

        return new Path({
            uuid: this.uuid,
            spec: this.pathSpec,
            start: this.start,
            end: this.end,
            nodes: nodes,
            keepouts: keepouts,
            isComplete: isComplete,
            collisions: collisions,
            collisionWithUuids: Array.from(collisionWithUuids),
            length: this.resultNode ? this.resultNode.lengthToStart : 0,
            isTooLong: this.resultNode.isTooLong,
            blockingPathNodes: isComplete ?
                [] :
                this.blockingPathNodes.sort((a, b) => a.distance - b.distance),
        });
    }
}

/**
 * All attributes that are called repeatedly during findSolutionNode() are cached for
 * performance purposes.
 */
export class PathFindNode {
    private _cameFrom: PathFindNode | null = null;
    private _point: Point;
    private _keepout: Polyline;

    private _lengthToStart: number = 0;
    private _distanceToGoal: number;
    private _isTooLong: boolean;

    private constructor(private readonly spec: PathSpec,
                        private readonly goal: Vector2D) {
    }

    public static initial(spec: PathSpec, start: Point, end: Point): PathFindNode {
        const node = new PathFindNode(spec, end);
        node._point = Point.copy(start);
        node.updateKeepout();
        node.updateDistanceToGoal();
        node.updateIsTooLong();
        return node;
    }

    /**
     * Used to speed up calculations (we already know the distance between the
     * nodes unless it's at the end)
     */
    public createSuccessorWithGridSize(newHead: Vector2D, gridSize: number) {
        const newNode = new PathFindNode(this.spec, this.goal);
        newNode._cameFrom = this;
        newNode._point = Point.copy(newHead);
        newNode.updateKeepout();
        newNode.updateLengthByGridSize(gridSize);
        newNode.updateDistanceToGoal();
        newNode.updateIsTooLong();
        return newNode;
    }

    public createSuccessor(newHead: Vector2D) {
        const newNode = new PathFindNode(this.spec, this.goal);
        newNode._cameFrom = this;
        newNode._point = Point.copy(newHead);
        newNode.updateKeepout();
        newNode.updateLength();
        newNode.updateDistanceToGoal();
        newNode.updateIsTooLong();
        return newNode;
    }

    public get isStartNode(): boolean {
        return this._cameFrom === null;
    }

    public get cameFrom(): PathFindNode | null {
        return this._cameFrom;
    }

    public get point(): Point {
        return this._point;
    }

    /**
     * Path length to the start.
     */
    public get lengthToStart(): number {
        return this._lengthToStart;
    }

    private updateLength(): void {
        if (!this._cameFrom) {
            return;
        }
        this._lengthToStart = this._cameFrom._lengthToStart + this._point.distance(this._cameFrom._point);
    }

    /**
     * Used to speed up calculations (we already know the distance between the
     * nodes unless it's at the end)
     */
    private updateLengthByGridSize(gridSize: number): void {
        if (!this._cameFrom) {
            this._lengthToStart = 0;
        } else {
            this._lengthToStart = this._cameFrom._lengthToStart + gridSize;
        }
    }

    public get keepout(): Polyline {
        return this._keepout;
    }

    private updateKeepout(): void {
        const radius = this.spec.width / 2;
        const bottomLeft = this._point.subtract(new Point(radius, radius));
        this._keepout = Polyline.square(bottomLeft, this.spec.width);
    }

    /**
     * Straight line distance to goal.
     */
    public get distanceToGoal(): number {
        return this._distanceToGoal;
    }

    private updateDistanceToGoal(): void {
        this._distanceToGoal = this._point.distance(this.goal);
    }

    public get isTooLong(): boolean {
        return this._isTooLong;
    }

    private updateIsTooLong(): void {
        this._isTooLong = this._lengthToStart + this.distanceToGoal > this.spec.maxLength;
    }

    /**
     * This should be called only once after findSolutionNode(),
     * leaving this to generate as you call it should be better for performance
     * (not caching it).
     */
    public get isComplete(): boolean {
        return this._point.equals(this.goal)
            && this.lengthToStart >= this.spec.minLength
            && !this.isTooLong;
    }
}
