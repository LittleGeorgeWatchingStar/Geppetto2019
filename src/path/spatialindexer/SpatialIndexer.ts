import {Polyline} from "../../utils/geometry";
import {Path, PathObstacle} from "../Path";
import {RBushSpatialIndexerAdaptor} from "./RBushSpatialIndexerAdaptor";
import {Board} from "../../model/Board";

export interface SpatialIndexer {
    insertBoundary: (board: Board) => this;

    insertObstacles: (obstacles: PathObstacle[]) => this;

    insertPaths: (paths: Path[]) => this;

    removePath: (path: Path) => this;

    collides: (rectangle: Polyline) => boolean;

    /**
     * Returns UUID of intersected items
     */
    intersects: (rectangle: Polyline) => string[];

    /**
     * Returns rectangles of intersected items
     */
    intersectRectangles: (rectangle: Polyline) => SpatialIndexerIntersectRectangle[];

    toJSON: () => any;

    fromJSON: (data: any) => this;

    clone: () => SpatialIndexer;
}

export enum SpatialIndexerItemType {
    BOARD = 'board',
    OBSTACLE = 'obstacle',
    PATH = 'path',
}

export interface SpatialIndexerIntersectRectangle {
    uuid: string;
    type: SpatialIndexerItemType;
    rectangle: Polyline;
    data?: object;
}

export function createSpatialIndexer(): SpatialIndexer {
    return new RBushSpatialIndexerAdaptor();
}