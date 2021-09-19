import {Subject, Subscription} from "rxjs";

export class DimensionCollectionEventsController {
    private static instance: DimensionCollectionEventsController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private constructor() {
    }

    public static getInstance(): DimensionCollectionEventsController {
        if (!this.instance) {
            this.instance = new DimensionCollectionEventsController();
        }
        return this.instance;
    }

    public publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }
}