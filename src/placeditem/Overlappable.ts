import {Polyline} from "../utils/geometry";

/**
 * An object (placed module, placed logo) who can define overlaps with
 * other overlappables.
 */
export interface Overlappable {
    keepouts: Polyline[];
    overlaps(): boolean;
    setOverlaps(overlaps: boolean): void;
    updateOverlaps(others: Overlappable[]): void;
    overlapsWith(others: Overlappable): boolean;
    intersects(other: Polyline): boolean;
    has_moved: boolean;

    equals(other: Overlappable): boolean;
    cid: string;
}
