import {Module} from "../../module/Module";
import {HasCorners, HasEdges, Point, Polyline} from "../../utils/geometry";
import {PlacedItem} from "../../placeditem/PlacedItem";
import {DesignRevision} from "../DesignRevision";
import {Board} from "../../model/Board";
import {EdgePlacement} from "./EdgePlacement";


/**
 * Geometrically analyze the board and its contents for space available, given a module.
 */
export class PlacementAnalyzer {

    /**
     * A bounding rectangle surrounding PlacedItems.
     * Not always up to date: it is only updated when needed.
     */
    public itemBoundary: HasEdges|null;

    constructor(private readonly designRev: DesignRevision) {
        this.refreshItemBoundary();
    }

    public get isBoardSizeOptimizable(): boolean {
        if (this.board.getCornerRadius() > 0) return false;
        const boundary = this.itemBoundary;
        if (!boundary) return false;
        const board = this.designRev.board;
        const boardBoundary = {
            bottom: board.position.y,
            top: board.position.y + board.height,
            left: board.position.x,
            right: board.position.x + board.width
        };
        return boundary.bottom !== boardBoundary.bottom ||
            boundary.top !== boardBoundary.top ||
            boundary.left !== boardBoundary.left ||
            boundary.right !== boardBoundary.right
    }

    public getSpace(module: Module): Point {
        const moduleWidth = module.getWidth();
        const moduleHeight = module.getHeight();
        if (this.placedItems.length === 0) {
            return this.board.getCentrePoint(moduleWidth, moduleHeight);
        }
        const foundSpace = this.findSpace(moduleWidth, moduleHeight);
        if (foundSpace) {
            return foundSpace;
        }
        const madeSpace = this.makeSpace(moduleWidth, moduleHeight);
        if (madeSpace) {
            return madeSpace;
        }
        return this.board.getCentrePoint(moduleWidth, moduleHeight);
    }

    public makeEdgePosition(module: Module): Point {
        const placement = new EdgePlacement(this.designRev);
        return placement.makeEdgePosition(module);
    }

    /**
     * Try to find a space beside another module.
     */
    private findSpace(moduleWidth: number, moduleHeight: number): Point | undefined {
        // Iterate backward, as more-recently placed items are more likely to have space.
        for (let i = this.placedItems.length - 1; i >= 0; --i) {
            const placedItem = this.placedItems[i];

            for (const point of placedItem.getSurroundingPoints(moduleWidth, moduleHeight)) {
                const polygon = Polyline.rectangle(point, moduleWidth, moduleHeight);
                if (this.isValidPlacement(polygon)) {
                    return point;
                }
            }
        }
    }

    /**
     * If space cannot be found, try to expand one side of the board,
     * and get the newly-opened location.
     */
    private makeSpace(moduleWidth: number, moduleHeight: number): Point | undefined {
        const heightNeeded = this.itemBoundary.top + moduleHeight;
        const widthNeeded = this.itemBoundary.right + moduleWidth;
        const canExpandTop = this.board.isHeightValid(heightNeeded) && this.board.canMoveEdge('top');
        const canExpandRight = this.board.isWidthValid(widthNeeded) && this.board.canMoveEdge('right');

        if (canExpandRight) {
            if (this.shouldWidthExpand() || !canExpandTop) {
                this.board.setRightEdge(widthNeeded);
                return new Point(this.itemBoundary.right, this.itemBoundary.bottom);
            }
        }

        if (canExpandTop) {
            this.board.setTopEdge(heightNeeded);
            return new Point(this.itemBoundary.left, this.itemBoundary.top);
        }
    }

    private isValidPlacement(itemToPlace: Polyline): boolean {
        return !this.board.isPolylineOutOfBounds(itemToPlace) &&
            this.designRev.isNotOverlapping(itemToPlace);
    }

    private get placedItems(): PlacedItem[] {
        return this.designRev.placedItems;
    }

    private get board(): Board {
        return this.designRev.board;
    }

    /**
     * For retaining a roughly-4:3 rectangle shape for the board and PlacedItems.
     */
    private shouldWidthExpand(): boolean {
        if (!this.designRev.hasPlacedItems) {
            return true;
        }
        // The above check prevents dividing by zero.
        const itemsWidth = Math.abs(this.itemBoundary.right - this.itemBoundary.left);
        const itemsHeight = Math.abs(this.itemBoundary.top - this.itemBoundary.bottom);
        const idealRatio = 4/3;
        return itemsWidth/itemsHeight < idealRatio;
    }

    /**
     * Recalculate the edges that form a bounding rectangle around all placed items.
     */
    public refreshItemBoundary(): HasEdges {
        if (!this.designRev.hasPlacedItems) {
            this.itemBoundary = null;
            return;
        }
        this.itemBoundary = {
            top: -Infinity,
            bottom: Infinity,
            left: Infinity,
            right: -Infinity
        };
        for (const placedItem of this.placedItems) {
            this.updateItemBoundary(placedItem);
        }
        return this.itemBoundary;
    }

    public updateItemBoundary(item: PlacedItem): void {
        const boundary = this.itemBoundary;
        if (!boundary) {
            this.itemBoundary = {
                top: item.yMax,
                bottom: item.yMin,
                left:  item.xMin,
                right: item.xMax
            };
            return;
        }
        boundary.top = Math.max(boundary.top, item.yMax);
        boundary.bottom = Math.min(boundary.bottom, item.yMin);
        boundary.left = Math.min(boundary.left, item.xMin);
        boundary.right = Math.max(boundary.right, item.xMax);
    }

    public findNextCorner(mountingHole: Module): Point | null {
        if (this.placedItems.length === 0) {
            return this.board.getBottomLeft();
        }
        const width = mountingHole.getWidth();
        const height = mountingHole.getHeight();
        const boardCorners = this.board.getCornerPoints(width, height);

        const isValidPlacement = (polygonPosition: Point, keepoutPoint: Point) => {
            const speculativePlacement = Polyline.rectangle(polygonPosition, width, height);
            return !speculativePlacement.contains(keepoutPoint);
        };

        const cornerItemPoints = this.getCornerItemPoints();
        for (const key in boardCorners) {
            if (isValidPlacement(boardCorners[key], cornerItemPoints[key])) {
                return boardCorners[key];
            }
        }
        return this.getSpace(mountingHole);
    }

    /**
     * Finds valid corner Points on the board, given a Module (typically, a Mounting Hole).
     * If not available (very likely), expand the board to make room.
     */
    public findCorners(mountingHole: Module): HasCorners {
        const board = this.board;
        const holeWidth = mountingHole.getWidth();
        const holeHeight = mountingHole.getHeight();

        const boundary = this.getCornerItemPoints(); // Item points closest to the corners of the board.
        if (!boundary) {
            return board.getCornerPoints(holeWidth, holeHeight);
        }

        // Small space between mounting holes and other modules:
        const buffer = 5;
        const bufferedWidth = holeWidth + buffer;
        const bufferedHeight = holeHeight + buffer;

        const cornerPoints = board.getCornerPoints(bufferedWidth, bufferedHeight);

        const isValidPlacement = (polygonPosition: Point, keepoutPoint: Point) => {
            const speculativePlacement = Polyline.rectangle(polygonPosition, bufferedWidth, bufferedHeight);
            return !speculativePlacement.contains(keepoutPoint);
        };

        const canPlaceBottomLeft = isValidPlacement(cornerPoints.bottomLeft, boundary.bottomLeft);
        const canPlaceTopLeft = isValidPlacement(cornerPoints.topLeft, boundary.topLeft);
        const canPlaceBottomRight = isValidPlacement(cornerPoints.bottomRight, boundary.bottomRight);
        const canPlaceTopRight = isValidPlacement(cornerPoints.topRight, boundary.topRight);

        // Only expand the edges that need to be expanded.
        if (canPlaceBottomLeft && canPlaceTopLeft) {
            if (canPlaceBottomRight && canPlaceTopRight) {
                return board.getCornerPoints(holeWidth, holeHeight);
            }
            board.translateRightEdge(bufferedWidth);
        }
        else if (canPlaceBottomRight && canPlaceTopRight) {
            board.translateLeftEdge(-bufferedWidth);
        }
        else if (canPlaceTopLeft && canPlaceTopRight) {
            board.translateBottomEdge(-bufferedHeight);
        }
        else if (canPlaceBottomLeft && canPlaceBottomRight) {
            board.translateTopEdge(bufferedHeight);
        }
        else {
            board.expand(bufferedWidth, bufferedHeight);
        }
        return board.getCornerPoints(holeWidth, holeHeight);
    }

    /**
     * Find the PlacedItem points closest to the corners of the board.
     * Based on distance from the board corner Point to PlacedItem Point.
     */
    private getCornerItemPoints(): HasCorners | null {
        if (this.placedItems.length === 0) {
            return null;
        }
        const closestPoints = {
            topLeft: new Point(Infinity, Infinity),
            bottomLeft: new Point(Infinity, Infinity),
            topRight: new Point(Infinity, Infinity),
            bottomRight: new Point(Infinity, Infinity)
        };
        const topLeft = this.board.getTopLeft();
        const topRight = this.board.getTopRight();
        const bottomLeft = this.board.getBottomLeft();
        const bottomRight = this.board.getBottomRight();

        for (const placedItem of this.placedItems) {
            for (const point of placedItem.points) {
                if (topLeft.distance(point) < topLeft.distance(closestPoints.topLeft)) {
                    closestPoints.topLeft = point;
                }
                if (bottomLeft.distance(point) < bottomLeft.distance(closestPoints.bottomLeft)) {
                    closestPoints.bottomLeft = point;
                }
                if (topRight.distance(point) < topRight.distance(closestPoints.topRight)) {
                    closestPoints.topRight = point;
                }
                if (bottomRight.distance(point) < bottomRight.distance(closestPoints.bottomRight)) {
                    closestPoints.bottomRight = point;
                }
            }
        }
        return closestPoints;
    }
}

/**
 * Given an orientation (eg. "top"), find the
 * rotation needed to convert it to another direction (eg. "left").
 */
export class RotationCalculator {

    // TODO: currently, rotation is counterclockwise.
    private static ROTATION_MAP = {
        top: 0,
        left: 90,
        bottom: 180,
        right: 270
    } as HasEdges;

    public static calculate(fromEdge: string, toEdge: string): number {
        if (fromEdge === toEdge) {
            return 0;
        }
        const rotation = this.ROTATION_MAP[toEdge] - this.ROTATION_MAP[fromEdge];
        if (rotation > 0) {
            return rotation;
        }
        return 360 + rotation;
    }

    public static toTop(fromEdge: string): number {
        return RotationCalculator.calculate(fromEdge, 'top');
    }
}