import {
    IPromotionController,
    IPromotionControllerStatic
} from "./PromotionController";
import {Subject, Subscription} from "rxjs";
import {EventsController} from "../Events/EventsController";
import {CURRENT_DESIGN_SET} from "../design/events";
import {DesignController} from "../design/DesignController";
import {COM, PROCESSOR} from "../module/Category";
import * as moment from 'moment-timezone';
import {Module} from "../module/Module";
import * as Config from "Config";

const DETAILS_LINK = `${Config.WWW_URL}/raspberry-pi-special-offer/`;

const R_RI_COM_SKUS = [
    'MOD00115',
    'MOD00156',
    'MOD00287',
    'MOD00327',
    'MOD00330',
    'MOD00343',
    'MOD00669',
    'MOD00672',
];

const EXCLUDED_R_RI_COM_SKUS = [
    'MOD00328', // Exclude vertical connector because expensive to manufacture.
];

const SERVER_TIMEZONE = 'America/Los_Angeles';
const MOMENT_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const PROMO_START = Config.PI_DAY_PROMO_START;
const PROMO_END = Config.PI_DAY_PROMO_END;

const MS_PER_DAY = 86400000;

export const PiDayPromotionController: IPromotionControllerStatic = class PiDayPromotionController implements IPromotionController {
    private static instance: PiDayPromotionController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private currentDesignSetCallback: () => void | null;
    private designSubscriptions: Subscription[] = [];

    /** Is time with in the promotion period */
    private _isActive = false;

    /** If current design qualifies for promotion */
    private _isQualified = false;

    private constructor() {
        const start = moment.tz(PROMO_START, MOMENT_FORMAT, SERVER_TIMEZONE);
        const end = moment.tz(PROMO_END, MOMENT_FORMAT, SERVER_TIMEZONE);

        this.checkStartPromotion(start, end);
        this.checkEndPromotion(end);
    }

    public static getInstance(): PiDayPromotionController {
        if (!this.instance) {
            this.instance = new PiDayPromotionController();
        }
        return this.instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    private checkStartPromotion(start: moment.Moment, end: moment.Moment): void {
        const current = moment();

        // Check if promotion has ended, don't start promotion if it has ended.
        const daysToEnd = end.diff(current, 'days');
        if (daysToEnd > 1) {
            // continue;
        } else if (daysToEnd == 0) {
            const msToEnd = end.diff(current, 'ms');
            if (msToEnd > 0) {
                // continue;
            } else {
                return;
            }
        } else {
            return;
        }

        const daysToStart = start.diff(current, 'days');
        if (daysToStart > 1) {
            setTimeout(() => {
                this.checkStartPromotion(start, end);
            }, MS_PER_DAY);
        } else if (daysToStart == 0) {
            const msToStart = start.diff(current, 'ms');
            if (msToStart > 0) {
                setTimeout(() => {
                    this.checkStartPromotion(start, end);
                }, msToStart);
            } else {
                this.startPromotion();
            }
        } else {
            this.startPromotion();
        }
    }

    private checkEndPromotion(end: moment.Moment): void {
        const current = moment();
        const daysToEnd = end.diff(current, 'days');
        if (daysToEnd > 1) {
            setTimeout(() => {
                this.checkEndPromotion(end);
            }, MS_PER_DAY);
        } else if (daysToEnd == 0) {
            const msToEnd = end.diff(current, 'ms');
            if (msToEnd > 0) {
                setTimeout(() => {
                    this.checkEndPromotion(end);
                }, msToEnd);
            } else {
                this.endPromotion();
            }
        } else {
            this.endPromotion();
        }
    }

    private startPromotion(): void {
        this.isActive = true;
        this.subscribeToCurrentDesign();
        this.currentDesignSetCallback = () => this.subscribeToCurrentDesign();
        EventsController.getInstance().subscribeEvent(CURRENT_DESIGN_SET, this.currentDesignSetCallback);
    }

    private endPromotion(): void {
        this.isActive = false;
        if (this.currentDesignSetCallback) {
            EventsController.getInstance().unsubscribeEvent(CURRENT_DESIGN_SET, this.currentDesignSetCallback);
        }
        this.unsubscribeToCurrentDesign();
        this.updateIsQualified();
    }

    private unsubscribeToCurrentDesign(): void {
        this.designSubscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.designSubscriptions = [];
    }

    private subscribeToCurrentDesign(): void {
        this.unsubscribeToCurrentDesign();
        const design = DesignController.getCurrentDesign();
        if (design) {
            this.updateIsQualified();
            this.designSubscriptions.push(design.changePlacedModules$.subscribe(() => {
                this.updateIsQualified();
            }));
        }
    }

    private get isActive(): boolean {
        return this._isActive;
    }

    private set isActive(isActive: boolean) {
        if (this._isActive !== isActive) {
            this._isActive = isActive;
            this.publish();
        }
    }

    private get isQualified(): boolean {
        return this._isQualified;
    }

    private set isQualified(isQualified: boolean) {
        if (this._isQualified !== isQualified) {
            this._isQualified = isQualified;
            this.publish();
        }
    }

    private updateIsQualified(): void {
        if (this.isActive === false) {
            this.isQualified = false;
            return;
        }

        const design = DesignController.getCurrentDesign();
        if (!design) {
            this.isQualified = false;
            return;
        }

        let comCount = 0; // Count of COMs and Processors.
        let piCount = 0;
        design.getPlacedModules().forEach(pm => {
            if(pm.module.isCategory(COM) || pm.module.isCategory(PROCESSOR)) {
                comCount++;
                if (R_RI_COM_SKUS.indexOf(pm.module.sku) >= 0) {
                    piCount++;
                }
            }
        });
        this.isQualified = comCount > 0 && comCount === piCount;
    }


    /**
     * The initial loading page for Geppetto.
     *
     * Give this special treatment, because we need this before Geppetto loads.
     */
    public static getLoaderMessage(): string | null {
        const current = moment();
        const start = moment.tz(PROMO_START, MOMENT_FORMAT, SERVER_TIMEZONE);
        const end = moment.tz(PROMO_END, MOMENT_FORMAT, SERVER_TIMEZONE);
        const msToStart = start.diff(current, 'ms');
        const msToEnd = end.diff(current, 'ms');

        if (msToStart <= 0 && msToEnd > 0) {
            return `<b>Limited Pi Special.</b> $1999.00 fee waived for RPi Manufacturing.<br><a href="${DETAILS_LINK}" target="_blank"><b>Click here</b></a> for details.`;
        }

        return null;
    }

    public get dashboardMessage(): string | null {
        if (!this.isActive) {
            return null;
        }

        return `<b>Free RPi Design Manufacturing!</b> $1999.00 Value. Limited Offer. <a href="${DETAILS_LINK}" target="_blank"><b>Click here</b></a> for details.`;
    }

    public get priceToolbuttonMessage(): string | null {
        if (!this.isQualified) {
            return null;
        }

        return '$1999.00 manufacturing fee waived!';
    }

    public get priceMessage(): string | null {
        if (!this.isQualified) {
            return null;
        }

        return `This design currently qualifies for free manufacturing! <hr /><a href="${DETAILS_LINK}" target="_blank"><b>Click here</b></a> for details.`;
    }

    public get feeMessage(): string | null {
        if (!this.isQualified) {
            return null;
        }

        return `No Set-up fee!`
    }

    public getModuleInfoMessage(module: Module): string | null {
        if (!this.isActive) {
            return null;
        }

        if (R_RI_COM_SKUS.indexOf(module.sku) >= 0) {
            return `Free manufacturing! Limited Pi Special. <a href="${DETAILS_LINK}" target="_blank"><b>Click here</b></a> for details.`
        } else if (EXCLUDED_R_RI_COM_SKUS.indexOf(module.sku) >= 0) {
            return `Not included in Pi promotion. <a href="${DETAILS_LINK}" target="_blank"><b>Click here</b></a> for details.`
        }

        return null;
    }
};
