import UserController from "../auth/UserController";
import {AdlinkGateway, getAdlinkGateway} from "./AdlinkGateway";
import {USER_CHANGED} from "../auth/events";
import {EventsController} from "../Events/EventsController";

export class AdlinkUserTrackerController {
    private static instance: AdlinkUserTrackerController;

    private eventsController: EventsController;
    private adlinkGateway: AdlinkGateway;

    private _eventSubscriptionFunctions: {[event: string]: (...args: any[]) => void} = {};

    private constructor() {
        this.eventsController = EventsController.getInstance();
        this.adlinkGateway = getAdlinkGateway();
    }

    public static getInstance(): AdlinkUserTrackerController {
        if (!this.instance) {
            this.instance = new AdlinkUserTrackerController();
        }
        return this.instance;
    }

    /**
     * Becareful when initiating event subscriptions, so that it is not forgotten
     * that this singleton is doing it.
     */
    public initEventSubscriptions(): void {
        this.unsubscribeAllEvents();

        this._eventSubscriptionFunctions[USER_CHANGED] = () => this.trackCurrentUser();
        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            this.eventsController.subscribeEvent(event, subscriptionFunction);
        }
    }

    public unsubscribeAllEvents(): void {
        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            this.eventsController.unsubscribeEvent(event, subscriptionFunction);
        }
        this._eventSubscriptionFunctions = {};
    }

    public trackCurrentUser(): void {
        if (UserController.getUser().isLoggedIn()) {
            this.adlinkGateway.track();
        }
    }
}