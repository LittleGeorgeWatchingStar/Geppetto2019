import {PiDayPromotionController} from "./PiDayPromotionController";
import {Subject, Subscription} from "rxjs";
import {Module} from "../module/Module";

export interface IPromotionControllerStatic {
    initConfig?(promotionConfig: boolean): void;
    getInstance(): IPromotionController;
    getLoaderMessage(): string | null;
}

export interface IPromotionController {
    subscribe(callback: () => void): Subscription;
    dashboardMessage: string | null;
    priceToolbuttonMessage: string | null;
    priceMessage: string | null;
    feeMessage: string | null;
    getModuleInfoMessage(module: Module): string | null;
}

export const PromotionController: IPromotionControllerStatic = class PromotionController {
    private static promotionConfig = false;

    public static initConfig(promotionConfig: boolean) {
        this.promotionConfig = promotionConfig;
    }

    private static getPromotionControllerClass(): IPromotionControllerStatic {
        return this.promotionConfig ?
            PiDayPromotionController :
            NullPromotionController;
    }

    private static instance: IPromotionController;

    private constructor() {
    }

    public static getInstance(): IPromotionController {
        if (!this.instance) {
            this.instance = this.getPromotionControllerClass().getInstance();
        }
        return this.instance;
    }

    public static getLoaderMessage(): string | null {
        return this.getPromotionControllerClass().getLoaderMessage();
    }
};

const NullPromotionController: IPromotionControllerStatic = class NullPromotionController implements IPromotionController {
    private static instance: NullPromotionController;

    private events$: Subject<undefined> = new Subject<undefined>();

    private constructor() {
    }

    public static getInstance(): NullPromotionController {
        if (!this.instance) {
            this.instance = new NullPromotionController();
        }
        return this.instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    /**
     * The initial loading page for Geppetto.
     *
     * Give this special treatment, because we need this before Geppetto loads.
     */
    public static getLoaderMessage(): string | null {
        return null;
    }

    public get dashboardMessage(): string | null {
        return null;
    }

    public get priceToolbuttonMessage(): string | null {
        return null;
    }

    public get priceMessage(): string | null {
        return null;
    }

    public get feeMessage(): string | null {
        return null;
    }

    public getModuleInfoMessage(module: Module): string | null {
        return null;
    }
};
