import {Point} from "../utils/geometry";
import {Path} from "../path/Path";
import {createSpatialIndexer} from "../path/spatialindexer/SpatialIndexer";
import PathFinder from "../path/PathFinder";
import {PathFinder3AllowOnePathConflict} from "../path/PathFinder3AllowOnePathConflict";
import {PathFinder3AllowTwoPathsInOneSpot} from "../path/PathFinder3AllowTwoPathsInOneSpot";

const ctx: Worker = self as any;

ctx.onmessage = event => {
    const startTime = performance.now();
    const data = JSON.parse(event.data);

    const pathsCanCross: boolean = data.pathsCanCross;

    const pathsConflictMethod: boolean = data.pathsConflictMethod;

    const spatialIndexer = createSpatialIndexer();
    spatialIndexer.fromJSON(data.spatialIndexTreeData);

    const existingPaths = data.existingPaths.map(object => {
        return Path.fromObject(object);
    });

    const ignoredUuidsTable = data.ignoredUuidsTable;

    let paths;
    if (pathsCanCross) {
        paths = [];
        for (const findPathAttrObj of data.findPathAttributes) {
            const findPathAttr = {
                uuid: findPathAttrObj.uuid,
                spec: findPathAttrObj.spec,
                start: Point.fromObject(findPathAttrObj.start),
                end: Point.fromObject(findPathAttrObj.end),
            };


            const pathfinder = new PathFinder(spatialIndexer);
            const path = pathfinder.findPath(findPathAttr);
            paths.push(path);
        }

    } else {
        let validPaths = existingPaths.slice();
        const invalidPaths = [];

        for (const findPathAttrObj of data.findPathAttributes) {
            const findPathAttr = {
                uuid: findPathAttrObj.uuid,
                spec: findPathAttrObj.spec,
                start: Point.fromObject(findPathAttrObj.start),
                end: Point.fromObject(findPathAttrObj.end),
            };

            const pathFinder = pathsConflictMethod ?
                new PathFinder3AllowTwoPathsInOneSpot(spatialIndexer, validPaths) :
                new PathFinder3AllowOnePathConflict(spatialIndexer, validPaths, ignoredUuidsTable);

            const newPaths = pathFinder.findPath(findPathAttr);

            validPaths = newPaths.validPaths;
            invalidPaths.push(...newPaths.invalidPaths);
        }

        paths = validPaths.slice();
        paths.push(...invalidPaths);
    }

    postMessage(JSON.stringify({
        paths: paths,
        ignoredUuidsTable: ignoredUuidsTable,
        runtime: performance.now() - startTime,
    }));

    close();
};

export default null as any;