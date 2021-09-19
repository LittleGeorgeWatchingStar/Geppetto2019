import GeppettoModel from "../../model/GeppettoModel";
import {AnchorResource} from "./api";
import {Dimensionable} from "../Dimensionable";
import {Line, Point} from "../../utils/geometry";
import {Dimension} from "../Dimension";
import {createLinkedAnchors, LinkedAnchors} from "./LinkedAnchors";
import {Board} from "../../model/Board";
import {TranslationRecord} from "../../placeditem/Movable";
import {DimensionDirection} from "../DimensionController";
import {generateUuid} from "../../utils/generateUuid";
import {EventsController} from "../../Events/EventsController";
import {AnchorEventsController} from "./AnchorEventsController";


/**
 * TODO: Remove extends GeppettoModel (Backbone views require model to extend Backbone model).
 */
export abstract class Anchor extends GeppettoModel {
    /**
     * @deprecated Use change$
     */
    public static EVENT_POINTS_CHANGED = 'anchor.points:changed';

    /**
     * Front end identifier
     */
    private readonly _uuid: string;

    protected _dimensionable: Dimensionable;

    private _point1: Point;
    private _point2: Point;

    private _linkedAnchors: LinkedAnchors;

    constructor() {
        super();
        this._uuid = generateUuid();
    }

    public get uuid(): string {
        return this._uuid;
    }

    public get board(): Board {
        return this.dimensionable.board;
    }

    public get dimensionable(): Dimensionable {
        return this._dimensionable;
    }

    public belongsTo(dimensionable: Dimensionable): boolean {
        return dimensionable === this.dimensionable;
    }

    public equals(other: Anchor): boolean {
        return (this._dimensionable.uuid === other._dimensionable.uuid &&
            this.line.equals(other.line));
    }

    public rotate(): void {
        const line = this.line;
        this.line = line.rotate();
    }

    /**
     * Anchor is required to sit on the edge of the board
     */
    public isEdgeConstraint(): boolean {
        return false;
    }


    /**
     * LINKED ANCHORS
     */
    public get linkedAnchors(): LinkedAnchors {
        return this._linkedAnchors;
    }

    public set linkedAnchors(linkedAnchors: LinkedAnchors) {
        this._linkedAnchors = linkedAnchors;
    }

    public calculateLinkedAnchors(dimension: Dimension): void {
        this.calculateLinkedAnchorsForDimensions(dimension);
    }

    protected calculateLinkedAnchorsForDimensions(dimension: Dimension) {
        if (dimension.isLocked()) {
            const other = dimension.getOtherAnchor(this);
            this.linkedAnchors.add(other);
        }
    }

    // Only use this on DesignRevision to reset all linked anchors at the same time
    public resetLinkedAnchors(): void {
        this._linkedAnchors = createLinkedAnchors(this);
    }

    public isLinkedTo(anchor: Anchor): boolean {
        return this._linkedAnchors.isLinkedTo(anchor);
    }

    public isLinkedToBoard(): boolean {
        const boardTop = this.board.getAnchorByEdge('top');
        const boardRight = this.board.getAnchorByEdge('right');
        const boardBottom = this.board.getAnchorByEdge('bottom');
        const boardLeft = this.board.getAnchorByEdge('left');

        return this._linkedAnchors.isLinkedTo(boardTop) ||
               this._linkedAnchors.isLinkedTo(boardRight) ||
               this._linkedAnchors.isLinkedTo(boardBottom) ||
               this._linkedAnchors.isLinkedTo(boardLeft);
    }


    /**
     * MOVE FUNCTIONS
     */
    public canMove(): boolean {
        return this.canMoveVertically() || this.canMoveHorizontally();
    }

    public canMoveVertically(): boolean {
        if (this.isHorizontal()) {
            const boardTop = this.board.getAnchorByEdge('top');
            const boardBottom = this.board.getAnchorByEdge('bottom');

            // Cannot move if linked anchors includes opposite board anchors
            return !(this._linkedAnchors.isLinkedTo(boardTop) &&
                this._linkedAnchors.isLinkedTo(boardBottom));
        }
        return false;
    }

    public canMoveHorizontally(): boolean {
        if (this.isVertical()) {
            const boardLeft = this.board.getAnchorByEdge('left');
            const boardRight = this.board.getAnchorByEdge('right');

            // Cannot move if linked anchors includes opposite board anchors
            return !(this._linkedAnchors.isLinkedTo(boardLeft) &&
                this._linkedAnchors.isLinkedTo(boardRight));

        }
        return false;
    }

    /**
     * Returns dx but within this anchor's movement constraints
     * (eg. dimensionable resizing limitations)
     */
    public getConstrainedDx(dx: number): number {
        return this._dimensionable.getAnchorConstrainedDx(this, dx);
    }

    /**
     * Returns dy but within this anchor's movement constraints
     * (eg. dimensionable resizing limitations)
     */
    public getConstrainedDy(dy: number): number {
        return this._dimensionable.getAnchorConstrainedDy(this, dy);
    }

    /**
     * Returns dx but within the anchor movement constraints of all linked anchors
     */
    private getLinkedConstrainedDx(dx: number): number {
        if (!this.isVertical()) {
            return 0;
        }
        return this._linkedAnchors.getLinkedConstrainedDx(dx);
    }

    /**
     * Returns dy but within the anchor movement constraints of all linked anchors
     */
    private getLinkedConstrainedDy(dy: number): number {
        if (!this.isHorizontal()) {
            return 0;
        }
        return this._linkedAnchors.getLinkedConstrainedDy(dy);
    }

    /**
     * Translates all anchors linked to this anchor (including itself)
     */
    public translateLinked(dx: number,
                           dy: number,
                           translated?: TranslationRecord): void {
        translated = translated || new TranslationRecord();

        dx = this.getLinkedConstrainedDx(dx);

        dy = this.getLinkedConstrainedDy(dy);

        this._linkedAnchors.forEach((anchor: Anchor) => {
            anchor.translate(dx, dy, translated);
        });
    }

    /**
     * Translates only this anchor
     */
    public translate(dx: number,
                     dy: number,
                     translated: TranslationRecord) {
        if (this.isVertical()) {
            dy = 0;
        }
        if (this.isHorizontal()) {
            dx = 0;
        }
        this.dimensionable.moveAnchor(this, dx, dy, translated);
    }


    /**
     * POSITIONING
     */
    public get point1(): Point {
        return this._point1;
    }

    public get point2(): Point {
        return this._point2;
    }

    public setPoints(point1: Point, point2: Point) {
        this._point1 = point1;
        this._point2 = point2;
        EventsController.getInstance().publishModelEvent(this, Anchor.EVENT_POINTS_CHANGED);
        AnchorEventsController.getInstance().publish(this);
    }

    private get line(): Line {
        return new Line(this._point1, this._point2);
    }

    private set line(line: Line) {
        this.setPoints(line.start, line.end);
    }

    public get x(): number {
        console.assert(this._point1.x === this._point2.x);
        return this._point1.x;
    }

    public get y(): number {
        console.assert(this._point1.y === this._point2.y);
        return this._point1.y;
    }

    public get boardX(): number {
        return this._dimensionable.boardPosition.x + this.x;
    }

    public get boardY(): number {
        return this._dimensionable.boardPosition.y + this.y;
    }

    private get minX(): number {
        return Math.min(this._point1.x, this._point2.x);
    }

    private get minY(): number {
        return Math.min(this._point1.y, this._point2.y);
    }

    public get minBoardX(): number {
        return this._dimensionable.boardPosition.x + this.minX;
    }

    public get minBoardY(): number {
        return this._dimensionable.boardPosition.y + this.minY;
    }


    /**
     * ORIENTATION
     */
    public isVertical(): boolean {
        return this.line.isVertical();
    }

    public isHorizontal(): boolean {
        return this.line.isHorizontal();
    }

    public get direction(): DimensionDirection | undefined {
        if (this.isVertical()) {
            return DimensionDirection.VERTICAL;
        } else if (this.isHorizontal()) {
            return DimensionDirection.HORIZONTAL;
        }
    }


    /**
     * SERVER
     */
    public toString(): string {
        const direction = this.direction;
        const dimensionable = this._dimensionable;
        const ptA = this._point1;
        const ptB = this._point2;
        return `${direction} line of ${dimensionable} from ${ptA} to ${ptB}`;
    }

    public abstract toJSON();

    public abstract toResource(): AnchorResource;
}