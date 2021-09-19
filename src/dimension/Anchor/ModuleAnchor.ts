import {Anchor} from "./Anchor";
import {AnchorResource} from "./api";
import {Feature} from "../../module/feature/Feature";
import {PlacedModule} from "../../placedmodule/PlacedModule";

const type: string = 'module';

export class ModuleAnchor extends Anchor {
    protected _dimensionable: PlacedModule;
    private _feature: Feature;

    constructor(placedModule: PlacedModule, feature: Feature) {
        super();
        this._dimensionable = placedModule;
        this._feature = feature;
        this.setPoints(this._feature.points[0], this._feature.points[1]);
    }

    public isEdgeConstraint(): boolean {
        return this._feature.isEdge()
    }

    public get feature(): Feature {
        return this._feature;
    }

    /**
     * Links the anchors within the dimensionable that in are the same direction
     * (Anchors are set to link because a place module is not resizable)
     */
    public linkDimensionableAnchors() {
        this._dimensionable.anchors.filter((anchor: Anchor) => {
            return anchor.direction === this.direction;
        }).forEach((anchor: Anchor) => {
            this.linkedAnchors.add(anchor);
        });
    }

    public toJSON() {
        return {
            type: type,
            module_uuid: this._dimensionable.uuid,
            feature: this._feature.getId()
        };
    }

    public toResource(): AnchorResource {
        return {
            type: type,
            module_uuid: this._dimensionable.uuid,
            feature: this._feature
        };
    }
}

export function createModuleAnchor(placedModule: PlacedModule, feature: Feature): ModuleAnchor {
    return new ModuleAnchor(placedModule, feature);
}