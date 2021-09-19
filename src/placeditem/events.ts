import {Vector2D} from "../utils/geometry";
import {PlacedItem} from "./PlacedItem";

export const BLOCK_MOVE = "block.move";

export interface MoveEvent {
    model: PlacedItem;
    translation: Vector2D;
}