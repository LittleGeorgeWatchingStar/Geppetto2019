import PathFinder from "./PathFinder";
import {
    SpatialIndexerIntersectRectangle,
    SpatialIndexerItemType
} from "./spatialindexer/SpatialIndexer";

export default class PathFinderAllowTwoPathsInOneSpot extends PathFinder {
    protected isIntersectsValid(rectangles: SpatialIndexerIntersectRectangle[]): boolean {
        let otherPathUuid: String | null = null;
        for (const rectangle of rectangles) {
            if (rectangle.type == SpatialIndexerItemType.PATH) {
                if (otherPathUuid == null) {
                    otherPathUuid = rectangle.uuid;
                } else if (otherPathUuid != rectangle.uuid){
                    return false;
                }

            } else {
                return false;
            }
        }
        return true;
    }
}