import {SpatialIndexer} from "./spatialindexer/SpatialIndexer";
import {Point, Vector2D} from "../utils/geometry";
import {Path} from "./Path";
import PathFinder, {FindPathAttributes} from "./PathFinder";

/**
 * Finds a path, if it conflicts with an existing path, it will draw a path
 * through the existing path, cutting the existing path in to 2 segments.
 * segment path is then reconnected.
 *
 * Eg.
 * Existing path = X
 * New path = #
 * New path start = S
 * New path End = E
 *
 * Initial state.
 * +   +   +   +   +
 *
 * +   +   E   +   +
 *
 * X X X X X X X X X
 *
 * +   +   +   +   +
 *
 * +   +   S   +   +
 *
 *
 * Existing path segmented in to 2.
 * +   +   +   +   +
 *
 * +   +   E   +   +
 *         #
 * X X X X # X X X X
 *         #
 * +   +   #   +   +
 *         #
 * +   +   S   +   +
 *
 *
 * Existing path reconnected.
 * +   +   +   +   +
 *       X X X
 * +   + X E X +   +
 *       X # X
 * X X X X # X X X X
 *         #
 * +   +   #   +   +
 *         #
 * +   +   S   +   +
 */
export class PathFinder3 {
    private spatialIndexer: SpatialIndexer; // Excluding paths.

    protected originalExistingPaths: Path[];

    protected existingPathsTable: { [uuid: string]: Path } = {};
    protected newValidPaths: Path[];
    protected segmentedPaths: SegmentedPath[]; // Segmented paths that need to be completed.
    protected segmentedPathsTable: { [pathSegmentUuid: string]: SegmentedPath } = {};

    protected firstAttempt: Path;
    protected currentPath: Path;
    private currentSegmentedPath: SegmentedPath | null;

    public constructor(spatialIndexer: SpatialIndexer, existingPaths: Path[]) {
        this.spatialIndexer = spatialIndexer.clone();

        this.originalExistingPaths = existingPaths.slice();
        for (const path of existingPaths) {
            this.existingPathsTable[path.uuid] = path;
        }
    }

    public findPath(attributes: FindPathAttributes): {
        validPaths: Path[];
        invalidPaths: Path[];
    } {
        const resolved = this.resolvePath(attributes);

        if (!resolved) {
            return {
                validPaths: this.originalExistingPaths,
                invalidPaths: [this.firstAttempt],
            };
        }

        const validPaths = this.newValidPaths.slice();

        for (const uuid in this.existingPathsTable) {
            const path = this.existingPathsTable[uuid];
                validPaths.push(path);
        }

        return {
            validPaths: validPaths,
            invalidPaths: [],
        };
    }

    protected resolvePath(attributes: FindPathAttributes): boolean {
        this.newValidPaths = [];
        this.segmentedPaths = [];
        this.segmentedPathsTable = {};

        this.currentSegmentedPath = null;
        this.currentPath = this.findSinglePath(attributes);
        this.firstAttempt = this.currentPath;

        let unresolved = false;
        while(true) {
            if (this.currentPath.isComplete) {
                let newPath;
                if (this.currentSegmentedPath) {
                    newPath = this.currentSegmentedPath.createCompletePath(this.currentPath);
                } else {
                    newPath = this.currentPath;
                }
                this.newValidPaths.push(newPath);
                this.spatialIndexer.insertPaths([newPath]);

                if (this.segmentedPaths.length) {
                    this.currentSegmentedPath = this.segmentedPaths.shift();
                    delete this.segmentedPathsTable[this.currentSegmentedPath.startSegment.uuid];
                    delete this.segmentedPathsTable[this.currentSegmentedPath.endSegment.uuid];

                    this.currentPath = this.findPathSegment(this.currentSegmentedPath);

                } else {
                    break;
                }

            } else {
                if (this.updateConflictPaths()) {
                    this.currentPath = this.findSinglePath(this.currentPath);
                } else {
                    unresolved = true;
                    break;
                }
            }

        }

        return !unresolved;
    }

    protected createPathFinder(spatialIndexer: SpatialIndexer): PathFinder {
        return new PathFinder(spatialIndexer);
    }

    protected findSinglePath(attributes: FindPathAttributes): Path {
        const spatialIndexer = this.createFindPathSpatialIndexer();
        const pathFinder = this.createPathFinder(spatialIndexer);
        return pathFinder.findPath(attributes);
    }

    /**
     * Finds middle segment of a {@see SegmentedPath}.
     */
    protected findPathSegment(segmentedPath: SegmentedPath): Path {
        const spatialIndexer = this.createFindPathSpatialIndexer();
        const pathFinder = this.createPathFinder(spatialIndexer);

        const segmentedPathLength = segmentedPath.startSegment.length + segmentedPath.endSegment.length;
        return pathFinder.findPath({
            uuid: segmentedPath.originalPath.uuid,
            spec: {
                width: segmentedPath.originalPath.spec.width,
                minLength: Math.min(0 , segmentedPath.originalPath.spec.minLength - segmentedPathLength),
                maxLength: segmentedPath.originalPath.spec.maxLength - segmentedPathLength,
            },
            start: segmentedPath.startSegment.end,
            end: segmentedPath.endSegment.start});
    }

    protected createFindPathSpatialIndexer(): SpatialIndexer {
        const spatialIndexer = this.spatialIndexer.clone();

        const paths = [];
        // NewValidPaths are inserted as they are generated.
        for (const uuid in this.existingPathsTable) {
            paths.push(this.existingPathsTable[uuid]);
        }
        for (const pathSegmentSet of this.segmentedPaths) {
            paths.push(pathSegmentSet.startSegment);
            paths.push(pathSegmentSet.endSegment);
        }

        spatialIndexer.insertPaths(paths);
        return spatialIndexer;
    }

    /**
     * Cuts a "hole" in to existing paths that are in the way for the current path.
     * @return Changes made when updating.
     */
    protected updateConflictPaths(): boolean {
        const path = this.currentPath;
        if (!path.blockingPathNodes.length) {
            return false;
        }

        for (const blockingPathNode of path.blockingPathNodes) {
            if (this.existingPathsTable.hasOwnProperty(blockingPathNode.uuid)) {
                const newBlockingPath = this.existingPathsTable[blockingPathNode.uuid];
                const newPathSegmentSet = SegmentedPath.fromValidPath(newBlockingPath, blockingPathNode.nodeIndex);
                if (newPathSegmentSet) {
                    delete this.existingPathsTable[blockingPathNode.uuid];
                    this.segmentedPaths.push(newPathSegmentSet);
                    this.segmentedPathsTable[newPathSegmentSet.startSegment.uuid] = newPathSegmentSet;
                    this.segmentedPathsTable[newPathSegmentSet.endSegment.uuid] = newPathSegmentSet;

                    return true;

                }
            }

            if (this.segmentedPathsTable.hasOwnProperty(blockingPathNode.uuid)) {
                const segmentedPath = this.segmentedPathsTable[blockingPathNode.uuid];
                let updated = false;
                if (segmentedPath.startSegment.uuid === blockingPathNode.uuid) {
                    updated = segmentedPath.updateStartSegment(blockingPathNode.nodeIndex);
                } else if (segmentedPath.endSegment.uuid === blockingPathNode.uuid) {
                    updated = segmentedPath.updateEndSegment(blockingPathNode.nodeIndex);
                }
                if (updated) {
                    return true;
                }
            }
        }

        return false;

    }
}

const NODES_TO_CUT = 1; // Nodes to cut from blocking node.
const NODES_FOR_TURN = 2; // Nodes required for a path to make a turn.


/**
 * Eg.
 *  Original path:
 *  start                      end
 *  ------------------------------
 *
 *
 *  Segmented path:
 *  --------------xx--------------
 *  start segment      end segment
 */
export class SegmentedPath {
    private _originalPath: Path;
    private _startSegment: Path;
    private _endSegment: Path;


    constructor(path: Path, startSegment: Path, endSegment: Path) {
        this._originalPath = path;
        this._startSegment = startSegment;
        this._endSegment = endSegment;
    }

    public static fromValidPath(path: Path, blockingNodeIndex: number): SegmentedPath | null {
        console.assert(path.isComplete);

        // Don't let the start and end be cut, path needs to be able to make a turn.
        const startSegmentEndNodeIndex = Math.min(path.nodes.length - NODES_FOR_TURN, blockingNodeIndex + NODES_TO_CUT + 1);
        const endSegmentStartNodeIndex = Math.max(NODES_FOR_TURN - 1, blockingNodeIndex - NODES_TO_CUT - 1);

        // Minimum of 2 nodes need to be cut (cutting 1 node would leave 0 gap between the 2 segments)
        const nodesCut = startSegmentEndNodeIndex - endSegmentStartNodeIndex;
        if (nodesCut <= 2) {
            return null
        }

        const startSegNodes = path.nodes.slice(startSegmentEndNodeIndex);
        const startSegment = new Path({
            spec: path.spec,
            start: path.start,
            end: Point.copy(path.nodes[startSegmentEndNodeIndex]),
            nodes: startSegNodes,
            keepouts: path.keepouts.slice(startSegmentEndNodeIndex),
            isComplete: false,
            collisions: [],
            collisionWithUuids: [],
            length: SegmentedPath.calcLength(startSegNodes),
            isTooLong: false,
            blockingPathNodes: [],
        });

        const endSegNodes = path.nodes.slice(0, endSegmentStartNodeIndex + 1);
        const endSegment = new Path({
            spec: path.spec,
            start: Point.copy(path.nodes[endSegmentStartNodeIndex]),
            end: path.end,
            nodes: endSegNodes,
            keepouts: path.keepouts.slice(0, endSegmentStartNodeIndex + 1),
            isComplete: false,
            collisions: [],
            collisionWithUuids: [],
            length: SegmentedPath.calcLength(endSegNodes),
            isTooLong: false,
            blockingPathNodes: [],
        });

        return new SegmentedPath(path, startSegment, endSegment);
    }

    private static calcLength(nodes: Vector2D[]): number {
        let length = 0;
        let lastNode: Point | null = null;
        for (const node of nodes) {
            if (lastNode) {
                const delta = lastNode.distance(node);
                length += delta;
            }

            lastNode = Point.copy(node);
        }

        return length;
    }

    public get originalPath(): Path {
        return this._originalPath;
    }

    public get startSegment(): Path {
        return this._startSegment;
    }

    public get endSegment(): Path {
        return this._endSegment;
    }

    /**
     * @return If update was successful.
     */
    public updateStartSegment(blockingNodeIndex: number): boolean {
        const path = this._startSegment;

        // Don't let the start be cut, path needs to be able to make a turn.
        const segmentEndNodeIndex = Math.min(path.nodes.length - NODES_FOR_TURN, blockingNodeIndex + NODES_TO_CUT + 1);

        // No change.
        if (segmentEndNodeIndex === 0) {
            return false
        }

        const nodes = path.nodes.slice(segmentEndNodeIndex);
        this._startSegment = new Path({
            uuid: path.uuid,
            spec: path.spec,
            start: path.start,
            end: Point.copy(path.nodes[segmentEndNodeIndex]),
            nodes: nodes,
            keepouts: path.keepouts.slice(segmentEndNodeIndex),
            isComplete: false,
            collisions: [],
            collisionWithUuids: [],
            length: SegmentedPath.calcLength(nodes),
            isTooLong: false,
            blockingPathNodes: [],
        });

        return true;
    }

    /**
     * @return If update was successful.
     */
    public updateEndSegment(blockingNodeIndex: number): boolean {
        const path = this._endSegment;

        // Don't let the end be cut, path needs to be able to make a turn.
        const segmentStartNodeIndex = Math.max(NODES_FOR_TURN - 1, blockingNodeIndex - NODES_TO_CUT - 1);

        // No change.
        if (segmentStartNodeIndex === path.nodes.length - 1 ) {
            return false;
        }

        const nodes = path.nodes.slice(0, segmentStartNodeIndex + 1);
        this._endSegment = new Path({
            uuid: path.uuid,
            spec: path.spec,
            start: Point.copy(path.nodes[segmentStartNodeIndex]),
            end: path.end,
            nodes: nodes,
            keepouts: path.keepouts.slice(0, segmentStartNodeIndex + 1),
            isComplete: false,
            collisions: [],
            collisionWithUuids: [],
            length: SegmentedPath.calcLength(nodes),
            isTooLong: false,
            blockingPathNodes: [],
        });

        return true;
    }

    public createCompletePath(middleSegment: Path): Path {
        console.assert(middleSegment.isComplete);
        console.assert(middleSegment.start.equals(this._startSegment.end));
        console.assert(middleSegment.end.equals(this._endSegment.start));

        const middleNodes = middleSegment.nodes.slice();
        middleNodes.shift();
        middleNodes.pop();
        const nodes = this._endSegment.nodes.slice();
        nodes.push(...middleNodes);
        nodes.push(...this._startSegment.nodes);

        const middleKeepouts = middleSegment.keepouts.slice();
        middleKeepouts.shift();
        middleKeepouts.pop();
        const keepouts = this._endSegment.keepouts.slice();
        keepouts.push(...middleKeepouts);
        keepouts.push(...this._startSegment.keepouts);

        // Remove loops (Path overlapping itself).
        let start;
        let range;
        do {
            range = 0;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeA = nodes[i];
                    const nodeB = nodes[j];
                    if (nodeA.x === nodeB.x &&
                        nodeA.y === nodeB.y &&
                        j - i > range) {
                        start = i;
                        range = j - i;
                    }
                }
            }
            if (start && range) {
                nodes.splice(start, range);
                keepouts.splice(start, range)
            }
        } while (range > 0);

        const length = SegmentedPath.calcLength(nodes);

        return new Path({
            uuid: this._originalPath.uuid,
            spec: this._originalPath.spec,
            start: this._originalPath.start,
            end: this._originalPath.end,
            nodes: nodes,
            keepouts: keepouts,
            isComplete: middleSegment.isComplete,
            collisions: middleSegment.collisions,
            collisionWithUuids: middleSegment.collisionWithUuids,
            length: length,
            isTooLong: middleSegment.isTooLong,
            blockingPathNodes: middleSegment.blockingPathNodes,
        });

    }
}