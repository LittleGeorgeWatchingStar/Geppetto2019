import {Path} from "./Path";
import {
    createSpatialIndexer,
    SpatialIndexer
} from "./spatialindexer/SpatialIndexer";
import PathFinder, {FindPathAttributes} from "./PathFinder";

/**
 * Finds a path and moves other paths if necessary by recalculating conflicting paths.
 */
export class PathFinder2 {
    private spatialIndexer: SpatialIndexer; // Excluding paths.
    private existingPathsTable: {[uuid: string]: Path} = {};
    private newValidPaths: Path[];
    private newValidPathsTable: {[uuid: string]: Path} = {};
    private newInvalidPaths: Path[];
    private conflictPaths: {path: Path, conflictPathUuid: string}[];

    public constructor(spatialIndexer: SpatialIndexer, existingPaths: Path[]) {
        // clone spatial indexer;
        this.spatialIndexer = spatialIndexer.clone();

        for (const path of existingPaths) {
            this.existingPathsTable[path.uuid] = path;
        }
    }

    public findPath(attributes: FindPathAttributes): {
        validPaths: Path[];
        invalidPaths: Path[];
    } {
        this.newValidPaths = [];
        this.newValidPathsTable = {};
        this.newInvalidPaths = [];
        this.conflictPaths = [];

        let currentPath = this.findSinglePath(attributes);
        let originalCurrentPath = currentPath;

        while(true) {
            if (currentPath.isComplete) {
                this.newValidPaths.push(currentPath);
                this.newValidPathsTable[currentPath.uuid] = currentPath;
                if ((currentPath = this.getPathToRecalculate()) !== null) {
                    currentPath = this.findSinglePath(currentPath);
                    originalCurrentPath = currentPath;
                } else {
                    for (const path of this.conflictPaths) {
                        this.existingPathsTable[path.path.uuid] = path.path;
                    }
                    break;
                }
            } else {
                if (!this.updateConflictPaths(currentPath)) {
                    this.newInvalidPaths.push(originalCurrentPath);
                    if ((currentPath = this.getPathToRecalculate()) !== null) {
                        currentPath = this.findSinglePath(currentPath);
                        originalCurrentPath = currentPath;
                    } else {
                        for (const path of this.conflictPaths) {
                            this.existingPathsTable[path.path.uuid] = path.path;
                        }
                        break;
                    }
                } else {
                    currentPath = this.findSinglePath(currentPath);
                }
            }
        }
        const validPaths = this.newValidPaths.slice();
        const invalidPaths = this.newInvalidPaths.slice();


        for (const uuid in this.existingPathsTable) {
            const path = this.existingPathsTable[uuid];
            if (path.isComplete) {
                validPaths.push(path);
            } else {
                invalidPaths.push(path);
            }
        }

        return {
            validPaths: validPaths,
            invalidPaths: invalidPaths,
        };
    }

    private updateConflictPaths(currentPath: Path): boolean {
        if (!currentPath.blockingPathNodes.length) {
            return false;
        }
        for (const blockingPath of currentPath.blockingPathNodes) {

            if (this.existingPathsTable.hasOwnProperty(blockingPath.uuid)) {
                const path = this.existingPathsTable[blockingPath.uuid];
                delete this.existingPathsTable[blockingPath.uuid];
                this.conflictPaths.push({path: path, conflictPathUuid: currentPath.uuid});
                return true;
            }
        }

        return false;
    }

    /**
     * Only need to recalculate a conflict path if it's conflicting path is valid.
     */
    private getPathToRecalculate(): Path | null {
        for (let i = 0; i < this.conflictPaths.length; i++) {
            const conflictPathUuid = this.conflictPaths[i].conflictPathUuid;
            const path = this.conflictPaths[i].path;
            if (this.newValidPathsTable.hasOwnProperty(conflictPathUuid)) {
                this.conflictPaths.splice(i, 1);
                return path;
            }
        }
        return null;
    }

    private findSinglePath(attributes: FindPathAttributes): Path {
        const spatialIndexer = createSpatialIndexer().fromJSON(this.spatialIndexer.toJSON());

        const paths = this.newValidPaths.slice();
        for (const uuid in this.existingPathsTable) {
            paths.push(this.existingPathsTable[uuid]);
        }

        spatialIndexer.insertPaths(paths);

        const pathFinder = new PathFinder(spatialIndexer);
        return pathFinder.findPath(attributes);
    }
}