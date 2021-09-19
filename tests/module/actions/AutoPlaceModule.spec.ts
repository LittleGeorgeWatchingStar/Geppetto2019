import {DesignRevisionBuilder} from "../../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../ModuleBuilder";
import {AutoPlaceModule} from "../../../src/module/actions";
import {makeFootprint} from "../TestModule";
import {Point} from "../../../src/utils/geometry";
import {BuildBoard} from "../../../src/design/boardbuilder/action";

describe("Auto place module", function () {
    it("adds a module", function () {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().build();
        new AutoPlaceModule(module, designRev).execute();
        expect(designRev.hasPlacedItems).toBe(true);
    });

    it("places the first module in a reasonable position", function () {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().build();
        new AutoPlaceModule(module, designRev).execute();
        const placedModule = designRev.getPlacedModules()[0];
        const board = designRev.board;
        expect(board.isOutOfBounds(placedModule)).toBe(false);
    });

    it("does not cause overlaps if there is room", function () {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().build();
        for (let i = 0; i < 3; ++i) {
            new AutoPlaceModule(module, designRev).execute();
        }
        const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
        expect(hasOverlap).toBe(false);
    });

    it("causes the board to expand to match the modules when needed", function () {
        const designRev = new DesignRevisionBuilder().build();
        designRev.board.resize(10, 10);
        const areaBefore = designRev.board.width * designRev.board.height;
        const module = new ModuleBuilder().build();
        for (let i = 0; i < 2; ++i) {
            new AutoPlaceModule(module, designRev).execute();
        }
        const areaAfter = designRev.board.width * designRev.board.height;
        expect(areaAfter).toBeGreaterThan(areaBefore);
    });

    it("places mounting holes in the corners", function () {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().withName('Mounting Hole').build();
        for (let i = 0; i < 4; ++i) {
            new AutoPlaceModule(module, designRev).execute();
        }
        const boardCorners = designRev.board.getCornerPoints(module.getWidth(), module.getHeight());
        let cornersPlaced = 0;
        for (const cornerName in boardCorners) {
            let isCornerOccupied = false;
            for (const placedModule of designRev.getPlacedModules()) {
                const isOnCorner = placedModule.getPlacedPolygons().some(polyline =>
                    polyline.contains(boardCorners[cornerName]));
                if (isOnCorner) {
                    isCornerOccupied = true;
                }
            }
            if (!isCornerOccupied) {
                break;
            }
            ++cornersPlaced;
        }
        expect(cornersPlaced).toEqual(4);
    });

    it("has an appropriate log for the affected module", function () {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().build();
        const action = new AutoPlaceModule(module, designRev);
        expect(action.log).toEqual(`Add ${module.name}`);
    });

    describe("Undo", function () {
        it("removes the module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const action = new AutoPlaceModule(module, designRev);
            action.execute();
            action.reverse();
            expect(designRev.hasPlacedItems).toBe(false);
        });

        it("resets the board to its previous size", function () {
            const designRev = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            designRev.board.resize(10, 10);
            const areaBefore = designRev.board.width * designRev.board.height;
            const action = new AutoPlaceModule(module, designRev);
            action.execute();
            action.reverse();
            const areaAfter = designRev.board.width * designRev.board.height;
            expect(areaAfter).toEqual(areaBefore);
        });
    });

    describe("Edge module", function () {
        it("does not cause overlaps when added consecutively", function () {
            const module = new ModuleBuilder().withFeatures(makeFootprint(300, 50, 'right')).build();
            const designRev = new DesignRevisionBuilder().build();
            new AutoPlaceModule(module, designRev).execute();
            new AutoPlaceModule(module, designRev).execute();
            new AutoPlaceModule(module, designRev).execute();
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
        });
    });
});


describe("Board build", function () {

    const modules = [
        new ModuleBuilder().withFeatures(makeFootprint(20, 200)).build(),
        new ModuleBuilder().withFeatures(makeFootprint(70, 120)).build(),
        new ModuleBuilder().withFeatures(makeFootprint(300, 50)).build(),
        new ModuleBuilder().withFeatures(makeFootprint(120, 130)).build()
    ];

    const edgeModules = [
        new ModuleBuilder().withFeatures(makeFootprint(20, 200, 'bottom')).build(),
        new ModuleBuilder().withFeatures(makeFootprint(70, 120, 'left')).build(),
        new ModuleBuilder().withFeatures(makeFootprint(300, 50, 'right')).build(),
        new ModuleBuilder().withFeatures(makeFootprint(120, 130, 'top')).build()
    ];

    it("anchors mounting holes to the corners", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        const module = new ModuleBuilder().withName('Mounting Hole').build();
        const modules = [];
        for (let i = 0; i < 4; ++i) {
            modules.push(module);
        }
        new BuildBoard(modules, designRev).execute();
        setTimeout(() => {
            designRev.board.expand(100, 100);
            const boardCorners = designRev.board.getCornerPoints(module.getWidth(), module.getHeight());
            let cornersPlaced = 0;
            for (const cornerName in boardCorners) {
                let isCornerOccupied = false;
                for (const placedModule of designRev.getPlacedModules()) {
                    const isOnCorner = placedModule.getPlacedPolygons().some(polyline =>
                        polyline.contains(boardCorners[cornerName]));
                    if (isOnCorner) {
                        isCornerOccupied = true;
                    }
                }
                if (!isCornerOccupied) {
                    break;
                }
                ++cornersPlaced;
            }
            expect(cornersPlaced).toEqual(4);
            done();
        });
    });

    it("can place multiple modules without causing overlaps", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(modules, designRev).execute();
        setTimeout(() => {
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
            done();
        });
    });

    it("orients edge modules to the top edge of the board", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(edgeModules, designRev).execute();
        setTimeout(() => {
            const boardYMax = designRev.board.position.y + designRev.board.height;
            const incorrectlyOriented = designRev.getPlacedModules().find(pm => {
                return pm.yMax !== boardYMax;
            });
            expect(incorrectlyOriented).toBeUndefined();
            done();
        });
    });

    it("doesn't cause overlaps among edge modules", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(edgeModules, designRev).execute();
        setTimeout(() => {
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
            done();
        });
    });

    it("doesn't cause overlaps with a mix of edge and non-edge modules", function (done) {
        const mixedModules = modules.concat(edgeModules);
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(mixedModules, designRev).execute();
        designRev.board.resize(10, 10);
        setTimeout(() => {
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
            done();
        });
    });

    it("doesn't cause overlaps with wider edge modules that are initially oriented sideways", function (done) {
        const edgeModule = new ModuleBuilder().withFeatures(makeFootprint(300, 50, 'left')).build();
        const mixedModules = modules.slice();
        mixedModules.push(edgeModule);
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(mixedModules, designRev).execute();
        setTimeout(() => {
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
            done();
        });
    });

    it("doesn't cause overlaps among edge modules, even when used again", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(edgeModules, designRev).execute();
        new BuildBoard(edgeModules, designRev).execute();
        setTimeout(() => {
            const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
            expect(hasOverlap).toBe(false);
            done();
        });
    });

    it("inserts an edge module between other edge/anchored modules if there is room", function (done) {
        const width = 100;
        const top = new ModuleBuilder().withFeatures(makeFootprint(width, 100, 'top')).build();
        const designRev = new DesignRevisionBuilder().build();
        designRev.addModule(top, new Point(0, 0));
        designRev.addModule(top, new Point(width + 150, 0));
        /**
         * 100 150  100
         * <->|<-->|<->
         *  __|____|__
         * |//|    |//|
         *     ^ The next edge module should go here
         *
         */
        new BuildBoard([top], designRev).execute();
        setTimeout(() => {
            const last = designRev.getPlacedModules()[designRev.getPlacedModules().length - 1];
            expect(last.position.x).toEqual(100);
            done();
        });
    });

    it("places an edge module after the rightmost edge module if there isn't room", function (done) {
        const width = 100;
        const top = new ModuleBuilder().withFeatures(makeFootprint(width, 100, 'top')).build();
        const designRev = new DesignRevisionBuilder().build();
        designRev.addModule(top, new Point(0, 0));
        designRev.addModule(top, new Point(width + 50, 0));
        /**
         * 100 50 100
         * <->|<>|<->
         *  __|__|__
         * |//|  |//|
         *           ^ The next edge module should go here
         */
        new BuildBoard([top], designRev).execute();
        setTimeout(() => {
            const last = designRev.getPlacedModules()[designRev.getPlacedModules().length - 1];
            expect(last.position.x).toEqual(250);
            done();
        });
    });

    it("doesn't cause edge modules to overlap with mounting holes on subsequent builds", function (done) {
        const module = new ModuleBuilder().withName('Mounting Hole').build();
        const top = new ModuleBuilder().withFeatures(makeFootprint(150, 100, 'top')).build();
        const modules = [];
        for (let i = 0; i < 4; ++i) {
            modules.push(module);
        }
        const edges = [];
        for (let i = 0; i < 10; ++i) {
            edges.push(top);
        }
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard(modules, designRev).execute();
        setTimeout(() => {
            new BuildBoard(edges, designRev).execute();
            setTimeout(() => {
                const hasOverlap = designRev.getPlacedModules().some(pm => pm.overlaps());
                expect(hasOverlap).toBe(false);
                done();
            });
        });
    });

    it("can set the board size", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        new BuildBoard([], designRev, 20, 20).execute();
        setTimeout(() => {
            expect(designRev.board.width).toEqual(200); // mm -> Geppetto units
            expect(designRev.board.height).toEqual(200);
            done();
        });
    });

    it("keeps the specified board size even when modules exceed its boundaries", function (done) {
        const designRev = new DesignRevisionBuilder().build();
        const modules = [
            new ModuleBuilder().withFeatures(makeFootprint(300, 50)).build(),
            new ModuleBuilder().withFeatures(makeFootprint(120, 130)).build()
        ];
        new BuildBoard(modules, designRev, 20, 20).execute();
        setTimeout(() => {
            expect(designRev.board.width).toEqual(200);  // mm -> Geppetto units
            expect(designRev.board.height).toEqual(200);
            done();
        });
    });

    it("has a log", function () {
        const designRev = new DesignRevisionBuilder().build();
        const action = new BuildBoard([], designRev, 20, 20);
        expect(action.log).toEqual('Build board');
    });

    describe("Undo", function () {
        it("resets the board size to the previous size", function (done) {
            const designRev = new DesignRevisionBuilder().build();
            // Guarantee that the action will resize the board, by making the board smaller than the modules:
            designRev.board.resize(200, 100);
            const previousWidth = designRev.board.width;
            const previousHeight = designRev.board.height;
            const modules = [
                new ModuleBuilder().withFeatures(makeFootprint(300, 50)).build(),
                new ModuleBuilder().withFeatures(makeFootprint(120, 130)).build()
            ];
            const action = new BuildBoard(modules, designRev);
            action.execute();
            setTimeout(() => {
                action.reverse();
                expect(designRev.board.width).toEqual(previousWidth);
                expect(designRev.board.height).toEqual(previousHeight);
                done();
            });
        });

        it("removes the placed modules added", function (done) {
            const designRev = new DesignRevisionBuilder().build();
            const modules = [
                new ModuleBuilder().withFeatures(makeFootprint(300, 50)).build(),
                new ModuleBuilder().withFeatures(makeFootprint(120, 130)).build()
            ];
            const action = new BuildBoard(modules, designRev);
            action.execute();
            setTimeout(() => {
                action.reverse();
                expect(designRev.getPlacedModules().length).toEqual(0);
                done();
            });
        });
    });

    describe("Redo", function () {
        it("sets the same board size as when it first executed", function (done) {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.resize(200, 100);
            const modules = [
                new ModuleBuilder().withFeatures(makeFootprint(300, 50)).build(),
                new ModuleBuilder().withFeatures(makeFootprint(120, 130)).build()
            ];
            const action = new BuildBoard(modules, designRev);
            action.execute();
            let previousWidth, previousHeight;
            setTimeout(() => {
                previousWidth = designRev.board.width;
                previousHeight = designRev.board.height;
                action.reverse();
                action.execute();
                setTimeout(() => {
                    expect(designRev.board.width).toEqual(previousWidth);
                    expect(designRev.board.height).toEqual(previousHeight);
                    done();
                });
            });
        });
    });
});