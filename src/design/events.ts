import {Module} from "../module/Module";
import {DesignRevision} from "./DesignRevision";
import {ServerID} from "../model/types";
import {Design} from "./Design";

/**
 * When an existing design has been opened.
 *
 * @see DesignRequestEvent
 */
export const DESIGN_OPEN = 'open';

/**
 * When someone else's design has been cloned.
 */
export const DESIGN_CLONE = 'clone';

/**
 * When the user starts a new design.
 */
export const DESIGN_NEW = 'newDesign';

/**
 * When the design is done loading.
 */
export const DESIGN_LOADED = 'Design.load';

/**
 * When the design dirty status has been changed. 'Dirty' means the design has unsaved changes.
 */
export const DIRTY_STATUS_CHANGED = 'Design.changed';

/**
 * When another design has been set as the current one.
 */
export const CURRENT_DESIGN_SET = 'currentDesignSet';

/**
 * When a design is successfully saved.
 *
 * @see SaveCompleteEvent
 */
export const DESIGN_SAVE_COMPLETE = 'saveComplete';

export const DESIGN_DELETE_COMPLETE = 'deleteComplete';

/**
 * When a design has been shared. Used to track shares in Google Analytics.
 */
export const DESIGN_SHARE_COMPLETE = 'designShared';

export const DESIGN_UPREV_COMPLETE = 'designUpReved';

export const DESIGN_PUSH_COMPLETE = 'designPushed';

/**
 * When a 3D image is ready to be saved.
 */
export const SAVE3D = 'save3D';

/**
 * When a 3D Image has been saved for a design.
 */
export const IMAGE_SAVE_COMPLETE = '3dImageSaved';

/**
 * When filtering the list of designs by module or keyword.
 */
export const FILTER_DESIGN = 'filter';

/**
 * When filtering the list of designs by input.
 */
export const INPUT_FILTER_DESIGN = 'inputFilterDesign';

/**
 * When a new Design Revision has been loaded, eg. from starting a new design.
 */
export const REVISION_LOADED = 'loadRevision';

/**
 * When the user has started dragging the board resize handle.
 */
export const BOARD_RESIZE_DRAGSTART = 'Board.resizeStart';

/**
 * When the board width or height has changed.
 */
export const BOARD_RESIZE = 'Board.resize';

/**
 * When the board has finished redimensioning.
 * Meant for callbacks that don't want the frequent updates of resize.
 */
export const BOARD_DIMENSIONS_CHANGED = 'Board.dimensionsChanged';

/**
 * When the board corner radius is locked or unlocked.
 */
export const TOGGLE_CORNER_RADIUS_LOCK = 'toggleCornerRadiusLock';

/**
 * When a save is currently in progress or not.
 */
export const SAVING_STATE_CHANGED = 'savingStateChanged';

export const OPEN_DESIGN_SCHEMATIC = 'Design.schematic.open';

/**
 * Eg. when opening a design or downloading BSP.
 */
export interface DesignRequestEvent {
    design_revision_id: ServerID;
}

/**
 * When a design is successfully saved.
 *
 * @see DESIGN_SAVE_COMPLETE
 */
export interface SaveCompleteEvent {
    /** True if this is the first save of a new design. */
    isNewDesign: boolean;
}

export interface DesignsFilterEvent {
    selectedModules: Module[];
}

export interface InputFilterEvent {
    term: string;
}

export interface DesignRevisionEvent {
    design_revision: DesignRevision;
    callBack: () => void;
}

/**
 * For Google Analytics tracking on specific designs.
 */
export interface DesignEvent {
    designId: ServerID;
}
