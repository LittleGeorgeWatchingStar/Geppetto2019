import {Anchor} from "./Anchor";
import {AnchorResource} from "./api";
import {EdgePosition} from "../Dimensionable";
import {Board} from "../../model/Board";
import {Point} from "../../utils/geometry";

const type: string = 'board';

export class BoardAnchor extends Anchor {
    protected _dimensionable: Board;
    private _edge: EdgePosition;

    constructor(board: Board, edge: EdgePosition) {
        super();
        this._dimensionable = board;
        this._edge = edge;
        this.initAnchorPoints();
    }

    get edge(): EdgePosition {
        return this._edge;
    }

    private initAnchorPoints() {
        const x1 = 0;
        const y1 = 0;
        const x2 = this._dimensionable.width;
        const y2 = this._dimensionable.height;
        switch(this._edge) {
            case 'top':
                this.setPoints(new Point(x1, y2), new Point(x2, y2));
                break;
            case 'right':
                this.setPoints(new Point(x2, y1), new Point(x2, y2));
                break;
            case 'bottom':
                this.setPoints(new Point(x1, y1), new Point(x2, y1));
                break;
            case 'left':
                this.setPoints(new Point(x1, y1), new Point(x1, y2));
                break;
        }
    }

    public toJSON() {
        return {
            type: type,
            edge: this._edge
        };
    }

    public toResource(): AnchorResource {
        return {
            type: type,
            edge: this._edge
        };
    }
}

export function createBoardAnchor(board: Board, edge: EdgePosition): BoardAnchor {
    return new BoardAnchor(board, edge);
}