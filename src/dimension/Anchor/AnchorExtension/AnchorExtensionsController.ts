import {Anchor} from "../Anchor";
import {AnchorExtension} from "./AnchorExtension";
import {generateUuid} from "../../../utils/generateUuid";
import {Subject, Subscription} from "rxjs";

/**
 * TODO: Use Redux and make this in to a global state.
 */
export class AnchorExtensionsController {
    private static instance: AnchorExtensionsController;

    private _extensions: AnchorExtension[] = [];

    private events$: Subject<undefined> = new Subject<undefined>();

    public constructor() {
    }

    public static getInstance(): AnchorExtensionsController {
        if (!this.instance) {
            this.instance = new AnchorExtensionsController();
        }
        return this.instance;
    }

    public static setInstance(instance: AnchorExtensionsController): void {
        this.instance = instance;
    }

    private publish(): void {
        this.events$.next();
    }

    public subscribe(callback: () => void): Subscription {
        return this.events$.subscribe(() => callback());
    }

    public get extensions(): AnchorExtension[] {
        return this._extensions.slice();
    }

    public addExtension(anchor: Anchor): AnchorExtension {
        const extension = {
            uuid: generateUuid(),
            anchor: anchor,
        };
        this._extensions.push(extension);
        this.publish();

        return extension;
    }

    public removeExtension(extension: AnchorExtension): void {
        const index = this._extensions.indexOf(extension);
        if (index >= 0) {
            this._extensions.splice(index, 1);
        }
        this.publish();
    }
}