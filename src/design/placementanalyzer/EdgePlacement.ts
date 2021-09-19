import {DesignRevision} from "../DesignRevision";
import {Module} from "../../module/Module";
import {HasEdges, Point, Polyline, Vector2D} from "../../utils/geometry";
import {PlacedModule} from "../../placedmodule/PlacedModule";

export class EdgePlacement {

    constructor(private readonly designRev: DesignRevision) {
    }

    /**
     * Get a position for an edge module. This assumes that the edge module
     * will be oriented to the top of the board.
     */
    public makeEdgePosition(edgeModule: Module): Point {
        const board = this.designRev.board;
        if (this.designRev.getPlacedModules().length === 0) {
            return board.getCentrePoint(edgeModule.getWidth(), edgeModule.getHeight());
        }
        let height;
        let width;
        const isSideways = edgeModule.edgeConstraints.some(constraint =>
            ['left', 'right'].indexOf(constraint) !== -1);
        if (isSideways) {
            height = edgeModule.getWidth();
            width = edgeModule.getHeight();
        } else {
            height = edgeModule.getHeight();
            width = edgeModule.getWidth();
        }
        const isOnBoard = (position: Vector2D) => {
            const speculativePlacement = Polyline.rectangle(position, width, height);
            return !board.isPolylineOutOfBounds(speculativePlacement);
        };
        const itemBoundary = this.nonconstrainedBoundary;
        if (itemBoundary && board.yMax < itemBoundary.top + height) {
            board.setTopEdge(itemBoundary.top + height);
        }
        const validEdgePoint = this.findEdgePoint(width, height);
        if (validEdgePoint && isOnBoard(validEdgePoint)) {
            return validEdgePoint;
        }
        if (itemBoundary) {
            const position = new Point(itemBoundary.left, itemBoundary.top);
            if (isOnBoard(position)) {
                return position;
            }
        }
        return board.getCentrePoint(edgeModule.getWidth(), edgeModule.getHeight());
    }

    /**
     * Try to find a space in which the edge module can fit along the top of the board,
     * where d >= module width.
     *      d      d
     *    |<->|  |<-->|
     *  __|___|__|____|__
     * |//|   |//|    |//| <- Anchored/edge modules
     *  Board top edge
     */
    private findEdgePoint(width: number, height: number): Point | undefined {
        const topConstrained = this.topConstrainedModules;
        if (topConstrained.length === 0) return;
        const board = this.designRev.board;
        const yPos = board.yMax - height;
        const backup = new Point(topConstrained[0].xMin - width, yPos);

        const isValid = (position: Vector2D) => {
            return position.x > board.x && position.x + width < board.xMax;
        };

        for (let i = 0; i < topConstrained.length; ++i) {
            const current = topConstrained[i];
            const currentXMax = current.xMax;
            const next = topConstrained[i + 1];
            if (!next) {
                const point = new Point(currentXMax, yPos);
                if (isValid(point)) {
                    return point;
                }
                if (isValid(backup)) {
                    return backup;
                }
                board.setRightEdge(currentXMax + width);
                return point;
            }
            if (next.xMin - currentXMax >= width) {
                return new Point(currentXMax, yPos);
            }
            if (!next.canMoveHorizontally()) { // Eg., a corner-constrained mounting hole
                board.translateRightEdge(width + currentXMax - next.xMin);
                return new Point(currentXMax, yPos);
            }
        }
    }

    private get topConstrainedModules(): PlacedModule[] {
        const board = this.designRev.board;
        const topConstrained = this.designRev.getPlacedModules().filter(pm => {
            const isEdgeAnchored = pm.yMax === board.yMax && !pm.canMoveVertically();
            return pm.hasEdgeConstraint('top') || isEdgeAnchored;
        });
        return topConstrained.sort((a, b) => a.xMin - b.xMin);
    }

    /**
     * A boundary around the items not restricted by edge constraints or locked anchors.
     */
    private get nonconstrainedBoundary(): HasEdges | null {
        const boundary = {
            top: -Infinity,
            bottom: Infinity,
            left: Infinity,
            right: -Infinity
        };
        let isValidBoundary;
        for (const item of this.designRev.placedItems) {
            if (!item.canMoveVertically() || !item.canMoveHorizontally()) {
                continue;
            }
            boundary.top = Math.max(boundary.top, item.yMax);
            boundary.bottom = Math.min(boundary.bottom, item.yMin);
            boundary.left = Math.min(boundary.left, item.xMin);
            boundary.right = Math.max(boundary.right, item.xMax);
            isValidBoundary = true;
        }
        return isValidBoundary ? boundary : null;
    }
}