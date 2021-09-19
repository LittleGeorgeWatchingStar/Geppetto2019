import {Board} from "../model/Board";
import {Vector2D} from "../utils/geometry";
import {EdgePosition} from "../dimension/Dimensionable";

/**
 * When the user clicks on a menu item on the dashboard, eg. New Design.
 */
export const DASHBOARD_ACTION = 'DashboardAction';

/**
 * When clicking on a tab causes a new view to open (eg, workspace, my account).
 */
export const TABBUTTON_CLICKED = 'tabopen';

/**
 * When clicking on the save tab on the logout SaveOrDiscard dialog.
 */
export const SAVE_DESIGN = 'save';

/**
 * When clicking on the discard tab on the logout SaveOrDiscard dialog.
 */
export const DISCARD_DESIGN = 'logoutSso';

/**
 * When clicking on the cancel tab on the logout SaveOrDiscard dialog.
 */
export const CANCEL = 'cancelLogout';

/**
 * When resize the board
 */
export const RESIZE_BOARD = 'boardResize';

/**
 * When the user has finished changing the radius of the board, eg.
 * by releasing the corner handle.
 */
export const CHANGE_RADIUS = 'boardChangeRadius';

/**
 * When 'Open Design Helper' has been clicked in the Review Dialog.
 */
export const DESIGN_HELPER = 'designHelper';

/**
 * When 'Open Action History' has been clicked in the working area toolbar
 */
export const ACTION_HISTORY = 'actionHistory';

/**
 * When 'Open 3D View' has been clicked in the working area toolbar
 */
export const THREED_VIEW_BOARD = 'threedViewBoard';

/**
 * Identifies the tab that was clicked open.
 */
export interface TabEvent {
    tab: string;
}

export interface ResizeEvent extends ModelEvent<Board> {
    board: Board,
    edge: EdgePosition,
    vector: Vector2D;
    radius: number;
}

export interface RadiusChangeEvent extends  ModelEvent<Board> {
    board: Board;
    radius: number;
}

export interface DashboardActionEvent {
    action: string;
    label: string;
}