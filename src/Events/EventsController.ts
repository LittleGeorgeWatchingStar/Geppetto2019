import eventDispatcher from "../../src/utils/events";


/**
 * @deprecated Use this instead of utils/events, but if possible don't use this,
 *  use RxJS Observables instead.
 */
export class EventsController {
    private static instance: EventsController;

    private eventDispatcher;

    private constructor(eventDispatcher) {
        this.eventDispatcher = eventDispatcher;
    }

    public static getInstance(): EventsController {
        if (!this.instance) {
            this.instance = new EventsController(eventDispatcher);
        }
        return this.instance;
    }

    public subscribeModelEvent(model: any, eventName: string, callBack: () => void) {
        this.eventDispatcher.subscribe(eventName, event => {
            if (model === event.model) {
                callBack();
            }
        });
    }

    public publishModelEvent(model: any, eventName: string) {
        this.eventDispatcher.publishModelEvent(eventName, model);
    }


    public subscribeEvent(eventName: string, callBack: () => void) {
        this.eventDispatcher.subscribe(eventName, () => {
            callBack();
        });
    }

    public unsubscribeEvent(eventName: string, callBack: () => void) {
        this.eventDispatcher.unsubscribe(eventName, () => {
            callBack();
        });
    }

    public publishEvent(eventName: string, data: any = undefined) {
        this.eventDispatcher.publishEvent(eventName, data);
    }
}