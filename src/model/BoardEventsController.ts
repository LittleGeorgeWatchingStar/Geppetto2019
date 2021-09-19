import {Subject, Subscription} from "rxjs";

export class BoardEventsController {
    private static instance: BoardEventsController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private constructor() {
    }

    public static getInstance(): BoardEventsController {
        if (!this.instance) {
            this.instance = new BoardEventsController();
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