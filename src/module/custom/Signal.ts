import {ServerID} from "../../model/types";
import {BusTemplate} from "./BusTemplate";
import {SignalResource} from "./api";

/**
 * Used in custom modules, this can be assigned to a Net, determining the functionality of that Net.
 * @see AssignableNet
 */
export class Signal {
    public readonly template: BusTemplate;
    public readonly id: ServerID;
    public readonly name: string;
    public readonly mandatory: boolean;

    constructor(template: BusTemplate, data: SignalResource) {
        this.template = template;
        this.id = data.id;
        this.name = data.name;
        this.mandatory = data.mandatory;
    }

    getId(): ServerID {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    get isPower(): boolean {
        return this.template.isPower();
    }
}
