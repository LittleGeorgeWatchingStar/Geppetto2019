import {Action, executeAction, ReversibleAction} from "../core/action";
import {Board} from "../model/Board";
import {HasEdges, Vector2D} from "../utils/geometry";
import {RadiusChangeEvent, ResizeEvent} from "./events";
import {EdgePosition} from "../dimension/Dimensionable";
import {DesignRevision} from "../design/DesignRevision";
import {BOARD_DIMENSIONS_CHANGED} from "../design/events";
import events from "utils/events";
import {PlacementAnalyzer} from "../design/placementanalyzer/PlacementAnalyzer";


export class ResizeBoard implements ReversibleAction {
    constructor(private readonly board: Board,
                private readonly edge: EdgePosition,
                private readonly trans: Vector2D,
                private readonly lastRadius: number) {
    }

    static fromEvent(event: ResizeEvent): ResizeBoard {
        return new ResizeBoard(event.model.board, event.edge, event.vector, event.radius);
    }

    public get log(): string {
        return 'Resize board';
    }

    execute() {
        this.board.resizeLinkedByEdge(this.edge, this.trans.x, this.trans.y);
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }

    reverse() {
        this.board.resizeLinkedByEdge(this.edge, -this.trans.x, -this.trans.y);
        this.board.setCornerRadius(this.lastRadius);
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }
}

export class ChangeRadiusBoard implements ReversibleAction {
    private readonly lastRadius: number;

    constructor(private readonly board: Board,
                private readonly radius: number) {

        this.lastRadius = board.getCornerRadius();
    }

    static addToStack(board: Board, radius: number): void {
        executeAction(new ChangeRadiusBoard(board, radius));
    }

    static fromEvent(event: RadiusChangeEvent): ChangeRadiusBoard {
        return new ChangeRadiusBoard(event.board, event.radius);
    }

    public get log(): string {
        return 'Change board radius';
    }

    execute() {
        this.board.setCornerRadius(this.radius);
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }

    reverse() {
        this.board.setCornerRadius(this.lastRadius);
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }
}


/**
 * When the user fits the board to the placed module boundaries.
 * TODO this can occupy a meaningless spot in the undo stack if there are no modules or the board is already fitted.
 */
export class FitBoard implements ReversibleAction {
    private readonly originalBoardPosition: Vector2D;
    private readonly originalWidth: number;
    private readonly originalHeight: number;
    private placementAnalyzer: PlacementAnalyzer;

    constructor(private readonly designRev: DesignRevision) {
        this.originalBoardPosition = designRev.board.position;
        this.originalWidth = designRev.board.width;
        this.originalHeight = designRev.board.height;
        this.placementAnalyzer = new PlacementAnalyzer(designRev);
    }

    static addToStack(design: DesignRevision): void {
        executeAction(new FitBoard(design));
    }

    public get log(): string {
        return 'Fit board to modules';
    }

    execute() {
        if (!this.designRev.hasPlacedItems) {
            return;
        }
        const board = this.designRev.board;
        if (board.getCornerRadius() === 0) {
            this.fitToRect();
        } else {
            this.fitWithCornerRadius();
        }
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }

    reverse() {
        const board = this.designRev.board;
        board.setTopEdge(this.originalBoardPosition.y + this.originalHeight);
        board.setRightEdge(this.originalBoardPosition.x + this.originalWidth);
        board.setBottomEdge(this.originalBoardPosition.y);
        board.setLeftEdge(this.originalBoardPosition.x);
        events.publish(BOARD_DIMENSIONS_CHANGED);
    }

    private fitToRect(): void {
        const boundary = this.placementAnalyzer.refreshItemBoundary();
        const board = this.designRev.board;
        board.setTopEdge(boundary.top);
        board.setLeftEdge(boundary.left);
        board.setBottomEdge(boundary.bottom);
        board.setRightEdge(boundary.right);
    }

    private fitWithCornerRadius(): void {
        const boundary = this.placementAnalyzer.refreshItemBoundary();
        const minBoundary = this.minimumRadiusBoundary;
        const board = this.designRev.board;
        board.setRadiusLocked(true);

        const hasNoEdgeConstraints = (direction: EdgePosition) =>
            board.getAnchorByEdge(direction).linkedAnchors.length === 1;

        const setTop = () => {
            if (hasNoEdgeConstraints('top')) {
                const top = Math.max(minBoundary.top, boundary.top + board.radiusOffset);
                board.setTopEdge(top);
            }
        };

        const setLeft = () => {
            if (hasNoEdgeConstraints('left')) {
                const left = Math.min(minBoundary.left, boundary.left - board.radiusOffset);
                board.setLeftEdge(left);
            }
        };

        const setBottom = () => {
            if (hasNoEdgeConstraints('bottom')) {
                const bottom = Math.min(minBoundary.bottom, boundary.bottom - board.radiusOffset);
                board.setBottomEdge(bottom);
            }
        };

        const setRight = () => {
            if (hasNoEdgeConstraints('right')) {
                const right = Math.max(minBoundary.right, boundary.right + board.radiusOffset);
                board.setRightEdge(right);
            }
        };

        /**
         * TODO: because we only move one board edge at a time, the different conditions between each position
         * might make this process fail on items that are off the board. We figure out the proper order here.
         * This is Very Confusing, so it should be changed eventually...
         */
        if (boundary.left < board.x) {
            setLeft();
            setRight();
        } else {
            setRight();
            setLeft();
        }

        if (boundary.bottom < board.y) {
            setBottom();
            setTop();
        } else {
            setTop();
            setBottom();
        }
        board.setRadiusLocked(false);
    }

    /**
     * If there's an edge-constrained module, then we want to retain enough space along that edge
     * so that the module doesn't go off the corner radius.
     */
    public get minimumRadiusBoundary(): HasEdges {
        const min = {
            top: -Infinity,
            bottom: Infinity,
            left: Infinity,
            right: -Infinity
        };
        const radius = this.designRev.board.getCornerRadius();
        for (const pm of this.designRev.getPlacedModules()) {
            if (!pm.canMoveHorizontally()) {
                const bottom = pm.yMin - radius;
                if (bottom < min.bottom) {
                    min.bottom = bottom;
                }
                const top = pm.yMax + radius;
                if (top > min.top) {
                    min.top = top;
                }
            }
            if (!pm.canMoveVertically()) {
                const left = pm.xMin - radius;
                if (left < min.left) {
                    min.left = left;
                }
                const right = pm.xMax + radius;
                if (right > min.right) {
                    min.right = right;
                }
            }
        }
        return min;
    }
}
