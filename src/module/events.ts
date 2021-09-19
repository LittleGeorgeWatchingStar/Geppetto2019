import {Vector2D} from "../utils/geometry";
import {Module} from "./Module";
import {DesignRevision} from "../design/DesignRevision";
import {Library} from "./Library";
import {RequireBus} from "../bus/RequireBus";
import {ServerID} from "../model/types";

/**
 * When the user clicks on a module in the library panel.
 */
export const MODULE_TILE_CLICK = 'Module.click';

/**
 * When the user clicks on a pseudo module, eg. logo, in the library panel.
 */
export const PSEUDO_MODULE_TILE_CLICK = 'pseudoModule.click';

/**
 * When the user double clicks on a library module.
 */
export const MODULE_DOUBLE_CLICK = 'Module.doubleClick';

/**
 * When the user selects "Add to board" in the module tile context menu,
 * OR "Add" in the module info box.
 */
export const MODULE_AUTO_ADD = 'Module.autoAdd';

/**
 * Ditto for MODULE_AUTO_ADD, except with the Logo tile.
 */
export const LOGO_AUTO_ADD = 'Logo.autoAdd';

/**
 * When the user selects "Info" in the module context menu.
 */
export const MODULE_INFO = 'Module.info';

/**
 * When the user selects "Info" in the placed module context menu.
 */
export const PLACED_MODULE_INFO = 'PlacedModule.info';

/**
 * When the user begins dragging a module from the library panel.
 */
export const MODULE_TILE_DRAG_START = 'Module.drag';

/**
 * When a module is dropped onto the board or when a module has been double clicked from the library.
 */
export const MODULE_PUT = 'Module.created';

/**
 * When the module library is updated
 */
export const LIBRARY_UPDATED = 'library_updated';

/**
 * When a module's buses are initialized
 */
export const MODULE_INIT_BUSES = 'Module.initBuses';

/**
 * When a placed module has been removed from the board, eg. via undo or pressing "Delete."
 * Some aspects of the app, eg. price, update after the module is gone.
 */
export const REMOVE_MODULE_FINISH = 'finishRemove';

/**
 * When the customer saves a new custom module.
 */
export const CUSTOMER_MODULE_SAVED = 'CustomerModule.saved';

/**
 * When the creates a SKU-less module (forks a module).
 */
export const SKULESS_MODULE_SAVED = 'SkulessModule.saved';

/**
 * When querying providers for a require bus.
 */
export const PROVIDERS_LOADING = 'providersLoading';

/**
 * When finished querying providers for a require bus.
 */
export const PROVIDERS_LOADED = 'providersLoaded';

export const OPEN_MODULE_SCHEMATIC = 'Module.schematic.open';

/**
 * When delete a customized module
 */
export const CUSTOMIZED_MODULE_DELETE = 'customizedModuleDelete';

export interface ModuleEvent extends ModelEvent<Module> {
}

export interface ModuleRequestEvent {
    id: ServerID;
}

export interface LibraryEvent {
    library: Library;
}

export interface LoadProvidesEvent extends LibraryEvent {
    requireBus: RequireBus;
}

export interface ModulePlacementEvent extends ModuleEvent {
    designRevision: DesignRevision;

    /**
     * The position of the module on screen, in units.
     */
    position?: Vector2D;
}
