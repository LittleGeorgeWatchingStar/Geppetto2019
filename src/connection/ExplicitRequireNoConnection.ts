import GeppettoModel from "../model/GeppettoModel";
import {RequireBus} from "../bus/RequireBus";
import {ExplicitRequireNoConnectionResource} from "./api";
import {PlacedModule} from "../placedmodule/PlacedModule";

export class ExplicitRequireNoConnection extends GeppettoModel {
    private require: RequireBus;


    initialize(attributes) {
        this.require = attributes.require;
    }

    public get requireBus(): RequireBus {
        return this.require;
    }

    public toJSON() {
        return {
            requirer: this.require.getPlacedModuleUuid(),
            require_bus: this.require.getId()
        };
    }

    public toResource(): ExplicitRequireNoConnectionResource {
        return {
            id: this.id,
            requirer_uuid: this.require.getPlacedModuleUuid(),
            require_bus: this.require.getId(),
            require_bus_name: this.require.name
        };
    }

    public get requirer(): PlacedModule {
        return this.require.getPlacedModule();
    }
}