import GeppettoModel from "model/GeppettoModel";
import {Signal} from "./Signal";
import {ServerID} from "../../model/types";
import {BusTemplate as BusTemplateInterface} from 'bus/BusTemplate';
import {BusTemplateResource} from "./api";

/**
 * A user-assignable bus template that can be used to create a custom module.
 *
 * The bus template describes the signals associated with a bus
 * (ex: I2C, SPI, UART, etc)
 */
export class BusTemplate extends GeppettoModel implements BusTemplateInterface {
    public name: string;
    public publicName: string;
    public signals: Signal[];
    public power: boolean;

    initialize(resource: BusTemplateResource) {
        this.id = resource.id;
        this.name = resource.name;
        this.publicName = resource.public_name;
        this.signals = resource.signals.map(s => new Signal(this, s));
        this.power = resource.power;
    }

    getId(): ServerID {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    isPower(): boolean {
        return this.power;
    }

    getSignals(): Signal[] {
        return this.signals.slice(); // defensive copy
    }
}
