import {ServerID} from "../model/types";

/**
 * TODO many category comparisons use .toLowerCase(), hence why most of these are uncapitalized.
 */
export const AUDIO = 'audio';

export const COM = 'com connectors';

export const HEADER = 'headers';

export const PROCESSOR = 'processors';

export const BUILDER = 'builders';

export const POWER = 'power';

export const LIGHTS_SWITCHES = 'lights and switches';

export const MECHANICAL = 'mechanical';

export const NETWORK = 'network and wireless';

export const SENSORS = 'sensors';

export const MEMORY = 'memory';

export const USB = 'usb';

/**
 * TODO this is capitalized because it displays a category header for the pseudo-module "Add Logo."
 * This is not a category that exists on a module from the server.
 */
export const LOGOS_AND_PRINTS = 'Logos and Prints';

/**
 * A module category.
 *
 * Modules are grouped by category in the library panel.
 */
export interface Category {
    id: ServerID;
    name: string;
}
