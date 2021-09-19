import {BusTemplate} from "../../bus/BusTemplate";
import {ServerID} from "../../model/types";

export interface BusTemplateResource extends BusTemplate {
    name: string;
    public_name: string;
    signals: SignalResource[];
}

export interface SignalResource {
    id: ServerID;
    name: string;
    mandatory: boolean;
}

export interface AssignableNetGroupResource {
    bus_group: number; // TODO I think it's a number? Resolves to id. Some places say 'any'...
    bus_group_name: string;
    levels: any[]; // Both number[] and string[] are used in test fixtures.
    nets: AssignableNetResource[];
}

export interface AssignableNetResource {
    // Somewhat misleading. This is the pin name.
    value: string;
    max_milliwatts: number;
}
