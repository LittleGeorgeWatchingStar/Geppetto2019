import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import PathFinder from "../../src/path/PathFinder";
import {ConnectionPath} from "../../src/connection/ConnectionPath";
import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {DesignRevision} from "../../src/design/DesignRevision";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Connection} from "../../src/connection/Connection";
import {FootprintBuilder} from "../module/feature/FootprintBuilder";
import {
    createSpatialIndexer,
    SpatialIndexer
} from "../../src/path/spatialindexer/SpatialIndexer";

let spatialIndexer: SpatialIndexer;
let requirer: PlacedModule;
let provider: PlacedModule;
let connection: Connection;

/**
 * +   +   +   +   +   +   +   +---+---+---+
 *                             |           |
 * +   +   +   +   +   +   +   +   +   +   +
 *                             |           |
 * +   +   +   +   +   +   +   +   +   +   +
 *                             |           |
 * +---+---+---S   +   +   +   E---+---+---+
 * |           |
 * +   +   +   +   +   +   +   +   +   +   +
 * |           |
 * +   +   +   +   +   +   +   +   +   +   +
 * |           |
 * 0---+---+---+   +   +   +   +   +   +   +
 */
function makePath(designRev: DesignRevision): ConnectionPath {
    requirer = designRev.addModule(
        new ModuleBuilder()
            .withFeatures(
                new FootprintBuilder().rectangle(30,30).build()
            )
            .build(),
        {x: 0, y: 0});
    const require = makeRequireBus(requirer, {
        proximity_point: {x: 30, y: 30},
    });

    provider = designRev.addModule(
        new ModuleBuilder()
        .withFeatures(
            new FootprintBuilder().rectangle(3,3).build()
        )
        .build(),
        {x: 70, y: 30});
    const provide = makeProvideBus(provider, {
        proximity_point: {x: 0, y: 0},
        path_width: 20,
        min_path_length: 0,
        max_path_length: 120,
    });
    connection = designRev.addConnectionFromBuses(require, provide);

    spatialIndexer = createSpatialIndexer()
        .insertBoundary(designRev.board)
        .insertObstacles(designRev.getPlacedModules());

    const path = new PathFinder(spatialIndexer)
        .findPath({
            uuid: 'uuid',
            spec: connection.pathSpec,
            start: connection.startPoint,
            end: connection.endPoint
        });

    return new ConnectionPath(connection, path);
}

function makeProvideBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new ProvideBus(attributes);
}

function makeRequireBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new RequireBus(attributes);
}

describe("ConnectionPath", () => {
    it("generates correct JSON", () => {
        const path = makePath(new DesignRevisionBuilder().build());
        const json = path.toJSON();
        expect(json).toEqual({
            nodes: [
                {x: 70, y: 30},
                {x: 50, y: 30},
                {x: 30, y: 30},
            ]
        });
    });
    it("generates correct resource", () => {
        const path = makePath(new DesignRevisionBuilder().build());
        const resource = path.toResource();
        expect(resource).toEqual({
            nodes: [
                {x: 70, y: 30},
                {x: 50, y: 30},
                {x: 30, y: 30},
            ]
        });
    });
    describe("requiresChange", () => {
        it("return false if is valid and nothing changed", function () {
            const designRev = new DesignRevisionBuilder().build();
            const path = makePath(designRev);
            expect(path.isValid).toEqual(true);
            expect(path.requiresChange(spatialIndexer)).toEqual(false);
        });
        it("return true if start point moved", () => {
            const designRev = new DesignRevisionBuilder().build();
            const path = makePath(designRev);
            requirer.translateLinked(1, 0);
            expect(path.requiresChange(spatialIndexer)).toEqual(true);
        });
        it("return true if end point moved", () => {
            const designRev = new DesignRevisionBuilder().build();
            const path = makePath(designRev);
            provider.translateLinked(1, 0);
            expect(path.requiresChange(spatialIndexer)).toEqual(true);
        });
        it("return true if an obstacle conflicts with it", () => {
            const designRev = new DesignRevisionBuilder().build();
            const path = makePath(designRev);
            const newObstacle = designRev.addModule(
                new ModuleBuilder()
                    .withFeatures(
                        new FootprintBuilder().rectangle(20,20).build()
                    )
                    .build(),
                {x: 40, y: 20});
            spatialIndexer.insertObstacles([newObstacle]);
            expect(path.requiresChange(spatialIndexer)).toEqual(true);
        });
        it("return true if it becomes out of bounds", () => {
            const designRev = new DesignRevisionBuilder().build();
            const path = makePath(designRev);
            designRev.board.resize(50, designRev.board.height);

            const updatedSpatialIndexer = createSpatialIndexer()
                .insertBoundary(designRev.board)
                .insertObstacles(designRev.getPlacedModules());
            expect(path.requiresChange(updatedSpatialIndexer)).toEqual(true);
        });
        it("return true if path is not valid", () => {
            const designRev = new DesignRevisionBuilder().build();
            const conflictObstacle = designRev.addModule(
                new ModuleBuilder()
                    .withFeatures(
                        new FootprintBuilder().rectangle(40,40).build()
                    )
                    .build(),
                {x: 20, y: 20});
            const path = makePath(designRev);
            expect(path.isValid).toEqual(false);
            expect(path.requiresChange(spatialIndexer)).toEqual(true);
        });
    });
});
