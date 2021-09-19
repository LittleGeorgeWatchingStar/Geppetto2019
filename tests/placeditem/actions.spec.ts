import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {PlacedLogoBuilder} from "../placedlogo/PlacedLogoBuilder";
import {MoveBlock} from "../../src/placeditem/actions";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {actions, executeAction} from "../../src/core/action";
import {RemoveModule} from "../../src/module/actions";

describe("MoveBlock", function () {
    describe("move to closest board edge", function () {
        it("can place the block on the left edge", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(10, 15)
                .withDesignRevision(d)
                .build();

            MoveBlock.toBoardEdge(block);
            expect(block.xMin).toEqual(0);
        });

        it("can place the block on the top edge", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(30, 90)
                .withDesignRevision(d)
                .build();

            MoveBlock.toBoardEdge(block);
            expect(block.yMax).toEqual(100);
        });

        it("can place the block on the right edge", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(90, 30)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardEdge(block);
            expect(block.xMax).toEqual(100);
        });

        it("can place the block on the bottom edge", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(20, 5)
                .withDesignRevision(d)
                .build();

            MoveBlock.toBoardEdge(block);
            expect(block.yMin).toEqual(0);
        });
    });

    describe("move to closest corner", function () {
        it("can find the bottom left corner", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(10, 20)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardCorner(block);
            expect(block.xMin).toEqual(0);
            expect(block.yMin).toEqual(0);
        });

        it("can find the bottom right corner", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(90, 20)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardCorner(block);
            expect(block.xMax).toEqual(100);
            expect(block.yMin).toEqual(0);
        });

        it("can find the top left corner", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(10, 90)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardCorner(block);
            expect(block.xMin).toEqual(0);
            expect(block.yMax).toEqual(100);
        });

        it("can find the top right corner", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 20)
                .withPosition(90, 90)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardCorner(block);
            expect(block.xMax).toEqual(100);
            expect(block.yMax).toEqual(100);
        });

        it("works even when the block has been rotated", function () {
            const d = new DesignRevisionBuilder().build();
            d.board.resize(100, 100);
            const block = new PlacedLogoBuilder()
                .withSize(20, 30)
                .withPosition(10, 20)
                .withDesignRevision(d)
                .build();
            MoveBlock.toBoardCorner(block);
            expect(block.xMin).toEqual(0);
            expect(block.yMin).toEqual(0);
        });
    });

    describe("execute", function () {
        it("moves the module to the correct place", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withPosition(10, 20)
                .build();
            const action = new MoveBlock(pm, {x: 20, y: 65});

            action.execute();

            expect(pm.position.x).toEqual(30);
            expect(pm.position.y).toEqual(85);
        });

        it("moves the logo to the correct place", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(10, 20)
                .build();
            const action = new MoveBlock(pl, {x: 20, y: 65});

            executeAction(action);

            expect(pl.position.x).toEqual(30);
            expect(pl.position.y).toEqual(85);
        });

        it("sets overlaps correctly", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();
            const otherPm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(200, 200)
                .build();
            expect(pm.overlapsWith(otherPm)).toBe(false);
            const action = new MoveBlock(pm, {x: 200, y: 200});
            action.execute();
            expect(pm.overlapsWith(otherPm)).toBe(true);
        });
    });

    describe("undo", function () {
        it("puts the module back", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withPosition(10, 20)
                .build();
            const action = new MoveBlock(pm, {x: 20, y: 65});

            executeAction(action);
            actions.undo();

            expect(pm.position.x).toEqual(10);
            expect(pm.position.y).toEqual(20);
        });

        it("sets overlaps correctly", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();
            const otherPm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(200, 200)
                .build();
            const action = new MoveBlock(pm, {x: 200, y: 200});
            executeAction(action);
            actions.undo();
            expect(pm.overlapsWith(otherPm)).toBe(false);
        });

        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withPosition(10, 20)
                .withDesignRevision(designRev)
                .build();

            const moveAction = new MoveBlock(pm, {x: 20, y: 65});
            executeAction(moveAction);
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            actions.undo();

            expect(designRev.getPlacedModules()[0].position.x).toEqual(10);
            expect(designRev.getPlacedModules()[0].position.y).toEqual(20);
        });
    });

    describe("redo", function () {
        it("move the module", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withPosition(10, 20)
                .build();
            const action = new MoveBlock(pm, {x: 20, y: 65});

            executeAction(action);
            actions.undo();

            expect(pm.position.x).toEqual(10);
            expect(pm.position.y).toEqual(20);
            actions.redo();
            expect(pm.position.x).toEqual(30);
            expect(pm.position.y).toEqual(85);
        });
        
        it("overlaps", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();
            const otherPm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(200, 200)
                .build();
            const action = new MoveBlock(pm, {x: 200, y: 200});
            executeAction(action);
            actions.undo();
            expect(pm.overlapsWith(otherPm)).toBe(false);
            actions.redo();
            expect(pm.overlapsWith(otherPm)).toBe(true);
        });

        it("works after an undo-delete and redo", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withPosition(10, 20)
                .withDesignRevision(designRev)
                .build();

            const moveAction = new MoveBlock(pm, {x: 20, y: 65});
            executeAction(moveAction);
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            actions.undo();

            expect(designRev.getPlacedModules()[0].position.x).toEqual(10);
            expect(designRev.getPlacedModules()[0].position.y).toEqual(20);
            actions.redo();
            expect(designRev.getPlacedModules()[0].position.x).toEqual(30);
            expect(designRev.getPlacedModules()[0].position.y).toEqual(85);
        });
    });
});