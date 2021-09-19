import GeppettoModel from "model/GeppettoModel";
import {Element, Window} from "./dom";
import {EventManager} from "./EventManager";
import {ArrowEvent, TextboxEvent} from "./events";
import {Model} from "backbone";

const ARROW_ROTATION = {
    TOP: 0,
    RIGHT: 90,
    DOWN: 180,
    LEFT: 270
};

const MODEL_STATE = {
    ANY: '',
    OVERLAPS: 'overlaps',
    UNREADY: 'unready',
    READY: 'ready',
    CONNECTED: 'connected',
};

/**
 * A text box and optional arrow that are part of a tutorial.
 */
export class TutorialEvent extends GeppettoModel implements TextboxEvent {
    /**
     * The number of times this event has executed.
     */
    private executeCount = 0;

    /**
     * The event name that triggers this tutorial step.
     */
    public getTrigger(): string {
        return this.get('trigger');
    }

    /**
     * The DOM selector at which the arrow should point.
     *
     * Null means don't show an arrow.
     * "event" means a dynamically-determined position.
     *
     * @see isEventPosition
     */
    private get selector(): string | null {
        return this.get('selector');
    }

    /**
     * The help HTML content to render.
     */
    public get html(): string {
        return this.get('html');
    }

    /**
     * The top position of the help text box.
     */
    public get top(): number {
        return this.get('text_top');
    }

    /**
     * The left position of the help text box.
     */
    public get left(): number {
        return this.get('text_left');
    }

    /**
     * Whether an indicator arrow should be displayed.
     */
    private get isShowArrow(): boolean {
        return this.selector !== null;
    }

    /**
     * Executes this event if its trigger has occurred.
     */
    public executeIfActive(events: EventManager, model: Model | null): void {
        if (this.isActive(model)) {
            events.showText(this);
            this.showArrowIfActive(events, model);
            this.executeCount++;
        }
    }

    /**
     * Whether this event should execute.
     */
    private isActive(model: Model | null): boolean {
        return !this.isFinished
            && this.modelStateMatches(model);
    }

    /**
     * True if this event has executed the maximum number of times.
     */
    private get isFinished(): boolean {
        return (this.stopAfter > 0) && (this.executeCount >= this.stopAfter);
    }

    /**
     * The maximum number of times this event should execute.
     *
     * Zero means no maximum -- execute forever.
     */
    private get stopAfter(): number {
        return this.get('stop_after');
    }

    /**
     * Tells this event to stop appearing.
     */
    public dismiss(): void {
        this.set('stop_after', 1);
        this.executeCount++;
    }

    /**
     * Number of milliseconds before the text box should self-close.
     *
     * Zero means never self-close (the user must manually close it).
     */
    public get hideAfter(): number {
        return this.get('hide_after');
    }

    private modelStateMatches(model): boolean {
        if (!this.isStatefulModel(model)) {
            return MODEL_STATE.ANY === this.modelState;
        }
        switch (this.modelState) {
            case MODEL_STATE.ANY:
                return true;
            case MODEL_STATE.OVERLAPS:
                return model.overlaps();
            case MODEL_STATE.UNREADY:
                return !model.isReady();
            case MODEL_STATE.READY:
                return model.isReady() && (!model.isConnected());
            case MODEL_STATE.CONNECTED:
                return model.isConnected();
            default:
                return true;
        }
    }

    private isStatefulModel(model: Model | null): boolean {
        return !!model && 'isReady' in model;
    }

    private get modelState(): string {
        return this.get('model_state');
    }

    private showArrowIfActive(events: EventManager, model: Model | null): void {
        if (this.isShowArrow) {
            this.showArrow(events, model);
        }
    }

    private showArrow(events: EventManager, model: Model | null): void {
        const arrowEvent = this.getDomPosition(model);
        events.showArrow(arrowEvent);
    }

    /**
     * Returns the arrow position settings for events that target a specific
     * DOM selector.
     */
    private getDomPosition(model: Model | null): ArrowEvent {
        const selector = this.parseSelector(model);
        const window = new Window();
        const $selectedNode = $(selector);
        if ($selectedNode.length === 0) {
            console.error(selector, "is not a valid selector for the tutorial.");
            return;
        }
        const element = new Element($selectedNode);
        let top = element.top;
        let left = element.left;
        let rotate = 0;

        if (element.isSmallerThanWindowHalf(window) || element.isHorizontal()) {
            left += element.width / 2;
            if (element.isInWindowTopHalf(window)) {
                top += 1.1 * element.height;
            } else {
                rotate = ARROW_ROTATION.DOWN;
            }
        } else {
            top += element.height / 2;
            if (element.isInWindowRightHalf(window)) {
                rotate = ARROW_ROTATION.RIGHT;
            } else {
                rotate = ARROW_ROTATION.LEFT;
                left += element.width;
            }
        }
        return {
            top: window.toHeightPercentage(top),
            left: window.toWidthPercentage(left),
            rotate: rotate
        }
    }

    private parseSelector(model: Model | null) {
        return this.isStatefulModel(model)
            ? this.selector.replace('{cid}', model.cid)
            : this.selector;
    }
}
