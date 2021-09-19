import PathFinder, {PathFindNode} from "./PathFinder";
import {
    SpatialIndexer,
    SpatialIndexerIntersectRectangle,
    SpatialIndexerItemType
} from "./spatialindexer/SpatialIndexer";
import {PriorityQueue} from "../core/data-structures/PriorityQueue";

export default class PathFinderAllowIgnores extends PathFinder {
    // Set of Obstacle/Path UUIDs (in this.spatialIndexer) to ignore.
    private ignoredUuids: Set<string>;

    public constructor(spatialIndexer: SpatialIndexer,
                       ignoredUuids: Set<string> = new Set<string>()) {
        super(spatialIndexer);
        this.ignoredUuids = ignoredUuids;
    }

    protected isIntersectsValid(rectangles: SpatialIndexerIntersectRectangle[]): boolean {
        for (const rectangle of rectangles) {
            if (!this.ignoredUuids.has(rectangle.uuid)) {
                return false;
            }
        }

        return true;
    }
}