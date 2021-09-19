import PathFinder, {PathFindNode} from "path/PathFinder";
import {Point} from "utils/geometry";
import {Path, PathObstacle} from "../../src/path/Path";
import {Polyline} from "../../src/utils/geometry";
import {createSpatialIndexer} from "../../src/path/spatialindexer/SpatialIndexer";
import {Board} from "../../src/model/Board";
import {BoardBuilder} from "../board/BoardBuilder";
import {PathSpec} from "../../src/connection/PathSpec";

/**
 * A default pathspec.
 */
const DEFAULT_SPEC = {width: 20, minLength: 0, maxLength: 60};

const DEFAULT_BOUNDARY = new BoardBuilder()
    .withPosition(-1000, -1000)
    .withWidth(2000)
    .withHeight(2000)
    .build();

function findPath(start: Point,
                  end: Point,
                  spec: PathSpec,
                  modules: PathObstacle[],
                  boundary: Board = DEFAULT_BOUNDARY,
                  existingPaths: Path[] = [],
                  uuid: string = 'uuid'): Path {
    const spatialIndexer = createSpatialIndexer()
        .insertBoundary(boundary)
        .insertObstacles(modules)
        .insertPaths(existingPaths);

    const finder = new PathFinder(spatialIndexer);
    // finder.logger = new SvgLogger();
    const path = finder.findPath({
        uuid: uuid,
        spec: spec,
        start: start,
        end: end,
    });
    // console.log(finder.logger.toString());
    return path;
}

function fromNodes(nodes, start, end, spec, modules, boundary: Board = DEFAULT_BOUNDARY): Path | null {
    const spatialIndexer = createSpatialIndexer()
        .insertBoundary(boundary)
        .insertObstacles(modules);

    const finder = new PathFinder(spatialIndexer);
    return finder.fromNodes('uuid', nodes, spec,start, end);
}


function fakePlacedModule(x, y, width, height): PathObstacle {
    return {
        uuid: 'fake-module',
        pathKeepouts: [Polyline.rectangle({x: x, y: y}, width, height)],
        setOverlaps: () => {},
    };
}

describe("PathFinder", () => {
    describe("findPath", () => {
        /**
         * (E)nd is 40 spaces from (S)tart.
         *
         * +   +   +   +   +   +   +   +   +
         *
         * +   +   +   +   +   +---+   +   +
         *                     |   |
         * +---S   +   +   +   E---+   +   +
         * |   |
         * +---+   +   +   +   +   +   +   +
         *
         * 0   +   +   +   +   +   +   +   +
         */
        describe("when unobstructed (wide path)", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);

            it("finds a path", () => {
                const path = findPath(start, end, spec, [s, e]);
                expect(path.isComplete).toBe(true);
            });

            it("finds no collisions", () => {
                const path = findPath(start, end, spec, [s, e]);
                expect(path.collisions.length).toEqual(0);
            });

            it("knows when it is too long", () => {
                const spec = {width: 20, minLength: 0, maxLength: 30};
                const path = findPath(start, end, spec, [s, e]);
                expect(path.isComplete).toBe(false, 'path exists?');
                expect(path.isTooLong).toBe(true, 'not too long?');
            });

            describe("knows the length of the path", () => {
                it("when the goal is just reachable", () => {
                    const spec = {width: 10, minLength: 0, maxLength: 50};
                    const path = findPath(start, end, spec, []);
                    expect(path.isComplete).toBe(true);
                    expect(path.length).toEqual(40);
                });

                it("when the goal is easily reachable", () => {
                    const spec = {width: 10, minLength: 0, maxLength: 100};
                    const path = findPath(start, end, spec, []);
                    expect(path.isComplete).toBe(true);
                    expect(path.length).toEqual(40);
                });
            });

            it("knows the length of a stair-stepping path", () => {
                const spec = {width: 5, minLength: 0, maxLength: 200};
                const path = findPath(new Point(0, 0), new Point(40, 40), spec, []);
                expect(path.isComplete).toBe(true);
                expect(path.length).toEqual(80);
            });

            it("finds long paths in a reasonable time", () => {
                const spec = {width: 5, minLength: 0, maxLength: 2000};
                const path = findPath(new Point(0, 0), new Point(320, 100), spec, []);
                expect(path.isComplete).toBe(true);
            });

            describe("when end point is not on the grid", () => {
                const spec = {width: 10, minLength: 0, maxLength: 100};
                const start = new Point(0, 0);
                const end = new Point(25, 0);

                it("finds the path", () => {
                    const path = findPath(start, end, spec, []);
                    expect(path.isComplete).toBe(true, 'path does not exist');
                });

                it("has correct length", () => {
                    const path = findPath(start, end, spec, []);
                    expect(path.length).toEqual(25);
                });
            });
        });

        /**
         * (E)nd is 40 spaces from (S)tart.
         *
         * +   +   +   +   +   +   +   +   +
         *
         * +   +   +   +   +   +---+   +   +
         *                     |   |
         * +---S   +   +   +   E---+   +   +
         * |   |
         * +---+   +   +   +   +   +   +   +
         *
         * 0   +   +   +   +   +   +   +   +
         */
        describe("when unobstructed (narrow path)", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 5, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);

            it("finds a path", () => {
                const path = findPath(start, end, spec, [s, e]);
                expect(path.isComplete).toBe(true);
            });

            it("finds no collisions", () => {
                const path = findPath(start, end, spec, [s, e]);
                expect(path.collisions.length).toEqual(0);
            });
        });

        /**
         * (E)nd is 40 spaces from (S)tart, but the gap between A and B
         * is too narrow for the default spec.
         *
         * +   +   +   +   +   +   +   +   +
         *
         * +   +   +   +---+   +   +   +   +
         *             | A |
         * +   S   +   +---+   E   +   +   +
         *
         * +   +   +   +---+   +   +   +   +
         *             | B |
         * O   +   +   +---+   +   +   +   +
         */
        describe("when obstructed", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = DEFAULT_SPEC;

            const a = fakePlacedModule(30, 20, 10, 10);
            const b = fakePlacedModule(30, 0, 10, 10);

            it("determines that there is no path", () => {
                const path = findPath(start, end, spec, [a, b]);
                expect(path.isComplete).toBe(false);
            });

            it("finds collisions", () => {
                const path = findPath(start, end, spec, [a, b]);
                expect(path.collisions.length).toBeGreaterThan(0);
            });

            it("finds the path outline", () => {
                const path = findPath(start, end, spec, [a, b]);
                expect(path.keepouts.length).toBeGreaterThan(0);
            });

            it("stays within the board boundaries", () => {
                const spec = {minLength: 0, maxLength: 100, width: 20};
                const boundary = new BoardBuilder()
                    .withPosition(0 , 0)
                    .withWidth(50)
                    .withHeight(30)
                    .build();
                const path = findPath(start, end, spec, [a, b], boundary);
                expect(path.isComplete).toBe(false);
            });
        });

        /**
         * The path must route around the starting module S.
         *
         * The correct answer is shown with arrows (< > ^ v).
         *
         * + > + > + > + > + > +   +   +   +
         * ^                   v
         * +   +---+   +   +---E   +   +   +
         * ^   |   |       |   |
         * + < S   |   +   +---+   +   +   +
         *     +----
         * +   +   +   +---+   +   +   +   +
         *             | B |
         * O   +   +   +---+   +   +   +   +
         */
        describe("when obstructed by its own module", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 30);
            const spec = {width: 10, minLength: 0, maxLength: 100};

            const s = fakePlacedModule(10, 15, 10, 15);
            const e = fakePlacedModule(40, 20, 10, 10);
            const b = fakePlacedModule(30, 0, 10, 10);

            it("finds a path", () => {
                const path = findPath(start, end, spec, [s, b, e]);
                expect(path.isComplete).toBe(true);
            });
        });

        /**
         * The start point S of module S is completed blocked by module A
         * because the gap is too narrow. No solution is possible.
         *
         * +   +   +   +   +   +   +   +   +
         *
         * +---+ +-+---+   +   +   +   +   +
         * |S  | |A    |
         * +   S | +   +   +   +   +   +   +
         * |   | |     |
         * +---+ +-+---+   +   +   +   +   +
         *
         * 0   10  20  30  +   +   +   +   +
         */
        describe("when there is no solution", () => {
            const start = new Point(10, 20);
            const s = fakePlacedModule(0, 10, 10, 20);
            const e = fakePlacedModule(15, 10, 15, 20);

            it("fails quickly when the length limit is long", () => {
                const end = new Point(135, -240);
                const spec = {width: 10, minLength: 0, maxLength: 2000};
                const path = findPath(start, end, spec, [s, e]);
                expect(path.isComplete).toBe(false);
            });

            it("fails nicely when no solutions can be generated", () => {
                // Zero-area boundary
                const boundary = new BoardBuilder()
                    .withPosition(0 , 0)
                    .withWidth(0)
                    .withHeight(0)
                    .build();
                const start = new Point(0, 0);
                const end = new Point(100, 100); // clearly out of bounds
                const modules = [];
                const path = findPath(start, end, DEFAULT_SPEC, modules, boundary);
                expect(path.isComplete).toBe(false);
            });
        });

        /**
         * o is origin of the circle
         *
         * +   +   +   + ~ .
         *         S >   >   *
         * +   +---+---+---+  `
         *     |           |   \
         * +   +   +   o   +   +
         *     |           |
         * +   +   +   +   + E +
         *     |           |
         * +   O---+---+---+   +
         *
         * +   +   +   +   +   +
         */
        describe("when boundary contains circles", () => {
            it("circle cuts off path", () => {
                const boundary = new BoardBuilder()
                    .withPosition(0 , 0)
                    .withWidth(50)
                    .withHeight(50)
                    .withRadius(20)
                    .build();
                const start = new Point(20, 40);
                const end = new Point(40, 20);
                const spec = {width: 5, minLength: 0, maxLength: 100};
                const a = fakePlacedModule(10, 10, 30, 30);
                const path = findPath(start, end, spec, [a], boundary);
                expect(path.isComplete).toBe(false);
            });
        });

        /**
         * The boundary doesn't give enough room for the path
         *
         * +   +   +
         *
         * +   E   +
         *     ^
         * +   ^   +
         *     ^
         * +   ^   +
         *     ^
         * +   ^   +
         *     ^
         * +   S   +
         *
         * O   +   +
         */
        describe("when obstructed by the boundary", () => {
            const boundary = new BoardBuilder()
                .withPosition(0 , 0)
                .withWidth(20)
                .withHeight(60)
                .build();
            const start = new Point(10, 10);
            const end = new Point(10, 50);
            const modules = [];
            // path is 1 unit too wide
            const spec = {width: 21, minLength: 0, maxLength: 100};
            it("does not find a path", () => {
                const path = findPath(start, end, spec, modules, boundary);
                expect(path.isComplete).toBe(false);
            });
        });


        /**
         * Existing path = X
         * New path = #
         *
         * +   +   +   +   +
         *
         * +   +   +   +   +
         *
         * X X X X X X X X X
         *         #
         * +   +   #   +   +
         *         #
         * O   +   #   +   +
         */
        describe('blockingPathNodes', () => {
            it('records it correctly', () => {
                const boundary = new BoardBuilder()
                    .withPosition(0 , 0)
                    .withWidth(40)
                    .withHeight(40)
                    .build();

                const otherPath = findPath(
                    new Point(0, 35),
                    new Point(40, 35),
                    {width: 5, minLength: 0, maxLength: 100},
                    [],
                    boundary,
                    [],
                    'other'
                );

                const existingPath = findPath(
                    new Point(0, 20),
                    new Point(40, 20),
                    {width: 5, minLength: 0, maxLength: 100},
                    [],
                    boundary,
                    [],
                    'existing'
                );

                const path = findPath(
                    new Point(20, 0),
                    new Point(20, 40),
                    {width: 5, minLength: 0, maxLength: 100},
                    [],
                    boundary,
                    [otherPath, existingPath]
                );

                expect(path.isComplete).toEqual(false);
                expect(path.nodes.length).toEqual(4);
                expect(path.blockingPathNodes.length).toEqual(7);

                let dist = 0;
                path.blockingPathNodes.forEach(node => {
                    expect(node.uuid).toEqual('existing');
                    expect(node.distance).toBeGreaterThanOrEqual(dist); // Sorted by distance.
                    dist = node.distance;
                });

                expect(path.blockingPathNodes[0].nodeIndex).toEqual(5);
            });
        });
    });
    describe("fromNodes", () => {
        /**
         * (E)nd is 40 spaces from (S)tart.
         *
         * +   +   +   +   +   +   +   +   +
         *
         * +   +   +   +   +   +---+   +   +
         *                     |   |
         * +---S > + > + > + > E---+   +   +
         * |   |
         * +---+   +   +   +   +   +   +   +
         *
         * 0   +   +   +   +   +   +   +   +
         */
        it("makes a valid path", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);

            const nodes = [
                {x: 50, y: 20},
                {x: 30, y: 20},
                {x: 10, y: 20},
            ];
            const path = fromNodes(nodes, start, end, spec, [s, e]);
            expect(path).not.toBeNull();
            expect(path.isComplete).toEqual(true);
            expect(path.collisions.length).toEqual(0);
            expect(path.nodes.length).toEqual(3);
            expect(path.keepouts.length).toEqual(3);
            expect(path.keepouts[0].toString()).toEqual('(40,10), (60,10), (60,30), (40,30)');
            expect(path.keepouts[1].toString()).toEqual('(20,10), (40,10), (40,30), (20,30)');
            expect(path.keepouts[2].toString()).toEqual('(0,10), (20,10), (20,30), (0,30)');
        });

        it("can still make a complete path if obstructed, but has correct collisions", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);
            const obstruction = fakePlacedModule(25, 0, 10, 40);

            const nodes = [
                {x: 50, y: 20},
                {x: 30, y: 20},
                {x: 10, y: 20},
            ];
            const path = fromNodes(nodes, start, end, spec, [s, e, obstruction]);
            expect(path).not.toBeNull();
            expect(path.isComplete).toEqual(true);
            expect(path.collisions.length).toEqual(4);
            expect(path.nodes.length).toEqual(3);
            expect(path.keepouts.length).toEqual(3);
        });

        it("makes a incomplete path if doesn't reach end", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);

            const nodes = [
                {x: 30, y: 20},
                {x: 10, y: 20},
            ];
            const path = fromNodes(nodes, start, end, spec, [s, e]);
            expect(path).not.toBeNull();
            expect(path.isComplete).toEqual(false);
        });

        it("returns null if start doesn't match spec", () => {
            const start = new Point(11, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);
            const obstruction = fakePlacedModule(30, 0, 40, 20);

            const nodes = [
                {x: 50, y: 20},
                {x: 30, y: 20},
                {x: 10, y: 20},
            ];
            const path = fromNodes(nodes, start, end, spec, [s, e, obstruction]);
            expect(path).toBeNull();
        });
        it("returns null if node spacing is too big", () => {
            const start = new Point(10, 20);
            const end = new Point(50, 20);
            const spec = {width: 20, minLength: 0, maxLength: 60};

            const s = fakePlacedModule(0, 10, 10, 10);
            const e = fakePlacedModule(50, 20, 10, 10);
            const obstruction = fakePlacedModule(30, 0, 40, 20);

            const nodes = [
                {x: 50, y: 20},
                {x: 31, y: 20},
                {x: 20, y: 20},
            ];
            const path = fromNodes(nodes, start, end, spec, [s, e, obstruction]);
            expect(path).toBeNull();
        });
    });
});


describe("PathNode", () => {
    const start = new Point(0, 0);
    const goal = new Point(8, 0);
    const spec = {width: 2, minLength: 2, maxLength: 12};

    describe('createSuccessor', () => {
        it("knows its length", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.lengthToStart).toEqual(0);

            node = node.createSuccessorWithGridSize(new Point(2.5, 0), 2.5);
            expect(node.lengthToStart).toEqual(2.5);

            // backtracking?
            node = node.createSuccessorWithGridSize(new Point(1.5, 0), 1);
            expect(node.lengthToStart).toEqual(3.5);
        });

        it("knows when it is too long", () => {
            // length (0) + distanceToGoal (8) = 8 < 12
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.isTooLong).toBe(false);

            // length (2.1) + distanceToGoal (10.1) = 12.2 > 12
            node = node.createSuccessorWithGridSize(new Point(-2.1, 0), 2.1);
            expect(node.isTooLong).toBe(true);
        });

        it("knows when it is complete", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.isComplete).toBe(false);

            node = node.createSuccessorWithGridSize(new Point(4, 2), Math.hypot(4, 2));
            expect(node.isComplete).toBe(false);

            node = node.createSuccessorWithGridSize(new Point(8, 0), Math.hypot(4, -2));
            expect(node.isComplete).toBe(true);
        });

        it("knows the distance to the goal", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.distanceToGoal).toEqual(8);

            node = node.createSuccessorWithGridSize(new Point(2.5, 0), 2.5);
            expect(node.distanceToGoal).toEqual(5.5);

            // backtracking?
            node = node.createSuccessorWithGridSize(new Point(1.5, 0), 1);
            expect(node.distanceToGoal).toEqual(6.5);
        });
    });
    describe('createPathEnd', () => {
        it("knows its length", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.lengthToStart).toEqual(0);

            node = node.createSuccessor(new Point(2.5, 0));
            expect(node.lengthToStart).toEqual(2.5);

            // backtracking?
            node = node.createSuccessor(new Point(1.5, 0));
            expect(node.lengthToStart).toEqual(3.5);
        });

        it("knows when it is too long", () => {
            // length (0) + distanceToGoal (8) = 8 < 12
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.isTooLong).toBe(false);

            // length (2.1) + distanceToGoal (10.1) = 12.2 > 12
            node = node.createSuccessor(new Point(-2.1, 0));
            expect(node.isTooLong).toBe(true);
        });

        it("knows when it is complete", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.isComplete).toBe(false);

            node = node.createSuccessor(new Point(4, 2));
            expect(node.isComplete).toBe(false);

            node = node.createSuccessor(new Point(8, 0));
            expect(node.isComplete).toBe(true);
        });

        it("knows the distance to the goal", () => {
            let node = PathFindNode.initial(spec, start, goal);
            expect(node.distanceToGoal).toEqual(8);

            node = node.createSuccessor(new Point(2.5, 0));
            expect(node.distanceToGoal).toEqual(5.5);

            // backtracking?
            node = node.createSuccessor(new Point(1.5, 0));
            expect(node.distanceToGoal).toEqual(6.5);
        });
    });
});
