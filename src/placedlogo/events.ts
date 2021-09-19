import {Vector2D} from "../utils/geometry";
import {PlacedLogo, ResizeEdgePosition} from "./PlacedLogo";

/**
 * When a placed logo is removed to the design revision's collection.
 */
export const PLACED_LOGO_REMOVE = 'PlacedLogo.remove';

/**
 * Whenever a placed logo is clicked.
 */
export const PLACED_LOGO_CLICK = 'PlacedLogo.click';

/**
 * When a placed logo is selected. Unlike click, this event is conditional.
 */
export const PLACED_LOGO_SELECT = 'PlacedLogo.select';

export const PLACED_LOGO_DRAG = 'PlacedLogo.drag';

export const PLACED_LOGO_RESIZE = 'placedLogo:resize';


export interface PlacedLogoEvent extends ModelEvent<PlacedLogo> {
}

export interface ResizeEvent extends PlacedLogoEvent {
    resizeEdge: ResizeEdgePosition;
    translation: Vector2D;
}
