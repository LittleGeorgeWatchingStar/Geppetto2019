import {executeAction, ReversibleAction} from "../core/action";
import {Point, Vector2D} from "../utils/geometry";
import {DesignRevision} from "../design/DesignRevision";
import {PlacedLogo, ResizeEdgePosition} from "../placedlogo/PlacedLogo";
import {PlacedLogoEvent, ResizeEvent} from "../placedlogo/events";
import {PlacedLogoResource} from "../placedlogo/api";
import {DimensionResource} from "../dimension/api";
import {Dimension} from "../dimension/Dimension";

/**
 * Add an uploaded logo SVG to the board.
 */
export class AddNewLogo implements ReversibleAction {
    private readonly position: Point;
    private plResource: PlacedLogoResource;

    constructor(private readonly designRevision: DesignRevision,
                position: Vector2D,
                private readonly svgData: string) {
        this.position = Point.copy(position);
    }

    static addToStack(designRev: DesignRevision,
                      position: Vector2D,
                      svgData: string) {
        executeAction(new AddNewLogo(designRev, position, svgData));
    }

    private get placedLogo(): PlacedLogo {
        return this.designRevision.getPlacedLogoByUuid(this.plResource.uuid);
    }

    public get log(): string {
        return 'Add SVG image';
    }

    execute(): void {
        const position = this.position;
        if (this.plResource) {
            this.designRevision.addPlacedLogoFromResource(this.plResource);
        } else {
            this.plResource = this.designRevision.addLogo(this.svgData, position).toResource();
        }
        this.designRevision.updateMechanical();
    }

    reverse(): void {
        this.designRevision.removePlacedLogo(this.placedLogo);
    }
}


/**
 * When the user deletes a placed logo from the design.
 */
export class RemoveLogo implements ReversibleAction {
    private readonly designRevision: DesignRevision;
    private readonly plResource: PlacedLogoResource;
    private readonly dimensions: DimensionResource[];

    constructor(placedLogo: PlacedLogo) {
        this.plResource = placedLogo.toResource();
        this.designRevision = placedLogo.designRevision;
        this.dimensions = placedLogo.constraints
            .filter((dimension: Dimension) => {
                return !dimension.isEdgeConstraint();
            }).map((dimension: Dimension) => {
                return dimension.toResource();
            });
    }

    static fromEvent(event: PlacedLogoEvent): RemoveLogo {
        return new RemoveLogo(event.model);
    }

    public get log(): string {
        return `Remove SVG image`;
    }

    execute(): void {
        const pl = this.designRevision.getPlacedLogoByUuid(this.plResource.uuid);
        this.designRevision.removePlacedLogo(pl);
    }

    reverse(): void {
        this.designRevision.addPlacedLogoFromResource(this.plResource);
        this.restoreDimensions();
        this.designRevision.updateMechanical();
    }

    private restoreDimensions(): void {
        this.designRevision.addDimensionsFromResources(this.dimensions);
    }
}

/**
 * When the user resizes a placed logo.
 */
export class ResizeLogo implements ReversibleAction {
    private readonly designRevision: DesignRevision;
    private readonly plResource: PlacedLogoResource;

    private snapTrans: Vector2D;

    constructor(placedLogo: PlacedLogo,
                private readonly resizeEdge: ResizeEdgePosition,
                private readonly trans: Vector2D) {
        this.designRevision = placedLogo.designRevision;
        this.plResource = placedLogo.toResource();
    }

    static fromEvent(event: ResizeEvent): ResizeLogo {
        return new ResizeLogo(event.model,
            event.resizeEdge,
            event.translation);
    }

    public get log(): string {
        return `Resize SVG image`;
    }

    private get placedLogo(): PlacedLogo {
        return this.designRevision.getPlacedLogoByUuid(this.plResource.uuid);
    }

    execute(): void {
        this.placedLogo.resizeLinkedByResizeEdge(this.resizeEdge, this.trans.x, this.trans.y);
        this.snapTrans = this.placedLogo.resizeEdgeSnap(this.resizeEdge);
        this.placedLogo.designRevision.updateMechanical();
    }

    reverse(): void {
        const reverseTrans = {x: -this.trans.x - this.snapTrans.x,
                              y: -this.trans.y - this.snapTrans.y};
        this.placedLogo.resizeLinkedByResizeEdge(this.resizeEdge, reverseTrans.x, reverseTrans.y);
        this.placedLogo.designRevision.updateMechanical();
    }
}
