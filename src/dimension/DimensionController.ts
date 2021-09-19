import events from 'utils/events';
import {
    AddDimensionEvent,
    FINISH_DIMENSION,
    MoveDimensionEvent,
    REMOVE_DIMENSION,
    SET_DIMENSION,
    TOGGLE_DIMENSION_LOCK
} from "./events";
import {CONTEXT_MODE, ESC, WORKSPACE_CLICK} from "../workspace/events";
import {BLOCK_ROTATE} from "../placedmodule/events";
import {REMOVE_MODULE_FINISH} from "../module/events";
import {Anchor} from "./Anchor/Anchor";
import {PLACED_LOGO_REMOVE} from "../placedlogo/events";
import {
    CreateDimension,
    LockDimension,
    MoveByDimension,
    RemoveDimension
} from "./actions";
import {ActionFactory, actions} from "../core/action";
import {ChangeRadiusBoard, ResizeBoard} from "../view/actions";
import {
    CHANGE_RADIUS,
    RadiusChangeEvent,
    RESIZE_BOARD,
    ResizeEvent,
} from "../view/events";
import {DesignRevision} from "../design/DesignRevision";
import {DesignController} from "../design/DesignController";
import {Subject, Subscription} from "rxjs";
import {AnchorExtension} from "./Anchor/AnchorExtension/AnchorExtension";
import {AnchorExtensionsController} from "./Anchor/AnchorExtension/AnchorExtensionsController";
import {EventsController} from "../Events/EventsController";


/**
 * Creating a dimension requires the user to select parallel lines.
 * This enum is used to specify the visibility of item anchors.
 * Eg., if we have a VERTICAL anchor selected, then only other VERTICAL anchors will be visible.
 */
export const enum DimensionDirection {
    VERTICAL = 'vertical',
    HORIZONTAL = 'horizontal',
    NONE = 'none',
}

export class DimensionController {
    private static instance: DimensionController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private _startAnchor: Anchor | null = null;
    private _startAnchorExtension: AnchorExtension | null = null;

    private _eventSubscriptionFunctions: {[event: string]: (...args: any[]) => void} = {};
    private _actionSubscriptionFunctions: {[action: string]: ActionFactory} = {};

    public constructor() {
        this.reset();

        this._eventSubscriptionFunctions[CONTEXT_MODE] = () => this.cancelDimension();
        this._eventSubscriptionFunctions[ESC] = () => this.cancelDimension();
        this._eventSubscriptionFunctions[WORKSPACE_CLICK] = () => this.cancelDimension();
        this._eventSubscriptionFunctions[BLOCK_ROTATE] = () => this.cancelDimension();
        this._eventSubscriptionFunctions[REMOVE_MODULE_FINISH] = (event) => this.checkRemovedDimensionable(event);
        this._eventSubscriptionFunctions[PLACED_LOGO_REMOVE] = (event) => this.checkRemovedDimensionable(event);
        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            events.subscribe(event, subscriptionFunction);
        }

        this._actionSubscriptionFunctions[FINISH_DIMENSION] = (event: AddDimensionEvent) => CreateDimension.fromEvent(event);
        this._actionSubscriptionFunctions[REMOVE_DIMENSION] = (event) => RemoveDimension.fromEvent(this.designRevision, event.model);
        this._actionSubscriptionFunctions[TOGGLE_DIMENSION_LOCK] = (event) => LockDimension.fromEvent(this.designRevision, event.model);
        this._actionSubscriptionFunctions[SET_DIMENSION] = (event: MoveDimensionEvent) => MoveByDimension.fromEvent(event);
        this._actionSubscriptionFunctions[RESIZE_BOARD] = (event: ResizeEvent) => ResizeBoard.fromEvent(event);
        this._actionSubscriptionFunctions[CHANGE_RADIUS] = (event: RadiusChangeEvent) => ChangeRadiusBoard.fromEvent(event);
        for (const action in this._actionSubscriptionFunctions) {
            const subscriptionFunction = this._actionSubscriptionFunctions[action];
            actions.subscribe(action, subscriptionFunction);
        }
    }

    public destructor(): void {
        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            events.unsubscribe(event, subscriptionFunction);
        }
        this._eventSubscriptionFunctions = {};

        for (const action in this._actionSubscriptionFunctions) {
            const subscriptionFunction = this._actionSubscriptionFunctions[action];
            actions.unsubscribe(action, subscriptionFunction);
        }
        this._actionSubscriptionFunctions = {};
    }

    public static getInstance(): DimensionController {
        if (!DimensionController.instance) {
            DimensionController.instance = new DimensionController();
        }
        return DimensionController.instance;
    }

    public static setInstance(instance: DimensionController): void {
        this.instance = instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    private get startAnchor(): Anchor {
        return this._startAnchor;
    }

    private set startAnchor(anchor: Anchor | null) {
        this._startAnchor = anchor;
        if (anchor) {
            this._startAnchorExtension = AnchorExtensionsController.getInstance().addExtension(anchor);
        } else {
            AnchorExtensionsController.getInstance().removeExtension(this._startAnchorExtension);
            this._startAnchorExtension = null;
        }
        this.publish();
    }

    private get designRevision(): DesignRevision {
        return DesignController.getCurrentDesign();
    }

    public get dimensionDirection(): DimensionDirection {
        return this.startAnchor ?
            this.startAnchor.direction :
            DimensionDirection.NONE;
    }

    public reset() {
        this.cancelDimension();
    }

    private cancelDimension() {
        if (this.startAnchor) {
            this.startAnchor = null;
        }
    }

    public onClickDimensionAnchor(anchor: Anchor): void {
        if (this.startAnchor) {
            this.finishDimension(anchor);
        } else {
            this.startDimension(anchor);
        }
    }

    /**
     * The first anchor has been selected
     */
    private startDimension(anchor: Anchor): void {
        this.startAnchor = anchor;
    }

    /**
     * The second anchor has been selected
     */
    private finishDimension(finishAnchor: Anchor) {
        if (this.startAnchor === finishAnchor ||
            this.designRevision.hasDimension(this.startAnchor, finishAnchor)) {
            this.cancelDimension();
            return;
        }
        EventsController.getInstance().publishEvent(FINISH_DIMENSION, {
            designRevision: this.designRevision,
            anchor1: this.startAnchor,
            anchor2: finishAnchor} as AddDimensionEvent);
        this.startAnchor = null;
    }

    /**
     * Checks if startAnchor's dimensionable has been removed, and cancels
     * dimensioning if it has been removed
     */
    private checkRemovedDimensionable(event) {
        if (this.startAnchor && this.startAnchor.dimensionable === event.model) {
            this.cancelDimension();
        }
    }
}
