import {Subject, Subscription} from "rxjs";

/**
 * TODO: Use Redux and make this in to a global state.
 */
export class DimensionToolbuttonLockTooltipController {
    private static instance: DimensionToolbuttonLockTooltipController;

    private _showLockTooltip: boolean;
    private _unShowLockTooltipHandle: number;

    private events$: Subject<undefined> = new Subject<undefined>();

    private constructor() {
        this._showLockTooltip = false;
    }

    public static getInstance(): DimensionToolbuttonLockTooltipController {
        if (!this.instance) {
            this.instance = new DimensionToolbuttonLockTooltipController();
        }
        return this.instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    public get showLockTooltip(): boolean {
        return this._showLockTooltip;
    }

    private setShowLockTooltip(show: boolean) {
        if (this._showLockTooltip !== show) {
            this._showLockTooltip = show;
            this.publish();
        }
    }

    public triggerLockTooltip(): void {
        this.setShowLockTooltip(true);

        if (this._unShowLockTooltipHandle) {
            clearTimeout(this._unShowLockTooltipHandle);
        }

        this._unShowLockTooltipHandle = window.setTimeout(() => {
            this.setShowLockTooltip(false);
        }, 5000);
    }
}