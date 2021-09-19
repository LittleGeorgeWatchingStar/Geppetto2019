import * as Backbone from "backbone";
import * as $ from "jquery";
import * as textboxTemplate from "templates/tutorial_text";
import {TutorialEvent} from "tutorial/TutorialEvent";
import events from "utils/events";
import {DESIGN_CLONE, DESIGN_NEW, DESIGN_OPEN} from "../design/events";
import {TUTORIAL_TOGGLE} from "../toolbar/events";
import {TextboxEvent, TUTORIAL_TEXT_HIDE, TUTORIAL_TEXT_SHOW} from "./events";

/**
 * View for the tutorial text box.
 */
export class TextboxView extends Backbone.View<TutorialEvent> {

    private currentEvent: TextboxEvent = null;

    initialize() {
        this.setElement(textboxTemplate());
        $('#tutorial-container').append(this.el);
        this.hide();

        events.subscribe(TUTORIAL_TEXT_SHOW, event => this.show(event));
        events.subscribe(TUTORIAL_TEXT_HIDE, () => this.hide());
        events.subscribe(DESIGN_NEW, () => this.hide());
        events.subscribe(DESIGN_OPEN, () => this.hide());
        events.subscribe(DESIGN_CLONE, () => this.hide());

        return this;
    }

    public events() {
        return {
            'click': () => this.dismiss(), // Click anywhere on the box to dismiss it.
            'click .close.all': event => this.dismissAll(event)
        };
    }

    private show(event: TextboxEvent) {
        this.currentEvent = event;

        /* XSS alert! Make sure tutorial event HTML content comes from a
         * trusted source! */
        this.$el.find('#tutorial-textbox-content').html(event.html);
        this.$el.show();
        this.$el.css({
            top: `${event.top}%`,
            left: `${event.left}%`,
        });
    }

    /**
     * Tells the current tutorial event to stop appearing.
     */
    private dismiss(): void {
        this.currentEvent.dismiss();
        this.hide();
    }

    private hide(): void {
        this.$el.hide();
        this.currentEvent = null;
    }

    private dismissAll(event): void {
        events.publish(TUTORIAL_TOGGLE);
        this.hide();
        event.stopPropagation(); // Do not call dismiss()
    }
}
