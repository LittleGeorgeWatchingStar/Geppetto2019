import {ServerID} from "../model/types";
import {BusGroup} from "./BusGroup";
import {ModuleResource} from "../module/api";
import {NetResource} from "../net/api/NetResource";
import {BusPriority} from "./BusPriority";

/**
 * What a bus looks like when exported by the server API.
 */
export interface BusResource {
    id: ServerID;
    name: string;
    power: boolean;
    num_connections: number;
    milliwatts: number;
    efficiency: number;
    address: string;
    levels: string[];

    /** Note: "Bus Group" is a legacy name. The current name is the more descriptive "Voltage Domain." */
    bus_group: BusGroupResource;
    templates: BusResourceTemplate[];
    exclusions: ServerID[];
    nets: NetResource[];
    priorities: BusPriority[];

    /* Added by Gweb */
    busgroup?: BusGroup;
}

interface BusResourceTemplate {
    id: ServerID;
    max_path_length: number | null;
    min_path_length: number | null;
    path_width: number | null;
    name: string;
    public_name: string;
    nets: NetTemplateResource[];
    power: boolean;
}

/**
 * A net or signal of a bus template
 */
interface NetTemplateResource {
    ball_mux: number | null;
    id: number;
    name: string;
    signal_id: number;
    signal_mandatory: boolean;
    signal_name: string;
    template_id: number;
    template_name: string;
    value: string;
}


/**
 * The voltage domain of a Bus. Each Bus is assigned to one voltage domain, which causes
 * all buses to operate at the same voltage level in a design.
 */
export interface BusGroupResource {
    id: ServerID;
    title: string;
    levels: string[];
}


/**
 * Data sent to the server when filtering providers for a require bus.
 * These are all "optional": if there are no requires to filter by, the server returns all available modules,
 * which is how it loads the default Panel.
 */
export interface RequireFilterResource {
    require?: ServerID;
    amount?: number; // Power
    needs_vlogic_provide?: boolean;
    determined_vlogic_level?: number; // I think? Not used on the front end, but the parametre exists server-side...
    power_only?: boolean; // Whether to get power or connector-only results.
}

/**
 * Used when querying providers in bulk.
 */
export interface ProviderQueryResource {
    requires: RequireFilterResource;
}

/**
 * The response from the server after bulk-querying providers.
 */
export interface ProviderResources {
    requireId: ModuleResource[];
}

/**
 * Data sent to the server when querying requirers for a provide bus.
 */
export interface RequirerQueryResource {
    available_vlogic: number[];
    provide_id: ServerID;
}
