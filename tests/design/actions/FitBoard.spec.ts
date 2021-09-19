import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {ModuleBuilder} from "../../module/ModuleBuilder";
import {Point} from "../../../src/utils/geometry";
import {FitBoard} from "../../../src/view/actions";
import {makeFootprint} from "../../module/TestModule";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";
import {Board} from "../../../src/model/Board";

describe("Fit board", function () {
    it("fits the board to its modules", function () {
        const designRev = new DesignRevisionBuilder().build();
        const placedModule = designRev.addModule(new ModuleBuilder().build(), {x: 20, y: 20});
        const fitBoard = new FitBoard(designRev);
        fitBoard.execute();
        expect(designRev.board.position).toEqual(new Point(20, 20));
        const pmWidth = placedModule.xMax - placedModule.position.x;
        const pmHeight = placedModule.yMax - placedModule.position.y;
        expect(designRev.board.width).toEqual(pmWidth);
        expect(designRev.board.height).toEqual(pmHeight);
    });

    it("updates the price", function () {
        const designRev = new DesignRevisionBuilder().build();
        designRev.addModule(new ModuleBuilder().build(), {x: 50, y: 50});
        const price = designRev.getBoardPrice();
        const fitBoard = new FitBoard(designRev);
        fitBoard.execute();
        expect(price).not.toEqual(designRev.getBoardPrice());
    });

    it("doesn't fit the board if there are no modules", function () {
        const designRev = new DesignRevisionBuilder().build();
        const widthBefore = designRev.board.width;
        const heightBefore = designRev.board.height;
        const fitBoard = new FitBoard(designRev);
        fitBoard.execute();
        expect(widthBefore).toEqual(designRev.board.width);
        expect(heightBefore).toEqual(designRev.board.height);
    });

    it("can be undone", function () {
        const designRev = new DesignRevisionBuilder().build();
        designRev.addModule(new ModuleBuilder().build(), {x: 20, y: 20});
        const widthBefore = designRev.board.width;
        const heightBefore = designRev.board.height;
        const fitBoard = new FitBoard(designRev);
        fitBoard.execute();
        fitBoard.reverse();
        expect(designRev.board.width).toEqual(widthBefore);
        expect(designRev.board.height).toEqual(heightBefore);
    });

    describe("Corner radius", function () {

        function makeCornerRadiusDesign() {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.setCornerRadius(20);
            designRev.updateMechanical();
            return designRev;
        }

        it("remains the same when resizing to small items, even if unlocked", function () {
            const designRev = makeCornerRadiusDesign();
            designRev.addModule(new ModuleBuilder().build(), {x: 20, y: 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(designRev.board.getCornerRadius()).toEqual(20);
        });

        it("doesn't cause overlaps with left edge module", function () {
            const designRev = makeCornerRadiusDesign();
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200, 'left')).build();
            const pm = designRev.addModule(module, {x: 20, y: 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(designRev.board.isOutOfBounds(pm)).toBe(false);
        });

        it("doesn't cause overlaps with bottom edge module", function () {
            const designRev = makeCornerRadiusDesign();
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200, 'bottom')).build();
            const pm = designRev.addModule(module, {x: 20, y: 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(designRev.board.isOutOfBounds(pm)).toBe(false);
        });

        it("doesn't cause overlaps with right edge module", function () {
            const designRev = makeCornerRadiusDesign();
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200, 'right')).build();
            const pm = designRev.addModule(module, {x: 20, y: 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(designRev.board.isOutOfBounds(pm)).toBe(false);
        });

        it("doesn't cause overlaps with top edge module", function () {
            const designRev = makeCornerRadiusDesign();
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200, 'top')).build();
            const pm = designRev.addModule(module, {x: 20, y: 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(designRev.board.isOutOfBounds(pm)).toBe(false);
        });

        it("doesn't move edges that are already fitted against a module", function () {
            const designRev = makeCornerRadiusDesign();
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200, 'top')).build();
            designRev.addModule(module, {x: 20, y: 20});
            const topEdge = designRev.board.yMax;
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expect(topEdge).toEqual(designRev.board.yMax);
        });

        function expectProperFit(board: Board, pm: PlacedModule): void {
            expect(board.x).toBeCloseTo(pm.xMin - board.radiusOffset);
            expect(board.y).toBeCloseTo(pm.yMin - board.radiusOffset);
            expect(board.yMax).toBeCloseTo(pm.yMax + board.radiusOffset);
            expect(board.xMax).toBeCloseTo(pm.xMax + board.radiusOffset);
        }

        it("works on modules that are off the bottom left of the board", function () {
            const designRev = makeCornerRadiusDesign();
            const board = designRev.board;
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200)).build();
            const pm = designRev.addModule(module, {x: board.x - 20, y: -20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expectProperFit(board, pm);
        });

        it("works on modules that are off the bottom right of the board", function () {
            const designRev = makeCornerRadiusDesign();
            const board = designRev.board;
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200)).build();
            const pm = designRev.addModule(module, {x: board.xMax + 20, y: board.y - 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expectProperFit(board, pm);
        });

        it("works on modules that are off the top right of the board", function () {
            const designRev = makeCornerRadiusDesign();
            const board = designRev.board;
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200)).build();
            const pm = designRev.addModule(module, {x: board.xMax + 20, y: board.yMax + 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expectProperFit(board, pm);
        });

        it("works on modules that are off the top left of the board", function () {
            const designRev = makeCornerRadiusDesign();
            const board = designRev.board;
            const module = new ModuleBuilder().withFeatures(makeFootprint(50, 200)).build();
            const pm = designRev.addModule(module, {x: board.x - 20, y: board.yMax + 20});
            const fitBoard = new FitBoard(designRev);
            fitBoard.execute();
            expectProperFit(board, pm);
        });
    });
});