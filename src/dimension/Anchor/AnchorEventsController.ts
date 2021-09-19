import {Subject, Subscription} from "rxjs";
import {filter} from "rxjs/operators";
import {Anchor} from "./Anchor";

export class AnchorEventsController {
    private static instance: AnchorEventsController;

    private events$: Subject<Anchor> = new Subject<Anchor>();

    private constructor() {
    }

    public static getInstance(): AnchorEventsController {
        if (!this.instance) {
            this.instance = new AnchorEventsController();
        }
        return this.instance;
    }

    public publish(anchor: Anchor): void {
        this.events$.next(anchor);
    }

    public subscribe(anchor: Anchor,
                     callback: (anchor: Anchor) => void): Subscription {
        return this.events$
            .pipe(filter(item => item === anchor))
            .subscribe(anchor => callback(anchor));
    }
}