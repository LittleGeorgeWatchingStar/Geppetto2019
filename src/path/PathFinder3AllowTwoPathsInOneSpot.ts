import {PathFinder3} from "./PathFinder3";
import {SpatialIndexer} from "./spatialindexer/SpatialIndexer";
import PathFinder from "./PathFinder";
import PathFinderAllowTwoPathsInOneSpot
    from "./PathFinderAllowTwoPathsInOneSpot";

export class PathFinder3AllowTwoPathsInOneSpot extends PathFinder3 {
    protected createPathFinder(spatialIndexer: SpatialIndexer): PathFinder {
        return new PathFinderAllowTwoPathsInOneSpot(spatialIndexer);
    }
}