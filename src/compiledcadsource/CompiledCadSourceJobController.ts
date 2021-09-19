import {DesignController} from "../design/DesignController";
import {getDesignRevisionGateway} from "../design/DesignRevisionGateway";
import {CompiledCadSourceJob} from "./CompiledCadSourceJob";
import events from "utils/events";
import {DESIGN_LOADED, DESIGN_SAVE_COMPLETE} from "../design/events";
import {ServerID} from "../model/types";
import {Subject, Subscription} from "rxjs";
import {DesignRevision} from "../design/DesignRevision";
import {CAD_COMPILE_COMPLETE} from "../workspace/events";

const CHECK_STATUS_INTERVAL = 1500; // milliseconds.

export class CompiledCadSourceJobController {
    private static instance: CompiledCadSourceJobController;

    private events$: Subject<undefined> = new Subject<undefined>();

    /**
     * Current design revision ID of job getting checked.
     * Note: keep track of the ID, because "save as" mutations the ID of a design revision.
     */
    private _currentDesignRevisionId: ServerID | null = null;
    private _currentDesignRevision: DesignRevision | null = null;

    /** Current job getting checked. */
    private _currentJob: CompiledCadSourceJob | null = null;

    private _eventSubscriptionFunctions: {[event: string]: (...args: any[]) => void} = {};

    public constructor() {
        this._eventSubscriptionFunctions[DESIGN_SAVE_COMPLETE] = () => this.handleDesignChange();
        this._eventSubscriptionFunctions[DESIGN_LOADED] = () => {
            this.handleDesignChange();
            this.checkDesignRevisionJobStatus();
        };

        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            events.subscribe(event, subscriptionFunction);
        }
    }

    public destructor(): void {
        for (const event in this._eventSubscriptionFunctions) {
            const subscriptionFunction = this._eventSubscriptionFunctions[event];
            events.unsubscribe(event, subscriptionFunction);
        }
        this._eventSubscriptionFunctions = {};
    }

    public static getInstance(): CompiledCadSourceJobController {
        if (!this.instance) {
            this.instance = new CompiledCadSourceJobController();
        }
        return this.instance;
    }

    public static setInstance(instance: CompiledCadSourceJobController): void {
        this.instance = instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    public get job(): CompiledCadSourceJob | null {
        return this.currentJob;
    }

    public get isJobOutOfDate(): boolean {
        if (this._currentDesignRevision && this.currentJob) {
            return this._currentDesignRevision.lastSaved > this.currentJob.created;
        }
        return false;
    }

    private get currentJob(): CompiledCadSourceJob | null {
        return this._currentJob;
    }

    private set currentJob(newCurrentJob: CompiledCadSourceJob | null) {
        this._currentJob = newCurrentJob;
        this.publish();
    }

    private handleDesignChange(): void {
        const newCurrentDesignRevision = DesignController.getCurrentDesign();
        const newCurrentDesignRevisionId = DesignController.getCurrentDesign() ?
            DesignController.getCurrentDesign().id :
            null;
        if (this._currentDesignRevisionId !== newCurrentDesignRevisionId) {
            this._currentDesignRevisionId = newCurrentDesignRevisionId;
            this._currentDesignRevision = newCurrentDesignRevision;
            this.currentJob = null;
        }
    }

    /**
     * Gets the current job of a design revision, and checks the jobs status
     * until it is in final state.
     */
    private checkDesignRevisionJobStatus(): void {
        const currentDesignRevisionId = this._currentDesignRevisionId;
        if (!currentDesignRevisionId) {
            return;
        }
        getDesignRevisionGateway()
            .getDesignRevisionCompiledCadJobs(currentDesignRevisionId)
            .then(
                jobs => {
                    if (!jobs.length) {
                        return;
                    }
                    this.currentJob = jobs[0];
                    if (!this.currentJob.isInFinalState) {
                        const intervalHandle = window.setInterval(() => {
                            this.checkCurrentJobStatus(currentDesignRevisionId, this.currentJob.id, intervalHandle);
                        }, CHECK_STATUS_INTERVAL);
                    }
                });
    }

    public startJob(): void {
        const currentDesignRevisionId = this._currentDesignRevisionId;
        if (!currentDesignRevisionId) {
            return;
        }
        getDesignRevisionGateway()
            .postDesignRevisionCompiledCadJob(currentDesignRevisionId)
            .then(
                newJob => {
                    this.currentJob = newJob;
                    const intervalHandle = window.setInterval(() => {
                        this.checkCurrentJobStatus(currentDesignRevisionId, newJob.id, intervalHandle);
                    }, CHECK_STATUS_INTERVAL);
                });
    }

    /**
     * Checks job status until it is in final state.
     */
    private checkCurrentJobStatus(designRevisionId: ServerID,
                                  jobId: string,
                                  intervalHandle: number): void {
        // This controller listens to Design change, and will invoke another interval.
        // So stop this interval if Design/Job has changed.
        if (designRevisionId !== this._currentDesignRevisionId ||
            !this.currentJob ||
            jobId !== this.currentJob.id) {
            clearInterval(intervalHandle);
            return;
        }

        getDesignRevisionGateway()
            .getDesignRevisionCompiledCadJob(designRevisionId, jobId)
            .then(
                updatedJob => {
                    // This controller listens to Design change, and will invoke another interval.
                    // So stop this interval if Design/Job has changed.
                    if (designRevisionId !== this._currentDesignRevisionId ||
                        !this.currentJob ||
                        updatedJob.id !== this.currentJob.id) {
                        clearInterval(intervalHandle);
                        return;
                    }

                    this.currentJob = updatedJob;

                    if (updatedJob.isInFinalState) {
                        clearInterval(intervalHandle);
                        events.publish(CAD_COMPILE_COMPLETE);
                    }
                },
                err => {
                    clearInterval(intervalHandle);
                });
    }
}
