import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";
import {FeatureBuilder} from "../../module/feature/FeatureBuilder";
import {
    createModuleAnchor,
    ModuleAnchor
} from "../../../src/dimension/Anchor/ModuleAnchor";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";
import {Feature} from "../../../src/module/feature/Feature";

export class ModuleAnchorBuilder {

    Dimensionable: PlacedModule;
    feature: Feature;

    constructor() {
        this.Dimensionable = new PlacedModuleBuilder().build();
        this.feature = new FeatureBuilder().build();
    }

    public withDimensionable(dimensionable: PlacedModule): this {
        this.Dimensionable = dimensionable;
        return this;
    }

    public withFeature(feature: Feature): this {
        this.feature = feature;
        return this;
    }

    public build(): ModuleAnchor {
        return createModuleAnchor(this.Dimensionable, this.feature);
    }
}