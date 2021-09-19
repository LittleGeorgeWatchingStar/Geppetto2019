import {ServerID} from "../model/types";
import {Vector2D} from "../utils/geometry";

/**
 * How the server exports a connection in a design revision.
 */
export interface ConnectionResource {
    id?: ServerID;
    provider_uuid: string; // placed module UUID
    provide_bus: ServerID;
    provide_bus_name: string;
    requirer_uuid: string; // placed module UUID
    require_bus: ServerID;
    require_bus_name: string;
    path: ConnectionPathResource | null;
}

/**
 * How the server exports a NC in a design revision.
 */
export interface ExplicitRequireNoConnectionResource {
    id?: ServerID;
    requirer_uuid: string; // placed module UUID
    require_bus: ServerID;
    require_bus_name: string;
}

export interface ConnectionPathResource {
    nodes: Vector2D[];
}