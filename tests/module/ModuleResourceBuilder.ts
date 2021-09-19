import {ModuleResource} from "../../src/module/api";
import {FootprintBuilder} from "./feature/FootprintBuilder";


/**
 * These are used to generate features that contain the module dimensions.
 * Not a part of the actual resource.
 */
interface ModuleResourceBuilderFields extends ModuleResource {
    height: number,
    width: number
}

export class ModuleResourceBuilder {

    private fields: ModuleResourceBuilderFields;

    constructor() {
        this.fields = {
            is_summary: false,
            height: 100,
            width: 100,
            module_id: 1,
            revision_id: 1,
            revision_no: 1,
            name: "PCB placeholder",
            summary: "Peanut Chocolate Bread placeholder",
            description: "PCB placeholder",
            category: {
                name: "Peanut Chocolate Bread",
                id: 5
            },
            functional_group: undefined,
            functional_group_name: undefined,
            features: [],
            marketing: [], // TODO
            price: 5,
            dev: false,
            stable: true,
            enabled: true,
            expired: false,
            pin_points: [],
            bom_options: [],
            launch: 'Jan 1, 2000',
            created: 'Jan 1, 2000',
            is_customer_module: false,
            recommended_buses: []
    };
        this.fields.features = new FootprintBuilder()
            .rectangle(this.fields.width, this.fields.height)
            .build();
    }

    withModuleId(id: number): this {
        this.fields.module_id = id;
        return this;
    }

    public build(): ModuleResource {
        return Object.assign({}, this.fields);
    }
}
