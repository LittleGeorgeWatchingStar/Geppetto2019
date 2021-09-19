import {Point, Vector2D} from "../utils/geometry";
import {Model} from "backbone";
import {Anchor} from "../dimension/Anchor/Anchor";

export interface Movable extends Model {
    position: Point;
    translateVector(vector: Vector2D): void;
    canMoveHorizontally(): boolean;
    canMoveVertically(): boolean;
}

/**
 * Keeps track of what has been moved so we don't move things multiple times
 */
export class TranslationRecord {
    private _x: { [cid: string]: Movable|Anchor } = {};
    private _y: { [cid: string]: Movable|Anchor } = {};

    public previouslyTranslated(item: Movable|Anchor, dx: number, dy: number): boolean {
        if (dx !== 0 && this._x.hasOwnProperty(item.cid)) {
            return true;
        }
        if (dy !== 0 && this._y.hasOwnProperty(item.cid)) {
            return true;
        }
    }

    public registerTranslation(item: Movable|Anchor, dx: number, dy: number): void {
        if (dx !== 0) {
            this._x[item.cid] = item;
        }
        if (dy !== 0) {
            this._y[item.cid] = item;
        }
    }

}
