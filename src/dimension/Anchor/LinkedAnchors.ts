import {Anchor} from "./Anchor";

/**
 * Class that helps determine whether an anchor is directly or indirectly locked
 * with another anchor
 */
export class LinkedAnchors {
    private _anchors: { [uuid: string]: Anchor } = {};

     constructor(anchor?: Anchor) {
        if (anchor) {
            this._anchors[anchor.uuid] = anchor;
        }
    }

    public forEach(callback: (anchor: Anchor, uuid: string) => void) {
        const anchors = this._anchors;
        for(const uuid in anchors) {
            const anchor = anchors[uuid];
            callback(anchor, uuid);
        }
    }

    public get length(): number {
        return Object.keys(this._anchors).length;
    }

    public add(anchor: Anchor) {
        this._anchors[anchor.uuid] = anchor;
        if (anchor.linkedAnchors) {
            Object.assign(this._anchors, anchor.linkedAnchors._anchors);
        }
        this.updateInstances();
    }

    /**
     * Updates linked anchors to have the same LinkedAnchors instance
     */
    public updateInstances(): void {
        const anchors = this._anchors;
        for (const uuid in anchors) {
            const anchor = anchors[uuid];
            anchor.linkedAnchors = this;
        }
    }

    public isLinkedTo(anchor: Anchor): boolean {
        return this._anchors.hasOwnProperty(anchor.uuid);
    }

    public getLinkedConstrainedDx(dx: number): number {
        this.forEach((anchor: Anchor) => {
            const anchorDx = anchor.getConstrainedDx(dx);
            if (Math.abs(dx) > Math.abs(anchorDx)) {
                dx = anchorDx;
            }
        });
        return dx;
    }

    public getLinkedConstrainedDy(dy: number): number {
        this.forEach((anchor: Anchor) => {
            const anchorDx = anchor.getConstrainedDy(dy);
            if (Math.abs(dy) > Math.abs(anchorDx)) {
                dy = anchorDx;
            }
        });
        return dy;
    }
}

export function createLinkedAnchors(anchor?: Anchor): LinkedAnchors {
    return new LinkedAnchors(anchor);
}