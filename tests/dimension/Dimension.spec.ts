import {
    createDimension,
    Dimension,
    DimensionAttributes
} from "../../src/dimension/Dimension";
import {Board} from "model/Board";
import {FeatureBuilder} from "../module/feature/FeatureBuilder";
import {BoardBuilder} from "../board/BoardBuilder";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ModuleAnchorBuilder} from "./Anchor/ModuleAnchorBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {LineType} from "../../src/module/feature/api";
import {Workspace} from "../../src/workspace/Workspace";

/**
 * A module feature resource with footprint whose left edge sticks to the
 * edge of the board.
 */
export const EDGE_FOOTPRINT = [
    {
        id: 101,
        type: 'footprint' as LineType, // bottom
        points: [
            {x: 0, y: 0},
            {x: 3, y: 0}
        ]
    },
    {
        id: 102,
        type: 'footprint' as LineType, // right
        points: [
            {x: 3, y: 0},
            {x: 3, y: 3}
        ]
    },
    {
        id: 103,
        type: 'footprint' as LineType, // top
        points: [
            {x: 3, y: 3},
            {x: 0, y: 3}
        ]
    },
    {
        id: 104,
        type: 'edge' as LineType, // left
        points: [
            {x: 0, y: 3},
            {x: 0, y: 0}
        ]
    }
];


describe("Dimension", function () {

    beforeEach(function () {
        spyOn(Workspace, "boardValueSnap").and.callFake(coord => coord);
    });

    function getEdgePmBuilder(): PlacedModuleBuilder {
        return new PlacedModuleBuilder()
            .withModule(new ModuleBuilder()
                .withFeatures(EDGE_FOOTPRINT)
                .build());
    }

    function makeDimension(attributes?: Partial<DimensionAttributes>): Dimension {
        const dimensionable1 = new PlacedModuleBuilder()
            .withUuid('1111uuid-uuid-uuid-uuid-uuiduuiduuid')
            .build();
        const dimensionable2 = new PlacedModuleBuilder()
            .withUuid('2222uuid-uuid-uuid-uuid-uuiduuiduuid')
            .build();

        const feature1 = new FeatureBuilder()
            .withId(200)
            .build();
        const feature2 = new FeatureBuilder()
            .withId(300)
            .build();

        const anchor1 = new ModuleAnchorBuilder()
            .withFeature(feature1)
            .withDimensionable(dimensionable1)
            .build();
        const anchor2 = new ModuleAnchorBuilder()
            .withFeature(feature2)
            .withDimensionable(dimensionable2)
            .build();

        attributes = Object.assign({
            anchor1: anchor1,
            anchor2: anchor2,
            hidden: false,
            locked: true,
        }, attributes);

        return createDimension(attributes as DimensionAttributes);
    }

    /**
     * Make sure we've overridden the constructor correctly.
     */

    it('is constructed correctly', function () {
        /* The client ID is needed for collections to work properly. */
        const dimension = makeDimension();
        expect(dimension.cid).not.toBeUndefined();
    });

    it('generates correct JSON', function () {
        const dimension = makeDimension();
        const json = dimension.toJSON();
        expect(json).toEqual({
            anchor1: {
                type: 'module',
                module_uuid: '1111uuid-uuid-uuid-uuid-uuiduuiduuid',
                feature: 200
            },
            anchor2: {
                type: 'module',
                module_uuid: '2222uuid-uuid-uuid-uuid-uuiduuiduuid',
                feature: 300
            },
            locked: true,
            hidden: false
        });
    });

    it('generates correct JSON when locked', function () {
        const dimension = makeDimension();
        const json = dimension.toJSON();
        expect(json).toEqual({
            anchor1: {
                type: 'module',
                module_uuid: '1111uuid-uuid-uuid-uuid-uuiduuiduuid',
                feature: 200
            },
            anchor2: {
                type: 'module',
                module_uuid: '2222uuid-uuid-uuid-uuid-uuiduuiduuid',
                feature: 300
            },
            locked: true,
            hidden: false
        });
    });

    describe('isLockedByUser', function () {
        it("is true when locked flag is set", function () {
            const dimension = makeDimension({ locked: true });
            expect(dimension.isLockedByUser()).toBe(true);
        });

        it("is false when locked flag is not set", function () {
            const dimension = makeDimension({ locked: false });
            expect(dimension.isLockedByUser()).toBe(false);
        });

        it("is false when it is an edge constraint", function () {
            const dimension = makeDimension({
                locked: false,
                isEdgeConstraint: true
            });
            expect(dimension.isLockedByUser()).toBe(false);
        });
    });

    describe("modules", function () {
        describe("hasParent", function () {
            it("both placed modules", function () {
                const pm1 = new PlacedModuleBuilder().build();
                const pm2 = new PlacedModuleBuilder().build();
                const pm3 = new PlacedModuleBuilder().build();

                const anchor1 = new ModuleAnchorBuilder()
                    .withDimensionable(pm1)
                    .build();
                const anchor2 = new ModuleAnchorBuilder()
                    .withDimensionable(pm2)
                    .build();
                const dimension = createDimension({
                    anchor1: anchor1,
                    anchor2: anchor2,
                    hidden: false,
                    locked: true,
                });

                expect(dimension.hasParent(pm1)).toBe(true);
                expect(dimension.hasParent(pm2)).toBe(true);
                expect(dimension.hasParent(pm3)).toBe(false);
            });
        });

        describe("getOtherAnchor", function () {
            it("both ancnhors", function () {
                const pm1 = new PlacedModuleBuilder().build();
                const pm2 = new PlacedModuleBuilder().build();
                const anchor1 = new ModuleAnchorBuilder()
                    .withDimensionable(pm1)
                    .build();
                const anchor2 = new ModuleAnchorBuilder()
                    .withDimensionable(pm2)
                    .build();
                const dimension = createDimension({
                    anchor1: anchor1,
                    anchor2: anchor2,
                    hidden: false,
                    locked: true,
                });

                expect(dimension.getOtherAnchor(anchor1)).toBe(anchor2);
                expect(dimension.getOtherAnchor(anchor2)).toBe(anchor1);
            });

            it("one board edge", function () {
                const pm = new PlacedModuleBuilder().build();
                const board = new BoardBuilder().build();
                const pmLeft = pm.getAnchorByEdge('left');
                const boardLeft = board.getAnchorByEdge('left');
                const dimension = createDimension({
                    anchor1: pmLeft,
                    anchor2: boardLeft,
                });

                expect(dimension.getOtherAnchor(boardLeft)).toBe(pmLeft);
                expect(dimension.getOtherAnchor(pmLeft)).toBe(boardLeft);
            });
        });
    });

    describe("length", function () {
        describe("canBeResized is correct", function () {
            it("with two floating modules", function () {
                const designRev = new DesignRevisionBuilder().build();
                const floater1 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const floater2 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: floater1.getAnchorByEdge('left'),
                    anchor2: floater2.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(true);
            });

            it("with self dimension on module", function () {
                const designRev = new DesignRevisionBuilder().build();
                const pm = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: pm.getAnchorByEdge('left'),
                    anchor2: pm.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(false);
            });

            it("with a locked dimension", function () {
                const designRev = new DesignRevisionBuilder().build();
                const pm1 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const pm2 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: pm1.getAnchorByEdge('left'),
                    anchor2: pm2.getAnchorByEdge('right'),
                });
                dim.toggleLocked();
                expect(dim.canResize()).toBe(false);
            });

            it("with one edge-constrained module", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                const floater = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const edgePm = getEdgePmBuilder()
                    .withDesignRevision(designRev)
                    .build();

                // Lock edge module to board the floater can move
                designRev.addDimensionFromAttributes({
                    anchor1: edgePm.getAnchorByEdge('left'),
                    anchor2: board.getAnchorByEdge('right'),
                });
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: edgePm.getAnchorByEdge('left'),
                    anchor2: floater.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(true);
            });

            it("with one board edge", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                const floater = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: board.getAnchorByEdge('left'),
                    anchor2: floater.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(true);
            });

            it("with both board edges", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: board.getAnchorByEdge('left'),
                    anchor2: board.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(true);
            });

            it("with an edge module", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                const edgePm = getEdgePmBuilder()
                    .withDesignRevision(designRev)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: edgePm.getAnchorByEdge('left'),
                    anchor2: board.getAnchorByEdge('right'),
                });
                expect(dim.canResize()).toBe(true);
            });
        });

        describe("getLength is correct", function () {
            it("with two floating modules", function () {
                const designRev = new DesignRevisionBuilder().build();
                const floater1 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .withPosition(0, 0)
                    .build();
                const floater2 = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .withPosition(20, 0)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: floater1.getAnchorByEdge('left'),
                    anchor2: floater2.getAnchorByEdge('left'),
                });
                expect(dim.absLength).toEqual(20);
            });

            it("with one edge-constrained module", function () {
                const designRev = new DesignRevisionBuilder().build();
                const floater = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .withPosition(0, 0)
                    .build();
                const edgePm = getEdgePmBuilder()
                    .withDesignRevision(designRev)
                    // x should automatically be changed to 0 due to edge
                    .withPosition(5, 0)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: floater.getAnchorByEdge('left'),
                    anchor2: edgePm.getAnchorByEdge('left'),
                });
                // They're both on the left edge
                expect(dim.absLength).toEqual(0);
            });

            it("with one board edge", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                const floater = new PlacedModuleBuilder()
                    .withDesignRevision(designRev)
                    .withPosition(20, 0)
                    .build();
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: board.getAnchorByEdge('left'),
                    anchor2: floater.getAnchorByEdge('left'),
                });
                expect(dim.absLength).toEqual(20);
            });

            it("with both board edges", function () {
                const designRev = new DesignRevisionBuilder().build();
                const board = designRev.board;
                board.resize(100, 50);
                const dim = designRev.addDimensionFromAttributes({
                    anchor1: board.getAnchorByEdge('left'),
                    anchor2: board.getAnchorByEdge('right'),
                });
                expect(dim.absLength).toEqual(100);
            });

            it("with an edge module", function () {
                const designRev = new DesignRevisionBuilder().build();
                getEdgePmBuilder()
                    .withDesignRevision(designRev)
                    // x should automatically be changed to 0 due to edge
                    .withPosition(5, 0)
                    .build();

                // Edge constraint dimensions are automatically created
                const dim = designRev.dimensions[0];
                expect(dim.absLength).toEqual(0);
            });
        });

        describe("setLength", function () {
            describe("with two floating modules", function () {
                let floater1: PlacedModule;
                let floater2: PlacedModule;
                let dim: Dimension;
                let result: boolean;
                beforeEach(function () {
                    const designRev = new DesignRevisionBuilder().build();
                    floater1 = new PlacedModuleBuilder()
                        .withDesignRevision(designRev)
                        .withPosition(0, 0)
                        .build();
                    floater2 = new PlacedModuleBuilder()
                        .withDesignRevision(designRev)
                        .withPosition(20, 0)
                        .build();
                    dim = designRev.addDimensionFromAttributes({
                        anchor1: floater1.getAnchorByEdge('left'),
                        anchor2: floater2.getAnchorByEdge('left'),
                    });
                    result = dim.setLength(30);
                });
                it("returns success", function () {
                    expect(result).toBe(true);
                });
                it("preferably moves the second module", function () {
                    expect(floater2.position.x).toEqual(30);
                });
            });

            describe("with one edge-constrained module", function () {
                let floater: PlacedModule;
                let edgePm: PlacedModule;
                let dim: Dimension;
                let result: boolean;
                beforeEach(function () {
                    const designRev = new DesignRevisionBuilder().build();
                    floater = new PlacedModuleBuilder()
                        .withDesignRevision(designRev)
                        .withPosition(0, 0)
                        .build();
                    edgePm = getEdgePmBuilder()
                        .withDesignRevision(designRev)
                        // x should automatically be changed to 0 due to edge
                        .withPosition(5, 0)
                        .build();
                    dim = designRev.addDimensionFromAttributes({
                        anchor1: edgePm.getAnchorByEdge('left'),
                        anchor2: floater.getAnchorByEdge('left'),
                    });
                    result = dim.setLength(30);

                });
                it("returns success", function () {
                    expect(result).toBe(true);
                });
                it("moves the floating module", function () {
                    // Will preferable move the floating module instead of
                    // moving the edge module (resizing the board)
                    expect(floater.position.x).toEqual(30);
                });
            });

            describe("with one board edge", function () {
                let board: Board;
                let floater: PlacedModule;
                let dim: Dimension;
                let result: boolean;
                beforeEach(function () {
                    const designRev = new DesignRevisionBuilder().build();
                    board = designRev.board;
                    floater = new PlacedModuleBuilder()
                        .withDesignRevision(designRev)
                        .withPosition(20, 0)
                        .build();
                    dim = designRev.addDimensionFromAttributes({
                        anchor1: board.getAnchorByEdge('left'),
                        anchor2: floater.getAnchorByEdge('left'),
                    });
                    result = dim.setLength(24);

                });
                it("returns success", function () {
                    expect(result).toBe(true);
                });
                it("moves the floating module", function () {
                    expect(floater.position.x).toEqual(24);
                });
            });

            describe("with both board edges", function () {
                let board: Board;
                let dim: Dimension;
                let result: boolean;
                beforeEach(function () {
                    const designRev = new DesignRevisionBuilder().build();
                    board = designRev.board;
                    board.resize(100, 100);
                    dim = designRev.addDimensionFromAttributes({
                        anchor1: board.getAnchorByEdge('left'),
                        anchor2: board.getAnchorByEdge('right'),
                    });
                    result = dim.setLength(24);
                });
                it("returns success", function () {
                    expect(result).toBe(true);
                });
                it("resizes the board", function () {
                    dim.setLength(58);
                    expect(board.getWidth()).toEqual(58);
                });
            });
        });
    });
});
