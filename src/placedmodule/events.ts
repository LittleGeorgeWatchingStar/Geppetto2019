import {PlacedModule} from "./PlacedModule";

/**
 * After a dropped module has been fully loaded from the server.
 */
export const PLACED_MODULE_LOADED = 'PlacedModule.loaded';

/**
 * When a placed module is removed. This triggers the removal action.
 */
export const PLACED_MODULE_REMOVE = 'PlacedModule.remove';

/**
 * Whenever a placed module is clicked.
 */
export const PLACED_MODULE_CLICK = 'PlacedModule.click';

/**
 * When a placed module is selected. Unlike click, this event is conditional.
 */
export const PLACED_MODULE_SELECT = 'PlacedModule.select';

export const PLACED_MODULE_DRAG = 'PlacedModule.drag';

export const CUSTOM_NAME_INPUT = 'PlacedModule.inputCustomName';

/**
 * When a placed item is rotated.
 */
export const BLOCK_ROTATE = 'PlacedModule.rotate';
export const BLOCK_ON_DRAG_ROTATE = 'onDrageRotate';

/**
 * When a user clicks the "substitute" context menu item in order
 * to replace a placed module with another.
 */
export const PM_SUBSTITUTE_START = 'placedmodule:substitute';

/**
 * When the user successfully substitutes a module with another.
 */
export const PM_SUBSTITUTE_FINISH = 'placedmodule:finishSubstitute';

/**
 * Whenever an action has been executed.
 */
export const ACTION_EXECUTED = 'Action.executed';

/**
 * Whenever an action is reversed.
 */
export const ACTION_REVERSED = 'Action.reversed';

export interface PlacedModuleEvent extends ModelEvent<PlacedModule> {
}
