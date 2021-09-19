import {Point, Polyline, Vector2D} from "../utils/geometry";
import {PathSpec} from "../connection/PathSpec";
import {generateUuid} from "../utils/generateUuid";
import {FindPathAttributes} from "./PathFinder";

/**
 * An object that paths need to keepout of (excludes paths itself).
 */
export interface PathObstacle {
    uuid: string;
    pathKeepouts: Polyline[];
    setOverlaps(overlaps: boolean): void;
}

interface PathAttributes {
    uuid?: string;
    spec: PathSpec;
    start: Point;
    end: Point;
    nodes: Vector2D[];
    keepouts: Polyline[];
    isComplete: boolean;
    collisions: Point[];
    collisionWithUuids: string[];
    length: number;
    isTooLong: boolean;
    blockingPathNodes: {uuid: string, nodeIndex: number, distance: number}[];
}

/**
 * A path between two points.
 */
export class Path implements FindPathAttributes {
    // FIND PATH ATTRIBUTES
    readonly uuid: string;
    readonly spec: PathSpec;
    readonly start: Point;
    readonly end: Point;

    // PATH
    readonly nodes: Vector2D[];
    readonly keepouts: Polyline[];

    // VALID INFO
    readonly isComplete: boolean; // If path reaches end.
    readonly collisions: Point[];
    readonly collisionWithUuids: string[]; // UUID of items that are in collision with the path.
    readonly length: number;
    readonly isTooLong: boolean;
    readonly blockingPathNodes: {uuid: string, nodeIndex: number, distance: number}[]; // Array of existing paths that block the traversal of this path, along with the distance to goal.




    public constructor(attributes: PathAttributes) {
        Object.assign(this as Object, attributes);
        if (!this.uuid) {
            this.uuid = generateUuid();
        }
    }

    public static fromObject(object: Object): Path {
        return new Path({
            uuid:  object['uuid'],
            spec: object['spec'],
            start: Point.fromObject(object['start']),
            end: Point.fromObject(object['end']),
            nodes: object['nodes'],
            keepouts: object['keepouts'].map(object => Polyline.fromObject(object)),
            isComplete: object['isComplete'],
            collisions: object['collisions'].map(object => Point.fromObject(object)),
            collisionWithUuids: object['collisionWithUuids'],
            length: object['length'],
            isTooLong: object['isTooLong'],
            blockingPathNodes:  object['blockingPathNodes'],
        });
    }
}
