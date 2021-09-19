import {DimensionResource, DimensionServerResource} from "./api";
import {createDimension, Dimension, DimensionAttributes} from "./Dimension";
import {Dimensionable} from "./Dimensionable";
import {Anchor} from "./Anchor/Anchor";
import {createDimensionLoader} from "./DimensionLoader";
import {
    DesignRevision,
    EVENT_ADD_DIMENSION,
    EVENT_REMOVE_DIMENSION
} from "../design/DesignRevision";
import {DimensionCollectionEventsController} from "./DimensionCollectionEventsController";

export class DimensionCollection {
    private _designRevision: DesignRevision;
    private _dimensions: Dimension[] = [];

    constructor(designRevision: DesignRevision) {
        this._designRevision = designRevision;
    }

    public set designRevision(designRevision: DesignRevision) {
        this._designRevision = designRevision;
        DimensionCollectionEventsController.getInstance().publish();
    }

    public get dimensions(): Dimension[] {
        return this._dimensions.slice();
    }

    public clear(): void {
        this._dimensions = [];
        DimensionCollectionEventsController.getInstance().publish();
    }

    public add(dimension: Dimension): void {
        this._dimensions.push(dimension);

        dimension.anchor1.dimensionable.addDimension(dimension);
        dimension.anchor2.dimensionable.addDimension(dimension);

        this.updateLinkedAnchors();
        dimension.on(Dimension.CHANGE_LOCKED, () => this.updateLinkedAnchors());

        DimensionCollectionEventsController.getInstance().publish();
        this._designRevision.trigger(EVENT_ADD_DIMENSION, dimension);
    }

    public initializeFromResources(dimension_resources: DimensionResource[] | DimensionServerResource[],
                                   dimensionables: Dimensionable[]): void {
        for (const dimension_resource of dimension_resources) {
            const loader = createDimensionLoader(dimension_resource, dimensionables);
            const dimension = loader.getDimension();
            if (dimension) {
                this.add(dimension)
            }
        }
    }

    public addDimensionFromAttributes(attributes: DimensionAttributes): Dimension | undefined {
        if (this.getDimensionByAnchors(attributes.anchor1, attributes.anchor2)) {
            return;
        }
        const dimension = createDimension(attributes);
        this.add(dimension);
        return dimension;
    }

    public remove(dimension: Dimension): void {
        this._dimensions = this._dimensions.filter((item: Dimension) =>
            item !== dimension);

        dimension.anchor1.dimensionable.removeDimension(dimension);
        dimension.anchor2.dimensionable.removeDimension(dimension);

        dimension.remove();

        this.updateLinkedAnchors();

        DimensionCollectionEventsController.getInstance().publish();
        this._designRevision.trigger(EVENT_REMOVE_DIMENSION, dimension);
    }

    public removeDimensionByAnchors(anchor1: Anchor,
                                    anchor2: Anchor): void {
        const dimension = this.getDimensionByAnchors(anchor1, anchor2);
        if (dimension) {
            this.remove(dimension);
        }
    }

    public getDimensionByUuid(uuid: string): Dimension | undefined {
        return this._dimensions.find((dimension: Dimension) =>
            dimension.uuid === uuid);
    }

    public getDimensionByAnchors(anchor1: Anchor, anchor2: Anchor): Dimension | undefined {
        return this._dimensions.find((dimension: Dimension) =>
            dimension.hasAnchor(anchor1) && dimension.hasAnchor(anchor2));
    }

    /**
     * Returns those dimensions which constrain `dimensionable`.
     */
    public getDimensionsFor(dimensionable: Dimensionable): Dimension[] {
        return this._dimensions.filter((dimension: Dimension) => {
            return dimension.hasParent(dimensionable);
        });
    }

    private updateLinkedAnchors(): void {
        this._designRevision.resetLinkedAnchors();
        this._dimensions.forEach((dimension: Dimension) =>
            dimension.calculateLinkedAnchors());
    }

    public toJSON() {
        return this._dimensions
            .filter((dimension: Dimension) => !dimension.isEdgeConstraint())
            .map((dimension: Dimension) => dimension.toJSON());
    }
}

export function createDimensionCollection(designRevision: DesignRevision): DimensionCollection {
    return new DimensionCollection(designRevision);
}
