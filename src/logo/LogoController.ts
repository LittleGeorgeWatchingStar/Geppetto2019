import {actions} from "../core/action";
import {RemoveLogo, ResizeLogo,} from "./actions";
import {
    PLACED_LOGO_REMOVE,
    PLACED_LOGO_RESIZE,
    PlacedLogoEvent,
    ResizeEvent
} from "../placedlogo/events";

function init() {
    actions.subscribe(PLACED_LOGO_RESIZE,
        (event: ResizeEvent) => ResizeLogo.fromEvent(event));
    actions.subscribe(PLACED_LOGO_REMOVE,
        (event: PlacedLogoEvent) => RemoveLogo.fromEvent(event));
}

export default {
    init: init,
}
