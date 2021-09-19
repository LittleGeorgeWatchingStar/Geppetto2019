import GeppettoModel from 'model/GeppettoModel';
import {Dimensionable} from "./Dimensionable";
import {DimensionResource} from "./api";
import {Anchor} from "./Anchor/Anchor";
import {generateUuid} from "../utils/generateUuid";
import {DimensionEventsController} from "./DimensionEventsController";

export interface DimensionAttributes {
    uuid?: string;
    anchor1: Anchor;
    anchor2: Anchor;
    locked?: boolean;
    hidden?: boolean;
    isEdgeConstraint?: boolean;
}

/**
 * A Dimension is a constraint that fixes the distance between
 * two features (ie, lines) of two dimensionable objects.
 */
export class Dimension extends GeppettoModel {
    public static CHANGE_LOCKED = 'change:locked';
    public static REMOVE = 'remove';

    /**
     * Front end identifier
     */
    private _uuid: string;

    private _anchor1: Anchor;
    private _anchor2: Anchor;

    private _locked: boolean = false;
    private _hidden: boolean = true;
    /**
     * True if this dimension is an automatic constraint added because the
     * dimensionable's anchor is required to sit on the edge of the board.
     */
    private _isEdgeConstraint: boolean = false;

    constructor(attributes: DimensionAttributes) {
        super(attributes);
        this._uuid = attributes.uuid ? attributes.uuid : generateUuid();

        this._anchor1 = attributes.anchor1;
        this._anchor2 = attributes.anchor2;

        if (attributes) {
            if (attributes.locked != undefined) {
                this._locked = attributes.locked;
            }
            if (attributes.hidden != undefined) {
                this._hidden = attributes.hidden;
            }
            if (attributes.isEdgeConstraint != undefined) {
                this._isEdgeConstraint = attributes.isEdgeConstraint;
            }
        }
    }

    public get uuid(): string {
        return this._uuid;
    }

    public isVisible() {
        return !this._hidden;
    }

    public isLocked() {
        return this._locked || this.isEdgeConstraint();
    }

    /**
     * True if this dimension is an automatic constraint added because the
     * dimensionable's anchor is required to sit on the edge of the board.
     */
    public isEdgeConstraint(): boolean {
        return this._isEdgeConstraint;
    }

    /**
     * True if the user manually locked this dimension.
     *
     * This will return false for edge constraints, which are automatically
     * locked.
     */
    public isLockedByUser(): boolean {
        return this.isLocked() && !this.isEdgeConstraint();
    }

    public get length(): number {
        if (this.isAnchorHorizontal()) {
            return this._anchor2.boardY - this._anchor1.boardY;
        } else if (this.isAnchorVertical()) {
            return this._anchor2.boardX - this._anchor1.boardX;
        }
        throw new Error('Invalid direction');
    }

    public get absLength(): number {
        return Math.abs(this.length);
    }

    public toJSON() {
        return {
            anchor1: this._anchor1.toJSON(),
            anchor2: this._anchor2.toJSON(),
            hidden: !this.isVisible(),
            locked: this.isLocked()
        };
    }

    public toResource(): DimensionResource {
        return {
            uuid: this._uuid,
            anchor1: this._anchor1.toResource(),
            anchor2: this._anchor2.toResource(),
            hidden: !this.isVisible(),
            locked: this.isLocked()
        };
    }

    public hasParent(dimensionable: Dimensionable): boolean {
        return this._anchor1.belongsTo(dimensionable) ||
            this._anchor2.belongsTo(dimensionable);
    }

    public getOtherAnchor(anchor: Anchor): Anchor {
        switch (anchor) {
            case this._anchor1:
                return this._anchor2;
            case this._anchor2:
                return this._anchor1;
            default:
                throw new Error('This dimension is unrelated to anchor: ' + anchor.cid);
        }
    }

    public toggleLocked(): void {
        this._locked = !this._locked;
        // TODO: remove this after changing view to not listen to this.
        // NOTE: Dimension.CHANGE_LOCKED triggers updates to linked anchors,
        //  and dimension views subscribe to all dimension events on the
        //  DimensionEventsController to update dimension resizability to due linked
        //  anchors. So may need the updates to linked anchors to run before the
        //  DimensionEventsController event is published.
        this.trigger(Dimension.CHANGE_LOCKED);
        DimensionEventsController.getInstance().publish(this);
    }

    public hasAnchor(anchor: Anchor): boolean {
        return this._anchor1.equals(anchor) || this._anchor2.equals(anchor);
    }

    /**
     * True if the constrained anchors are horizontal.
     */
    public isAnchorHorizontal(): boolean {
        return this._anchor1.isHorizontal();
    }

    /**
     * True if the constrained anchors are vertical.
     */
    public isAnchorVertical(): boolean {
        return this._anchor1.isVertical();
    }

    public get anchor1(): Anchor {
        return this._anchor1;
    }

    public get anchor2(): Anchor {
        return this._anchor2;
    }

    public get minX(): number {
        return Math.min(this._anchor1.minBoardX, this._anchor2.minBoardX);
    }

    public get minY(): number {
        return Math.min(this._anchor1.minBoardY, this._anchor2.minBoardY);
    }

    public setLength(length: number): boolean {
        if (!this.canResize()) {
            return false;
        }
        const delta = length - this.length;

        const anchorToMove = this.anchorToMove();
        if (anchorToMove === this._anchor1) {
            this.moveAnchor(this._anchor1, -delta);
        } else {
            this.moveAnchor(this._anchor2, delta);
        }
        return true;
    }

    public anchorToMove(): Anchor {
        /**
         * 1) Preferably don't move the board
         * 2) Preferably move anchor 2
         */
        if (this._anchor2.isLinkedToBoard() && !this._anchor1.isLinkedToBoard()) {
            return this._anchor1;
        } else {
            return this._anchor2;
        }
    }

    private moveAnchor(anchor: Anchor, delta: number): void {
        const dx = this.isAnchorVertical() ? delta : 0;
        const dy = this.isAnchorHorizontal() ? delta : 0;
        anchor.translateLinked(dx, dy);
    }

    public canResize(): boolean {
        if (this.isLocked()) {
            return false;
        }

        return !this._anchor1.isLinkedTo(this._anchor2);
    }

    public isSelfDimension(): boolean {
        return this._anchor1.dimensionable === this._anchor2.dimensionable;
    }

    public calculateLinkedAnchors(): void {
        this._anchor1.calculateLinkedAnchors(this);
        this._anchor2.calculateLinkedAnchors(this);
    }

    public remove(): void {
        this.trigger(Dimension.REMOVE);
    }

    public toString(): string {
        const locked = this.isLocked() ? 'locked' : 'unlocked';
        const type = this.isEdgeConstraint() ? 'edge' : 'manual';
        const a0 = this._anchor1;
        const a1 = this._anchor2;
        return `${locked} ${type} dimension between '${a0}' and '${a1}'`;
    }

}

export function createDimension(attributes: DimensionAttributes): Dimension {
    return new Dimension(attributes);
}
