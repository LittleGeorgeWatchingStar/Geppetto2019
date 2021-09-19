import {PathFinder3, SegmentedPath} from "./PathFinder3";
import {FindPathAttributes} from "./PathFinder";
import {Path} from "./Path";
import {SpatialIndexer} from "./spatialindexer/SpatialIndexer";
import * as _ from "underscore";
import PathFinderAllowIgnores from "./PathFinderAllowIgnores";


/**
 * Same as PathFinder3, but allows a path to conflict with 1 existing path.
 */
export class PathFinder3AllowOnePathConflict extends PathFinder3 {
    // Keeps track of which path should ignore which path.
    // NOTE: For segmented paths this is the original path UUID not the path (start/end) segment's UUID.
    private originalIgnoredUuidsTable: {[uuid: string]: string} = {};
    private ignoredUuidsTable: {[uuid: string]: string} = {};

    /**
     * @param ignoredUuidsTable NOTE: This gets mutated.
     */
    public constructor(spatialIndexer: SpatialIndexer,
                       existingPaths: Path[],
                       ignoredUuidsTable: {[uuid: string]: string}) {
        super(spatialIndexer, existingPaths);
        this.originalIgnoredUuidsTable = ignoredUuidsTable;
        this.ignoredUuidsTable = _.clone(ignoredUuidsTable);
    }

    public findPath(attributes: FindPathAttributes): {
        validPaths: Path[];
        invalidPaths: Path[];
    } {
        const resolved = this.resolvePath(attributes);

        if (!resolved) {
            return {
                validPaths: this.originalExistingPaths,
                invalidPaths: [this.firstAttempt],
            };
        }

        const validPaths = this.newValidPaths.slice();

        for (const uuid in this.existingPathsTable) {
            const path = this.existingPathsTable[uuid];
            validPaths.push(path);
        }

        this.mutateOriginalIgnoredUuidsTable();

        return {
            validPaths: validPaths,
            invalidPaths: [],
        };
    }

    protected mutateOriginalIgnoredUuidsTable(): void {
        for (const uuid in this.originalIgnoredUuidsTable) {
            delete this.originalIgnoredUuidsTable[uuid];
        }
        for (const uuid in this.ignoredUuidsTable) {
            const otherUuid = this.ignoredUuidsTable[uuid];
            this.originalIgnoredUuidsTable[uuid] = otherUuid;
        }
    }

    protected findSinglePath(attributes: FindPathAttributes): Path {
        const spatialIndexer = this.createFindPathSpatialIndexer();

        const pathFinder = new PathFinderAllowIgnores(
            spatialIndexer,
            this.getIgnoredUuidsSet(attributes.uuid));

        return pathFinder.findPath(attributes);
    }

    protected findPathSegment(segmentedPath: SegmentedPath): Path {
        const spatialIndexer = this.createFindPathSpatialIndexer();

        const pathFinder = new PathFinderAllowIgnores(
            spatialIndexer,
            this.getIgnoredUuidsSet(segmentedPath.originalPath.uuid));

        const segmentedPathLength = segmentedPath.startSegment.length + segmentedPath.endSegment.length;
        return pathFinder.findPath({
            uuid: segmentedPath.originalPath.uuid,
            spec: {
                width: segmentedPath.originalPath.spec.width,
                minLength: Math.min(0 , segmentedPath.originalPath.spec.minLength - segmentedPathLength),
                maxLength: segmentedPath.originalPath.spec.maxLength - segmentedPathLength,
            },
            start: segmentedPath.startSegment.end,
            end: segmentedPath.endSegment.start});
    }

    private getIgnoredUuidsSet(uuid: string): Set<string> {
        const set = new Set<string>();

        if (this.ignoredUuidsTable.hasOwnProperty(uuid)) {
            const ignoredUuid = this.ignoredUuidsTable[uuid];
            set.add(ignoredUuid);

            if (!this.existingPathsTable.hasOwnProperty(ignoredUuid)) {
                const segmentedPath = this.segmentedPaths.find(path => path.originalPath.uuid === ignoredUuid);
                if (segmentedPath) {
                    set.add(segmentedPath.startSegment.uuid);
                    set.add(segmentedPath.endSegment.uuid);
                }
            }
        }

        return set;
    }

    protected updateConflictPaths(): boolean {
        const path = this.currentPath;
        if (this.ignoredUuidsTable.hasOwnProperty(path.uuid)) {
            return super.updateConflictPaths();
        }

        if (!path.blockingPathNodes.length) {
            return false;
        }

        for (const blockingPath of path.blockingPathNodes) {
            if (this.existingPathsTable.hasOwnProperty(blockingPath.uuid) &&
                !this.ignoredUuidsTable.hasOwnProperty(blockingPath.uuid)) {
                const newBlockingPath = this.existingPathsTable[blockingPath.uuid];
                this.ignoredUuidsTable[path.uuid] = newBlockingPath.uuid;
                this.ignoredUuidsTable[newBlockingPath.uuid] = path.uuid;
                return true;
            }

            if (this.segmentedPathsTable.hasOwnProperty(blockingPath.uuid)) {
                const segmentedPath = this.segmentedPathsTable[blockingPath.uuid];

                if (!this.ignoredUuidsTable.hasOwnProperty(segmentedPath.originalPath.uuid)) {
                    this.ignoredUuidsTable[path.uuid] = segmentedPath.originalPath.uuid;
                    this.ignoredUuidsTable[segmentedPath.originalPath.uuid] = path.uuid;
                    return true;
                }
            }
        }

        return super.updateConflictPaths();
    }
}
