import {Board} from "../model/Board";
import {DesignRevision} from "../design/DesignRevision";
import {Anchor} from "./Anchor/Anchor";

/**
 * When a dimension is locked or unlocked.
 */
export const TOGGLE_DIMENSION_LOCK = 'Dimension.locked';

/**
 * When another dimension has been altered, eg. locked or removed.
 */
export const DIMENSIONS_CHANGED = 'dimensionsChanged';

/**
 * When a dimension measurement is changed.
 */
export const SET_DIMENSION = 'setDimension';

/**
 * When a dimension is deleted.
 */
export const REMOVE_DIMENSION = 'removeDimension';

/**
 * When a dimension has been added.
 */
export const FINISH_DIMENSION = 'finishDimension';

export const CANCEL_DIMENSION = 'cancelDimension';

interface DimensionEvent extends ModelEvent<Board> {
    designRevision: DesignRevision,
}

export interface AddDimensionEvent extends DimensionEvent {
    anchor1: Anchor,
    anchor2: Anchor;
}

export interface MoveDimensionEvent extends DimensionEvent {
    dimensionUUID: string,
    length: number;
}
