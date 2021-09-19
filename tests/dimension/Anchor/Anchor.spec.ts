import {FeatureBuilder} from "../../module/feature/FeatureBuilder";
import {ModuleAnchorBuilder} from "./ModuleAnchorBuilder";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";
import {Point} from "../../../src/utils/geometry";
import {DesignRevisionBuilder} from "../../design/DesignRevisionBuilder";
import {Board} from "../../../src/model/Board";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";
import {LinkedAnchors} from "../../../src/dimension/Anchor/LinkedAnchors";
import {PlacedLogoBuilder} from "../../placedlogo/PlacedLogoBuilder";

describe("Anchor", function () {
    it("knows when it's an edge constraint", function () {
        const edgeFeature = FeatureBuilder.edge();
        const edgeAnchor = new ModuleAnchorBuilder()
            .withFeature(edgeFeature)
            .build();

        expect(edgeAnchor.isEdgeConstraint()).toEqual(true);
    });

    describe("equals", function () {
        it("is equal to itself", function () {
            const pm = new PlacedModuleBuilder().build();
            const anchor1 = new ModuleAnchorBuilder().withDimensionable(pm).build();
            expect(anchor1.equals(anchor1)).toEqual(true);
        });

        it("knows when anchors are equal", function () {
            const pm = new PlacedModuleBuilder().build();
            const anchor1 = new ModuleAnchorBuilder().withDimensionable(pm).build();
            const anchor2 = new ModuleAnchorBuilder().withDimensionable(pm).build();
            expect(anchor1.equals(anchor2)).toEqual(true);
        });

        it("is not equal if anchors have different points", function () {
            const pm = new PlacedModuleBuilder().build();
            const anchor1 = new ModuleAnchorBuilder().withDimensionable(pm).build();
            const anchor2 = new ModuleAnchorBuilder().withDimensionable(pm).build();
            anchor1.setPoints(new Point(0, 0), new Point(2, 2));
            anchor2.setPoints(new Point(0, 0), new Point(1, 1));
            expect(anchor1.equals(anchor2)).toEqual(false);
        });

        it("is not equal when anchors have different dimensionables", function () {
            const anchor1 = new ModuleAnchorBuilder().build();
            const anchor2 = new ModuleAnchorBuilder().build();
            expect(anchor1.equals(anchor2)).toEqual(false);
        });
    });

    describe("direction", function () {
       it("knows when it's horizontal", function () {
           const points = [
               {x: 1, y: 0},
               {x: 3, y: 0}
           ];
           const feature = new FeatureBuilder().withPoints(points).build();
           const anchor = new ModuleAnchorBuilder().withFeature(feature).build();
           expect(anchor.isHorizontal()).toEqual(true);
       });

        it("knows when it's vertical", function () {
            const points = [
                {x: 1, y: 0},
                {x: 1, y: 2}
            ];
            const feature = new FeatureBuilder().withPoints(points).build();
            const anchor = new ModuleAnchorBuilder().withFeature(feature).build();
            expect(anchor.isVertical()).toEqual(true);
        });

        it("knows when it is neither", function () {
            const points = [
                {x: 2, y: 0},
                {x: 1, y: 2}
            ];
            const feature = new FeatureBuilder().withPoints(points).build();
            const anchor = new ModuleAnchorBuilder().withFeature(feature).build();
            expect(anchor.isHorizontal()).toEqual(false);
            expect(anchor.isVertical()).toEqual(false);
        });

        it("can be rotated", function () {
            const points = [
                {x: 1, y: 0},
                {x: 1, y: 2}
            ]; // a vertical line
            const feature = new FeatureBuilder().withPoints(points).build();
            const anchor = new ModuleAnchorBuilder().withFeature(feature).build();

            anchor.rotate();
            expect(anchor.isHorizontal()).toEqual(true);
            expect(anchor.isVertical()).toEqual(false);
            expect(anchor.point1.equals(new Point(0, 1))).toEqual(true);
            expect(anchor.point2.equals(new Point(-2, 1))).toEqual(true);
        });
    });

    describe("dimensionable", function () {
        it("knows which dimensionable it belongs to", function () {
            const pm = new PlacedModuleBuilder().build();
            const anchor = new ModuleAnchorBuilder().withDimensionable(pm).build();
            expect(anchor.belongsTo(pm)).toEqual(true);
        });

        it("knows which dimensionable it doesn't belongs to", function () {
            const pm1 = new PlacedModuleBuilder().build();
            const pm2 = new PlacedModuleBuilder().build();
            const anchor = new ModuleAnchorBuilder().withDimensionable(pm1).build();
            expect(anchor.belongsTo(pm2)).toEqual(false);
        });
    });

    describe("linkedAnchors", function () {
        let board: Board;

        let g1pm1: PlacedModule;
        let g1pm2: PlacedModule;

        let g2pm1: PlacedModule;
        let g2pm2: PlacedModule;
        let g2pm3: PlacedModule;

        let g1LinkedAnchors: LinkedAnchors;
        let g2LinkedAnchors: LinkedAnchors;

        beforeEach(function () {
            const designRev = new DesignRevisionBuilder().build();
            board = designRev.board;


            // Group 1
            g1pm1 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            g1pm2 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            designRev.addDimensionFromAttributes({
                anchor1: g1pm1.getAnchorByEdge('left'),
                anchor2: g1pm2.getAnchorByEdge('left'),
            }).toggleLocked();

            // Group 2
            g2pm1 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            g2pm2 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            g2pm3 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            designRev.addDimensionFromAttributes({
                anchor1: g2pm1.getAnchorByEdge('left'),
                anchor2: g2pm2.getAnchorByEdge('left'),
            }).toggleLocked();
            designRev.addDimensionFromAttributes({
                anchor1: g2pm1.getAnchorByEdge('left'),
                anchor2: g2pm3.getAnchorByEdge('left'),
            }).toggleLocked();
            // Only the left anchor for the board will be group 2 because it is resizable
            designRev.addDimensionFromAttributes({
                anchor1: g2pm3.getAnchorByEdge('left'),
                anchor2: board.getAnchorByEdge('left'),
            }).toggleLocked();

            // Get the linked anchors instances after all the dimensions are
            // added, or they new instance will be made while recalculating the
            // linked anchors
            g1LinkedAnchors = g1pm1.getAnchorByEdge('left').linkedAnchors;
            g2LinkedAnchors = g2pm1.getAnchorByEdge('left').linkedAnchors;
        });

        it ("has same linked anchors instance as other linked anchors",function () {
            // All group 1 anchors should have same linkedAnchors instance
            expect(g1LinkedAnchors).toBe(g1pm1.getAnchorByEdge('left').linkedAnchors);
            expect(g1LinkedAnchors).toBe(g1pm1.getAnchorByEdge('right').linkedAnchors);
            expect(g1LinkedAnchors).toBe(g1pm2.getAnchorByEdge('left').linkedAnchors);
            expect(g1LinkedAnchors).toBe(g1pm2.getAnchorByEdge('right').linkedAnchors);

            // All group 2 anchors should have same linkedAnchors instance
            expect(g2LinkedAnchors).toBe(g2pm1.getAnchorByEdge('left').linkedAnchors);
            expect(g2LinkedAnchors).toBe(g2pm1.getAnchorByEdge('right').linkedAnchors);
            expect(g2LinkedAnchors).toBe(g2pm2.getAnchorByEdge('left').linkedAnchors);
            expect(g2LinkedAnchors).toBe(g2pm2.getAnchorByEdge('right').linkedAnchors);
            expect(g2LinkedAnchors).toBe(g2pm3.getAnchorByEdge('left').linkedAnchors);
            expect(g2LinkedAnchors).toBe(g2pm3.getAnchorByEdge('right').linkedAnchors);
            expect(g2LinkedAnchors).toBe(board.getAnchorByEdge('left').linkedAnchors);
        });

        it ("does not have same linked anchor instance when anchors are not linked", function () {
            expect(g1LinkedAnchors === g2LinkedAnchors)
                .toEqual(false);

            expect(g1LinkedAnchors === board.getAnchorByEdge('right').linkedAnchors)
                .toEqual(false);

            expect(g2LinkedAnchors === board.getAnchorByEdge('right').linkedAnchors)
                .toEqual(false);
        });

        it("has the right number of anchors in the linked anchors instance", function () {
            expect(g1LinkedAnchors.length).toEqual(4);
            expect(g2LinkedAnchors.length).toEqual(7);
        });

        it("knows which anchors it's linked to", function () {
            expect(g1LinkedAnchors.isLinkedTo(g1pm1.getAnchorByEdge('left'))).toBe(true);
            expect(g1LinkedAnchors.isLinkedTo(g1pm1.getAnchorByEdge('right'))).toBe(true);
            expect(g1LinkedAnchors.isLinkedTo(g1pm2.getAnchorByEdge('left'))).toBe(true);
            expect(g1LinkedAnchors.isLinkedTo(g1pm2.getAnchorByEdge('right'))).toBe(true);

            expect(g2LinkedAnchors.isLinkedTo(g2pm1.getAnchorByEdge('left'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(g2pm1.getAnchorByEdge('right'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(g2pm2.getAnchorByEdge('left'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(g2pm2.getAnchorByEdge('right'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(g2pm3.getAnchorByEdge('left'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(g2pm3.getAnchorByEdge('right'))).toBe(true);
            expect(g2LinkedAnchors.isLinkedTo(board.getAnchorByEdge('left'))).toBe(true);
        });

        it("knows which anchors it'snot linked to", function () {
            expect(g1LinkedAnchors.isLinkedTo(g2pm1.getAnchorByEdge('left'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(g2pm1.getAnchorByEdge('right'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(g2pm2.getAnchorByEdge('left'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(g2pm2.getAnchorByEdge('right'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(g2pm3.getAnchorByEdge('left'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(g2pm3.getAnchorByEdge('right'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(board.getAnchorByEdge('left'))).toBe(false);
            expect(g1LinkedAnchors.isLinkedTo(board.getAnchorByEdge('right'))).toBe(false);

            expect(g2LinkedAnchors.isLinkedTo(g1pm1.getAnchorByEdge('left'))).toBe(false);
            expect(g2LinkedAnchors.isLinkedTo(g1pm1.getAnchorByEdge('right'))).toBe(false);
            expect(g2LinkedAnchors.isLinkedTo(g1pm2.getAnchorByEdge('left'))).toBe(false);
            expect(g2LinkedAnchors.isLinkedTo(g1pm2.getAnchorByEdge('right'))).toBe(false);
            expect(g2LinkedAnchors.isLinkedTo(board.getAnchorByEdge('right'))).toBe(false);
        });

        it ("knows when it's linked to a board", function () {
            expect(g1pm1.getAnchorByEdge('left').isLinkedToBoard()).toBe(false);
            expect(g2pm1.getAnchorByEdge('left').isLinkedToBoard()).toBe(true);
        });
    });

    describe("move", function () {

        it("knows if it can move horizontally", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("left"),
                anchor2: board.getAnchorByEdge("left"),
            }).toggleLocked();

            // Can move long as it's not linked to opposite board anchors
            expect(pm.getAnchorByEdge('left').canMoveHorizontally()).toBe(true);
            expect(pm.getAnchorByEdge('left').canMove()).toBe(true);
        });

        it("knows if it cannot move horizontally", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("left"),
                anchor2: board.getAnchorByEdge("left"),
            }).toggleLocked();
            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("left"),
                anchor2: board.getAnchorByEdge("right"),
            }).toggleLocked();

            // Cannot move long as it's linked to opposite board anchors
            expect(pm.getAnchorByEdge('left').canMoveHorizontally()).toBe(false);
            expect(pm.getAnchorByEdge('left').canMove()).toBe(false);

            // Horizontal anchors cannot move Horizontally
            expect(pm.getAnchorByEdge('top').canMoveHorizontally()).toBe(false);
            expect(pm.getAnchorByEdge('bottom').canMoveHorizontally()).toBe(false);
        });

        it("knows if it can move vertically", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("top"),
                anchor2: board.getAnchorByEdge("top"),
            }).toggleLocked();

            // Can move long as it's not linked to opposite board anchors
            expect(pm.getAnchorByEdge('top').canMoveVertically()).toBe(true);
            expect(pm.getAnchorByEdge('top').canMove()).toBe(true);
        });

        it("knows if it cannot move vertically", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("top"),
                anchor2: board.getAnchorByEdge("top"),
            }).toggleLocked();
            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("top"),
                anchor2: board.getAnchorByEdge("bottom"),
            }).toggleLocked();

            // Cannot move long as it's linked to opposite board anchors
            expect(pm.getAnchorByEdge('top').canMoveVertically()).toBe(false);
            expect(pm.getAnchorByEdge('top').canMove()).toBe(false);

            // Vertical anchors cannot move vertically
            expect(pm.getAnchorByEdge('right').canMoveVertically()).toBe(false);
            expect(pm.getAnchorByEdge('left').canMoveVertically()).toBe(false);
        });

        it("constrains movement if there is a board size limitation", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            board.resize(100, 100);
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("left"),
                anchor2: board.getAnchorByEdge("left"),
            }).toggleLocked();

            pm.getAnchorByEdge('left').translateLinked(200, 0);
            pm.getAnchorByEdge('top').translateLinked(0, 200);

            // Minimum board width limits movement
            expect(board.width).toEqual(1);
            expect(pm.position.x).toEqual(99);

            // Nothing limiting vertical movement
            expect(pm.position.y).toEqual(200);

        });

        it("constrains movement if there is a logo size limitation", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            board.resize(100, 100);
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRev)
                .withPosition(20, 20)
                .withSize(10, 10)
                .build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();

            designRev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge("left"),
                anchor2: pl.getAnchorByEdge("left"),
            }).toggleLocked();

            pm.getAnchorByEdge('left').translateLinked(200, 0);
            pm.getAnchorByEdge('top').translateLinked(0, 200);

            // Min log with is 5 thus anchor was only allow to move 5
            expect(pl.position.x).toEqual(25);
            expect(pm.position.x).toEqual(5);

            // Nothing limiting vertical movement
            expect(pm.position.y).toEqual(200);

        });
    })
});