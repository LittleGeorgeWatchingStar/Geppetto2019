import {FeatureResource} from "../../src/module/feature/api";
import {ServerID} from "../../src/model/types";
import {BusRecommendationResource, MarketingFeature, ModuleResource} from "../../src/module/api";
import {Module} from "../../src/module/Module";
import {ModuleResourceBuilder} from "./ModuleResourceBuilder";
import {Category} from "../../src/module/Category";
import {TestModule} from "./TestModule";
import {BomOptionResource} from "../../src/module/BomOption/api";

export class ModuleBuilder {

    private fields: ModuleResource;

    constructor() {
        this.fields = new ModuleResourceBuilder().build();
    }

    public withModuleId(id: ServerID): this {
        this.fields.module_id = id;
        return this;
    }

    public withCategory(category: Category): this {
        this.fields.category = category;
        return this;
    }

    public withFunctionalGroup(groupId: ServerID): this {
        this.fields.functional_group = groupId;
        return this;
    }

    public withFunctionalGroupName(name: string): this {
        this.fields.functional_group_name = name;
        return this;
    }

    /**
     * Representing the module, eg. in the filter bar, uses the Revision ID
     * for the data-module-id attr.
     */
    public withRevisionId(id: ServerID): this {
        this.fields.revision_id = id;
        return this;
    }

    public withName(name: string): this {
        this.fields.name = name;
        return this;
    }

    public withFeatures(lineResource: FeatureResource[]): this {
        this.fields.features = lineResource;
        return this;
    }

    public withMarketing(marketing: MarketingFeature[]): this {
        this.fields.marketing = marketing;
        return this;
    }

    public withPrice(price: number): this {
        this.fields.price = price;
        return this;
    }

    public withBomOptions(bomOptionResources: BomOptionResource[]): this {
        this.fields.bom_options = bomOptionResources;
        return this;
    }

    public withLaunchDate(date: string): this {
        this.fields.launch = date;
        return this;
    }

    withBusRecommendations(recommendations: BusRecommendationResource[]): this {
        this.fields.recommended_buses = recommendations;
        return this;
    }

    public build(): Module {
        return new TestModule(this.fields);
    }
}
