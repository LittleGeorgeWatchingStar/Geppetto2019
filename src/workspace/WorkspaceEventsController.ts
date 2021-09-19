import {Subject, Subscription} from "rxjs";

export class WorkspaceEventsController {
    private static instance: WorkspaceEventsController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private constructor() {
    }

    public static getInstance(): WorkspaceEventsController {
        if (!this.instance) {
            this.instance = new WorkspaceEventsController();
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