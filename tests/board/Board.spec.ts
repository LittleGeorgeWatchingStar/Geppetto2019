import {Board} from "../../src/model/Board";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import makeModule from "../module/TestModule";
import {BoardBuilder} from "./BoardBuilder";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {overrideDesignRevision} from "../design/TestDesign";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";

describe("Board", function () {

    describe("anchors", function () {
        it("creates anchors for each side", function () {
            const board = new BoardBuilder()
                .build();

            expect(board.anchors.length).toEqual(4);
            expect(board.getAnchorByEdge('top')).toBeDefined();
            expect(board.getAnchorByEdge('right')).toBeDefined();
            expect(board.getAnchorByEdge('bottom')).toBeDefined();
            expect(board.getAnchorByEdge('left')).toBeDefined();
        });

        it("matches the board size", function () {
            const board = new BoardBuilder()
                .withWidth(150)
                .withHeight(100)
                .build();

            expect(board.getAnchorByEdge('top').boardY).toEqual(100);
            expect(board.getAnchorByEdge('right').boardX).toEqual(150);
            expect(board.getAnchorByEdge('bottom').boardY).toEqual(0);
            expect(board.getAnchorByEdge('left').boardX).toEqual(0);
        });

        it("matches the board size when board is resized", function () {
            const board = new BoardBuilder()
                .withWidth(150)
                .withHeight(100)
                .build();
            board.resize(250, 150);

            expect(board.getAnchorByEdge('top').boardY).toEqual(150);
            expect(board.getAnchorByEdge('right').boardX).toEqual(250);
            expect(board.getAnchorByEdge('bottom').boardY).toEqual(0);
            expect(board.getAnchorByEdge('left').boardX).toEqual(0);
        });
    });

    it('has a price', function () {
        const board = new BoardBuilder().build();
        const price = board.getPrice();
        expect(price > 0).toBe(true);
    });

    it('has a price that scales with its size', function () {
        const smallerBoard = new BoardBuilder().withWidth(100).withHeight(100).build();
        const biggerBoard = new BoardBuilder().withWidth(200).withHeight(200).build();
        expect(smallerBoard.getPrice() < biggerBoard.getPrice()).toBe(true);
    });

    describe("isOutOfBounds", function () {

        let b: Board;

        beforeEach(function () {
            b = new BoardBuilder()
                .withWidth(240)
                .withHeight(90)
                .withPosition(0, 0)
                .withRadius(1)
                .build();
        });

        /**
         * Each module is 3x3
         */
        function makePm(x, y): PlacedModule {
            return new PlacedModuleBuilder()
                .withModule(makeModule())
                .withPosition(x, y)
                .build();
        }

        it('is false if module is contained', function () {
            const pm = makePm(30, 45);
            expect(b.isOutOfBounds(pm)).toBe(false);
        });
        it('is false if module is on the edge', function () {
            const pm = makePm(0, 45);
            expect(b.isOutOfBounds(pm)).toBe(false);
        });
        it('is true if module is over the top edge', function () {
            const pm = makePm(30, -1);
            expect(b.isOutOfBounds(pm)).toBe(true);
        });
        it('is true if module is over the bottom edge', function () {
            const pm = makePm(30, 99);
            expect(b.isOutOfBounds(pm)).toBe(true);
        });
        it('is true if module is off the left edge', function () {
            const pm = makePm(-10, 10);
            expect(b.isOutOfBounds(pm)).toBe(true);
        });
        it('is true if module is off the right edge', function () {
            const pm = makePm(250, 20);
            expect(b.isOutOfBounds(pm)).toBe(true);
        });
        it('is true if the module is off the corner radius', function() {
            const pm = makePm(0, 0);
            expect(b.isOutOfBounds(pm)).toBe(true);
        });
        it('is false if the module is touching the corner radius', function () {
            const pm = makePm(1, 1);
            expect(b.isOutOfBounds(pm)).toBe(false);
        });
    });

    describe("resize", function () {
        it("propagates resize for left edge", function () {
            const designRev = overrideDesignRevision();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(100,100)
                .build();

            const dim = designRev.addDimensionFromAttributes({
                anchor1: board.getAnchorByEdge('left'),
                anchor2: pm.getAnchorByEdge('left'),
            });
            dim.toggleLocked();
            board.resizeLinkedByEdge('left',50 , 0);

            expect(pm.position.x).toEqual(150);
            expect(pm.position.y).toEqual(100);
        });

        it("propagates resize for top edge", function () {
            const designRev = overrideDesignRevision();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(100,100)
                .build();

            const dim = designRev.addDimensionFromAttributes({
                anchor1: board.getAnchorByEdge('top'),
                anchor2: pm.getAnchorByEdge('top'),
            });
            dim.toggleLocked();
            board.resizeLinkedByEdge('top',0 , 50);

            expect(pm.position.x).toEqual(100);
            expect(pm.position.y).toEqual(150);
        });

        it("propagates resize for right edge", function () {
            const designRev = overrideDesignRevision();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(100,100)
                .build();

            const dim = designRev.addDimensionFromAttributes({
                anchor1: board.getAnchorByEdge('right'),
                anchor2: pm.getAnchorByEdge('right'),
            });
            dim.toggleLocked();
            board.resizeLinkedByEdge('right',50 , 0);

            expect(pm.position.x).toEqual(150);
            expect(pm.position.y).toEqual(100);
        });

        it("propagates resize for bottom edge", function () {
            const designRev = overrideDesignRevision();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(100,100)
                .build();

            const dim = designRev.addDimensionFromAttributes({
                anchor1: board.getAnchorByEdge('bottom'),
                anchor2: pm.getAnchorByEdge('bottom'),
            });
            dim.toggleLocked();
            board.resizeLinkedByEdge('bottom',0 , 50);

            expect(pm.position.x).toEqual(100);
            expect(pm.position.y).toEqual(150);
        });
    });

    describe("Align block to edges", function () {
        it("returns the correct distance from the left edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(100, 100)
                .build();
            expect(design.board.alignLeftDistance(pm)).toEqual(-100);
        });

        it("returns the correct distance from the right edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(100, 100)
                .build();
            const expected = design.board.xMax - 100 - pm.module.getWidth();
            expect(design.board.alignRightDistance(pm)).toEqual(expected);
        });

        it("returns the correct distance from the bottom edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(100, 100)
                .build();
            expect(design.board.alignBottomDistance(pm)).toEqual(-100);
        });

        it("returns the correct distance from the top edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(100, 100)
                .build();
            const expected = design.board.yMax - 100 - pm.module.getHeight();
            expect(design.board.alignTopDistance(pm)).toEqual(expected);
        });
    });

    describe("On edge", function () {
        it("knows when a block is sitting on the left edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(0, 10)
                .build();
            expect(design.board.isOnEdge(pm)).toBe(true);
        });

        it("knows when a block is sitting on the right edge", function () {
            const design = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withDesignRevision(design)
                .withPosition(design.board.xMax - module.getWidth(), 10)
                .build();
            expect(design.board.isOnEdge(pm)).toBe(true);
        });

        it("knows when a block is sitting on the bottom edge", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(10, 0)
                .build();
            expect(design.board.isOnEdge(pm)).toBe(true);
        });

        it("knows when a block is sitting on the top edge", function () {
            const design = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withDesignRevision(design)
                .withPosition(10, design.board.yMax - module.getHeight())
                .build();
            expect(design.board.isOnEdge(pm)).toBe(true);
        });
    });

    describe("In corner", function () {
        it("knows when a block is in the bottom left corner", function () {
            const design = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(design)
                .withPosition(0, 0)
                .build();
            expect(design.board.isInCorner(pm)).toBe(true);
        });

        it("knows when a block is in the bottom right corner", function () {
            const design = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withDesignRevision(design)
                .withPosition(design.board.xMax - module.getWidth(), 0)
                .build();
            expect(design.board.isInCorner(pm)).toBe(true);
        });

        it("knows when a block is in the top left corner", function () {
            const design = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withDesignRevision(design)
                .withPosition(0, design.board.yMax - module.getHeight())
                .build();
            expect(design.board.isInCorner(pm)).toBe(true);
        });

        it("knows when a block is in the top right corner", function () {
            const design = new DesignRevisionBuilder().build();
            const module = new ModuleBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withDesignRevision(design)
                .withPosition(design.board.xMax - module.getWidth(), design.board.yMax - module.getHeight())
                .build();
            expect(design.board.isInCorner(pm)).toBe(true);
        });
    });
});
