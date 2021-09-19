import {PlacedModule} from "../../placedmodule/PlacedModule";
import {DesignRevision} from "../DesignRevision";
import {PlacedItem} from "../../placeditem/PlacedItem";
import {ConnectionPath} from "../../connection/ConnectionPath";


export enum PlacedItemErrors {
    NONE = 0,
    UNCONNECTED = 1,
    OFF_BOARD = 2,
    COLLISION = 3
}

export enum PathErrors {
    NONE = 0,
    COLLISION = 1,
    DISTANCE = 2
}

export interface DesignErrorLog {
    item: ConnectionPath | PlacedItem;
    errorCode: PlacedItemErrors | PathErrors;
}

/**
 * Normalizes placed item errors to an enum code and tallies the total number of errors.
 */
export class DesignErrorChecker {

    public numErrors: number;
    public moduleCodes: DesignErrorLog[];
    private logoCodes: DesignErrorLog[];
    private pathCodes: DesignErrorLog[];

    constructor(private readonly design: DesignRevision) {
        this.numErrors = 0;
        this.moduleCodes = [];
        this.logoCodes = [];
        this.pathCodes = [];
    }

    public generate(): this {
        this.generatePMErrorCodes();
        this.generatePathErrors();
        this.generateLogoErrors();
        return this;
    }

    /**
     * Get only module logs that have an error.
     */
    public get moduleErrorCodes(): DesignErrorLog[] {
        return this.moduleCodes.filter(log => log.errorCode !== PlacedItemErrors.NONE);
    }

    /**
     * Get only logo logs that have an error.
     */
    public get logoErrorCodes(): DesignErrorLog[] {
        return this.logoCodes.filter(log => log.errorCode !== PlacedItemErrors.NONE);
    }

    /**
     * Get only path logs that have an error.
     */
    public get pathErrorCodes(): DesignErrorLog[] {
        return this.pathCodes.filter(log => log.errorCode !== PathErrors.NONE);
    }

    private generatePMErrorCodes(): void {
        this.moduleCodes = this.design.getPlacedModules().map(pm => {
            const code = this.moduleErrorCode(pm);
            if (code !== PlacedItemErrors.NONE) {
                ++this.numErrors;
            }
            return {
                item: pm,
                errorCode: code
            } as DesignErrorLog;
        });
    }

    private generatePathErrors(): void {
        this.pathCodes = this.design.paths.map(p => {
            const code = this.pathErrorCode(p);
            if (code !== PathErrors.NONE) {
                ++this.numErrors;
            }
            return {
                item: p,
                errorCode: code
            } as DesignErrorLog;
        });
    }

    private generateLogoErrors(): void {
        this.logoCodes = this.design.getPlacedLogos().map(l => {
            const code = this.makeErrorCode(l);
            if (code !== PlacedItemErrors.NONE) {
                ++this.numErrors;
            }
            return {
                item: l,
                errorCode: code
            } as DesignErrorLog;
        });
    }

    private pathErrorCode(p: ConnectionPath): PathErrors {
        if (p.hasCollisions) {
            return PathErrors.COLLISION;
        }
        if (p.isTooLong) {
            return PathErrors.DISTANCE;
        }
        return PathErrors.NONE;
    }

    private moduleErrorCode(pm: PlacedModule): PlacedItemErrors {
        if (!pm.isConnected() && !pm.isLoading()) {
            return PlacedItemErrors.UNCONNECTED;
        }
        return this.makeErrorCode(pm);
    }

    private makeErrorCode(item: PlacedItem): PlacedItemErrors {
        const design = item.designRevision;
        if (design.board.isOutOfBounds(item)) {
            return PlacedItemErrors.OFF_BOARD;
        }
        if (item.overlaps()) {
            return PlacedItemErrors.COLLISION;
        }
        return PlacedItemErrors.NONE;
    }
}