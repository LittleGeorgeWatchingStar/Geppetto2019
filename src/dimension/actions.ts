import {ReversibleAction} from "../core/action";
import {Dimension} from "./Dimension";
import {DesignRevision} from "../design/DesignRevision";
import {Anchor} from "./Anchor/Anchor";
import {AddDimensionEvent, DIMENSIONS_CHANGED} from "./events";
import events from "../utils/events";
import {DimensionResource} from "./api";


export class CreateDimension implements ReversibleAction {
    private dimensionResource: DimensionResource;
    private uuid: string;

    constructor(private readonly designRevision: DesignRevision,
                private readonly anchor1: Anchor,
                private readonly anchor2: Anchor){
    }

    static fromEvent(event: AddDimensionEvent): CreateDimension {
        return new CreateDimension(event.designRevision, event.anchor1, event.anchor2);
    }

    public get dimension(): Dimension {
        return this.designRevision.getDimensionByUuid(this.uuid);
    }

    public get log(): string {
        return 'Create dimension';
    }

    execute() {
        if (this.dimensionResource) {
            this.designRevision.addDimensionsFromResources([this.dimensionResource]);
        } else {
            const dimension = this.designRevision.addDimensionFromAttributes({
                anchor1: this.anchor1,
                anchor2: this.anchor2,
            });
            this.dimensionResource = dimension.toResource();
            this.uuid = dimension.uuid;
        }
        events.publish(DIMENSIONS_CHANGED);
    }

    reverse() {
        this.designRevision.removeDimension(this.dimension);
        events.publish(DIMENSIONS_CHANGED);
    }
}

export class RemoveDimension implements ReversibleAction {
    private readonly dimensionResource: DimensionResource;
    private readonly uuid: string;

    constructor (private readonly designRevision: DesignRevision,
                 private readonly dimension: Dimension) {
        this.dimensionResource = dimension.toResource();
        this.uuid = dimension.uuid;
    }

    static fromEvent(designRevision: DesignRevision, dimension: Dimension): RemoveDimension {
        return new RemoveDimension(designRevision, dimension);
    }

    public get log(): string {
        return 'Delete dimension';
    }

    execute() {
        this.designRevision.removeDimension(this.designRevision.getDimensionByUuid(this.uuid));
        events.publish(DIMENSIONS_CHANGED);
    }

    reverse() {
        this.designRevision.addDimensionsFromResources([this.dimensionResource]);
        events.publish(DIMENSIONS_CHANGED);
    }
}

export class LockDimension implements ReversibleAction {
    private readonly uuid: string;
    private isLocked: boolean;

    constructor(private readonly designRevision: DesignRevision,
                private readonly dimension: Dimension) {
        this.uuid = dimension.uuid;
    }

    static fromEvent(designRevision: DesignRevision,
                     dimension: Dimension): LockDimension {
        return new LockDimension(designRevision, dimension);
    }

    public get log(): string {
        return `${this.isLocked ? 'Lock' : 'Unlock'} dimension`;
    }

    // Below uses uuid to locate the dimension is because it might get deleted and
    // re-created with a new object. Therefore uuid is needed to keep track of the
    // dimension.
    execute() {
        const dimension = this.designRevision.getDimensionByUuid(this.uuid);
        dimension.toggleLocked();
        this.isLocked = dimension.isLocked();
        events.publish(DIMENSIONS_CHANGED);
    }

    reverse() {
        this.designRevision.getDimensionByUuid(this.uuid).toggleLocked();
        events.publish(DIMENSIONS_CHANGED);
    }
}


export class MoveByDimension implements ReversibleAction {
    private readonly previousLength: number;
    private readonly length: number;

    constructor(private readonly designRevision: DesignRevision,
                private readonly dimensionUUID: string,
                inputLength: number) {
        const dim = this.designRevision.getDimensionByUuid(this.dimensionUUID);
        this.previousLength = dim.length;

        // inputLength will be in the same direction as the absolute previousLength.
        this.length = this.previousLength < 0 ? -inputLength : inputLength;

        // Make sure anchor moves to the right if previousLength is 0.
        if (this.previousLength === 0 && dim.anchorToMove() === dim.anchor1) {
            this.length = -this.length;
        }
    }

    static fromEvent(event): MoveByDimension {
        return new MoveByDimension(
            event.designRevision,
            event.dimensionUUID,
            event.length
        );
    }

    public get log(): string {
        return 'Change dimension';
    }

    execute() {
        this.designRevision.getDimensionByUuid(this.dimensionUUID).setLength(this.length);
        events.publish(DIMENSIONS_CHANGED);
        this.designRevision.updateMechanical();
    }

    reverse() {
        this.designRevision.getDimensionByUuid(this.dimensionUUID).setLength(this.previousLength);
        events.publish(DIMENSIONS_CHANGED);
        this.designRevision.updateMechanical();
    }
}
