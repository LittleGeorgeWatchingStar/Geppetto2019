import {generateUuid} from "../../utils/generateUuid";
import {BusTemplate} from "./BusTemplate";
import {Signal} from "./Signal";

export enum CustomerBusType {
    REQUIRE = 'require',
    PROVIDE = 'provide',
}

/**
 * A bus in a customer module.
 * This acts as a wrapper for a BusTemplate where different CustomerBuses with the same BusTemplate are unique.
 */
export class CustomerBus {
    readonly uuid: string;
    name: string;
    milliwatts: number;

    /**
     * While this can be either require or provide, currently, provides can only be power buses.
     * This is as opposed to requires, which can be either data or power buses.
     */
    type: CustomerBusType;

    /**
     * The original template this bus is based on.
     */
    readonly template: BusTemplate;

    constructor(name: string, template: BusTemplate, type: CustomerBusType) {
        this.uuid = generateUuid();
        this.name = name;
        this.template = template;
        this.milliwatts = null;
        this.type = type;
    }

    getSignals(): Signal[] {
        return this.template.getSignals().slice();
    }

    setMilliwatts(amount: number): void {
        this.milliwatts = amount;
    }

    get isPower(): boolean {
        return this.template.power;
    }
}
