import {DesignRevision} from "../design/DesignRevision";
import {Module} from "../module/Module";
import {ContextModes} from "./Workspace";
import {RemoveModules} from "../module/actions";

/**
 * When the user presses ESC on the keyboard.
 */
export const ESC = 'esc';

/**
 * When the user drags the workspace or the board.
 */
export const WORKSPACE_DRAG = 'workspace.drag';

/**
 * When the user clicks the workspace or the board.
 * TODO merge with drag
 */
export const WORKSPACE_CLICK = 'workspace.click';

/**
 * When the user cancels connecting a require bus.
 */
export const CANCEL_CONNECT = 'cancelConnect';

/**
 * When the user opens the board builder dialog.
 */
export const OPEN_BUILDER = 'openBuilder';

/**
 * When the user clicks "Build Board" in the board builder dialog.
 */
export const BUILD_BOARD = 'buildBoard';

/**
 * When the user clicks "Add Power" in the power finder dialog.
 */
export const POWER_BOARD = 'powerBoard';

/**
 * When the user toggles one of the context modes in the toolbar, eg. Connections or Dimensions.
 */
export const CONTEXT_MODE = 'contextMode';

/**
 * When the user changes the context of the workspace, eg. Connections or Dimensions mode.
 */
export interface ContextModeEvent {
    mode: ContextModes;
}

export interface BuildBoardEvent {
    modules: Module[];
    designRevision: DesignRevision;
    width?: number;
    height?: number;
}

export interface PowerBoardEvent {
    modules: Module[];
    designRevision: DesignRevision;
    removeExisting: RemoveModules;
    open3D: boolean;
}

/**
 * When the user select upverter / cad viewer view options
 */
export const RESET_FUNCTIONAL_VIEW = 'resetFunctionalView';
export const UPVERTER_VIEW = 'upverterView';
export const CAD_VIEW = 'cadView';
export const CAD_COMPILE_COMPLETE = 'cadCompileComplete';

/**
 * When module library display button has been toggled
 */
export const TOGGLE_MODULE_LIBRARY = 'toggleModuleLibrary';

/**
 * When module library is loaded
 */
export const MODULE_LIBRARY_LOADED = 'moduleLibraryLoaded';

/**
 * Back to dashboard toggle
 */
export const BACK_TO_DASHBOARD = 'backToDashboard';
