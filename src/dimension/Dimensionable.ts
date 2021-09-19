import {TranslationRecord} from "../placeditem/Movable";
import {Dimension} from "./Dimension";
import {Point} from "../utils/geometry";
import {Anchor} from "./Anchor/Anchor";
import {Board} from "../model/Board";
import {Observable} from "rxjs";

export type EdgePosition = 'top' | 'right' | 'bottom' | 'left';

/**
 * An object (board, placed module, placed logo) whose features can be dimensioned.
 */
export interface Dimensionable {
    boardPosition: Point,

    uuid: string;

    board: Board;

    dimensions: Dimension[];

    addDimension(dimension: Dimension): void;

    removeDimension(dimension: Dimension): void;

    anchors: Anchor[];

    /**
     * Moves only the anchor itself on the dimensionable (which may result in
     * resizing or movement of the dimensionable).
     *
     * This function should not propagate movement to linked anchors
     */
    moveAnchor(anchor: Anchor,
               dx: number,
               dy: number,
               translated: TranslationRecord): void;

    /**
     * Returns dx but within the specified anchor's movement constraints
     * (eg. resizing limitations)
     */
    getAnchorConstrainedDx(anchor: Anchor, dx: number): number;

    /**
     * Returns dy but within the specified anchor's movement constraints
     * (eg. resizing limitations)
     */
    getAnchorConstrainedDy(anchor: Anchor, dy: number): number;

    getAnchorByEdge(edge: EdgePosition): Anchor;

    resetLinkedAnchors(): void;
}
