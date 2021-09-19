import {Subject, Subscription} from "rxjs";
import {filter} from "rxjs/operators";
import {Dimension} from "./Dimension";

export class DimensionEventsController {
    private static instance: DimensionEventsController;

    private events$: Subject<Dimension> = new Subject<Dimension>();

    private constructor() {
    }

    public static getInstance(): DimensionEventsController {
        if (!this.instance) {
            this.instance = new DimensionEventsController();
        }
        return this.instance;
    }

    public publish(dimension: Dimension): void {
        this.events$.next(dimension);
    }

    public subscribe(dimension: Dimension,
                     callback: (anchor: Dimension) => void): Subscription {
        return this.events$
            .pipe(filter(item => item === dimension))
            .subscribe(dimension => callback(dimension));
    }

    public subscribeAll(callback: (dimension: Dimension) => void): Subscription {
        return this.events$.subscribe(dimension => callback(dimension));
    }
}