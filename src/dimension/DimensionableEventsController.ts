import {Subject, Subscription} from "rxjs";
import {filter} from "rxjs/operators";
import {Dimensionable} from "./Dimensionable";

export class DimensionableEventsController {
    private static instance: DimensionableEventsController;

    private events$: Subject<Dimensionable> = new Subject<Dimensionable>();

    private constructor() {
    }

    public static getInstance(): DimensionableEventsController {
        if (!this.instance) {
            this.instance = new DimensionableEventsController();
        }
        return this.instance;
    }

    public publish(dimensionable: Dimensionable): void {
        this.events$.next(dimensionable);
    }

    public subscribe(dimensionable: Dimensionable,
                     callback: (dimensionable: Dimensionable) => void): Subscription {
        return this.events$
            .pipe(filter(item => item === dimensionable))
            .subscribe(dimensionable => callback(dimensionable));
    }
}