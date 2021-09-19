import {BomChoiceResource, BomOptionResource} from "../../src/module/BomOption/api";
import {ServerID} from "../../src/model/types";


export class BomOptionResourceBuilder {

    private readonly fields: BomOptionResource;

    constructor() {
        this.fields = {
            id: 1,
            description: "Colour",
            default_choice_label: "RED",
            has_different_model: "What is this",
            choices: [new BomChoiceResourceBuilder().build()],
        }
    }

    withId(id: ServerID): this {
        this.fields.id = id;
        return this;
    }

    withChoices(choices: BomChoiceResource[]): this {
        this.fields.choices = choices;
        return this;
    }

    build(): BomOptionResource {
        /**
         * @see BomChoiceResource.option
         */
        this.fields.choices.forEach(c => c.option = this.fields.id);
        return Object.assign({}, this.fields);
    }
}


export class BomChoiceResourceBuilder {

    private readonly fields: BomChoiceResource;

    constructor() {
        this.fields = {
            id: 1,
            option: 1, // The ID of the BomOptionResource to which it belongs.
            description: "BLUE",
            model_file: "File",
            change_in_price: "0.00",
            changes: [],
            ortho_image_url: '',
        };
    }

    withId(id: ServerID): this {
        this.fields.id = id;
        return this;
    }

    withDescription(description: string): this {
        this.fields.description = description;
        return this;
    }

    build(): BomChoiceResource {
        return Object.assign({}, this.fields);
    }
}
