import {PlacedModule} from "../placedmodule/PlacedModule";
import {RequireBus} from "../bus/RequireBus";
import {ConnectionPath} from "./ConnectionPath";

/**
 * When the process of connecting/disconnecting a bus is complete.
 * This is not necessarily the require bus that the user clicked on.
 */
export const CONNECTION_COMPLETE = 'connectionComplete';

/**
 * When any obstructed paths need to be rendered.
 *
 * @see {RenderPathsEvent}.
 */
export const DRAW_PATHS = 'drawPaths';

export const ON_OPTIONS_SET = 'provideOptionsSet';

export interface RenderPathsEvent {
    paths: ConnectionPath[];
}

export interface AutoConnectEvent {
    module: PlacedModule;
}

export interface ConnectionCompleteEvent {
    require: RequireBus;
}

/**
 * When the board's bus provides that are compatible to the require-to-connect have been set.
 */
export interface ProvideOptionsSetEvent {
    placedModuleIds: string[];
    hasTooManyOptions: boolean;
    requireName: string;
}
