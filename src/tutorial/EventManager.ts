import * as $ from "jquery";
import {
    ArrowEvent,
    TextboxEvent,
    TUTORIAL_ARROW_HIDE,
    TUTORIAL_ARROW_SHOW,
    TUTORIAL_TEXT_HIDE,
    TUTORIAL_TEXT_SHOW
} from "./events";

const ARROWDURATION = 4000; // milliseconds

export class EventManager {
    private textTimeout;
    private arrowTimeout;

    constructor(private events) {
    }

    public showText(event: TextboxEvent) {
        clearTimeout(this.textTimeout);
        this.events.publish($.Event(TUTORIAL_TEXT_SHOW, event));
        if (event.hideAfter > 0) {
            this.textTimeout = setTimeout(() => this.hideText(), event.hideAfter);
        }
    }

    public hideText() {
        this.events.publish(TUTORIAL_TEXT_HIDE);
    }

    public showArrow(options: ArrowEvent) {
        clearTimeout(this.arrowTimeout);
        this.events.publish($.Event(TUTORIAL_ARROW_SHOW, options));
        this.arrowTimeout = setTimeout(() => this.hideArrow(), ARROWDURATION);
    }

    public hideArrow() {
        this.events.publish(TUTORIAL_ARROW_HIDE);
    }
}
