import {Point} from "../../src/utils/geometry";
import {PlacedLogo} from "../../src/placedlogo/PlacedLogo";
import {PlacedLogoBuilder, testSvgData} from "./PlacedLogoBuilder";
import {FootprintBuilder} from "../module/feature/FootprintBuilder";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

describe("PlacedLogo", function () {

    it("generates uuid", function () {
        const pl = new PlacedLogoBuilder().build();

        expect(pl.uuid.length).toEqual(36);
    });

    it("generates the correct JSON", function () {
        const pl = new PlacedLogoBuilder()
            .withPosition(20, 15)
            .withSize(60, 90)
            .withRotation(180)
            .build();
        expect(pl.toJSON()).toEqual({
            uuid: jasmine.any(String),
            svgData: testSvgData,
            x: 80, // Rotation about centroid changes origin
            y: 105, // Rotation about centroid changes origin
            width: 60,
            height: 90,
            rotation: 180,
        } as any);
    });

    describe("geometry", function () {
        it("has default height of 100", function () {
            const pl = new PlacedLogoBuilder().build();
            expect(pl.height).toEqual(100);
        });

        it("knows when it overlaps with another logo", function () {
            const A = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();

            // B overlaps with A
            const B = new PlacedLogoBuilder()
                .withPosition(25, 25)
                .withSize(50, 50)
                .build();

            // C shares an edge with B
            const C = new PlacedLogoBuilder()
                .withPosition(50, 75)
                .withSize(50, 50)
                .build();

            expect(A.overlapsWith(A)).toBe(false, 'A & A');
            expect(A.overlapsWith(B)).toBe(true, 'A & B');
            expect(A.overlapsWith(C)).toBe(false, 'A & C');
            // Sharing an edge does not count as overlapping, for our purposes.
            expect(B.overlapsWith(C)).toBe(false, 'B & C');
        });

        it("knows when it overlaps with a module", function () {
            const A = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();

            const features = new FootprintBuilder().rectangle(50,50).build();
            const module = new ModuleBuilder()
                .withFeatures(features)
                .build();

            // B overlaps with A
            const B = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(25, 25)
                .build();

            // C shares an edge with B
            const C = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(50, 75)
                .build();

            expect(A.overlapsWith(A)).toBe(false, 'A & A');
            expect(A.overlapsWith(B)).toBe(true, 'A & B');
            expect(A.overlapsWith(C)).toBe(false, 'A & C');
        });
    });

    describe("updateOverlaps", function () {
        it("does not overlap if no other logos", function () {
            const pl = new PlacedLogoBuilder().build();
            pl.updateOverlaps([]);
            expect(pl.overlaps()).toBe(false);
        });
        it("does not overlap if not touching", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(60, 0)
                .withSize(50, 50)
                .build();

            pl.updateOverlaps([other]);
            expect(pl.overlaps()).toBe(false);
        });
        it("does not overlap if sharing an edge", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(50, 0)
                .withSize(50, 50)
                .build();

            pl.updateOverlaps([other]);
            expect(pl.overlaps()).toBe(false);
        });
        it("does overlap if they overlap", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(0, 25)
                .withSize(50, 50)
                .build();

            pl.updateOverlaps([other]);
            expect(pl.overlaps()).toBe(true);
        });
        it("does not overlap if they did but then the other one moved", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(50, 50)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(0, 25)
                .withSize(50, 50)
                .build();

            pl.updateOverlaps([other]);
            other.translateLinked(0, 30);
            pl.updateOverlaps([other]);

            expect(pl.overlaps()).toBe(false);
        });
    });

    describe("dimensioning", function () {
        it("unconstrained", function () {
            const pl = new PlacedLogoBuilder().build();
            expect(pl.canMoveVertically()).toBe(true);
            expect(pl.canMoveHorizontally()).toBe(true);
        });
        it("vertically constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const plTop = pl.getAnchorByEdge('top');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: plTop,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: plTop,
                anchor2: boardbottom,
            }).toggleLocked();

            expect(pl.canMoveVertically()).toBe(false);
            expect(pl.canMoveHorizontally()).toBe(true);
        });
        it("horizontally constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const pmLeft = pl.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: pmLeft,
                anchor2: boardRight,
            }).toggleLocked();

            expect(pl.canMoveVertically()).toBe(true);
            expect(pl.canMoveHorizontally()).toBe(false);
        });
        it("fully constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const plTop = pl.getAnchorByEdge('top');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: plTop,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: plTop,
                anchor2: boardbottom,
            }).toggleLocked();

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const plLeft = pl.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: plLeft,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: plLeft,
                anchor2: boardRight,
            }).toggleLocked();

            expect(pl.canMoveVertically()).toBe(false);
            expect(pl.canMoveHorizontally()).toBe(false);
        });
        it("can be unlocked and unconstrained again", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const plTop = pl.getAnchorByEdge('top');

            const dim1 = designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: plTop,
            });
            const dim2 = designRevisvion.addDimensionFromAttributes({
                anchor1: plTop,
                anchor2: boardbottom,
            });

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const plLeft = pl.getAnchorByEdge('left');

            const dim3 = designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: plLeft,
            });
            const dim4 = designRevisvion.addDimensionFromAttributes({
                anchor1: plLeft,
                anchor2: boardRight,
            });

            dim1.toggleLocked();
            dim2.toggleLocked();
            dim3.toggleLocked();
            dim4.toggleLocked();

            dim1.toggleLocked();
            dim2.toggleLocked();
            dim3.toggleLocked();
            dim4.toggleLocked();

            expect(pl.canMoveVertically()).toBe(true);
            expect(pl.canMoveHorizontally()).toBe(true);
        });
        it("cannot move if linked to the board (other than resizing the board)", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const pmLeft = pl.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();

            pl.translateLinked(20, 0);

            expect(pl.position.x).toBe(0);
        });
        it("cannot resize edge if linked to the board (other than resizing the board)", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const pmLeft = pl.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();

            pl.resizeLinkedByResizeEdge('left', 20, 0);

            expect(pl.position.x).toBe(0);
        });
        it("can resize edge if linked to the board by resizing the board", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const pmLeft = pl.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();

            board.resizeLinkedByEdge('left', 20, 0);

            expect(pl.position.x).toBe(20);
        });
    });

    describe("rotation", function () {
        describe("rotateTo", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder().build();
                pl.rotateTo(270);
                expect(pl.rotation).toEqual(270);
            });
            it("normalizes positive inputs", function () {
                const pl = new PlacedLogoBuilder().build();
                pl.rotateTo(450);
                expect(pl.rotation).toEqual(90);
            });
            it("normalizes negative inputs", function () {
                const pl = new PlacedLogoBuilder().build();
                pl.rotateTo(-180);
                expect(pl.rotation).toEqual(180);
            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .withPosition(50, 50)
                    .build();
                pl.rotateTo(90);
                expect(pl.position.x).toEqual(100);
                expect(pl.position.y).toEqual(50);
            });
        });
    });

    describe("resize", function () {
        describe("top", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('top', 0, 10);
                expect(pl.width).toEqual(50);
                expect(pl.height).toEqual(60);
            });
            it("returns resultant resize translation", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                const resultTrans = pl.resizeLinkedByResizeEdge('top', 0, 10);
                expect(resultTrans).toEqual({x: 0, y: 10});
            });
            it("returns resultant resize translation even with resize constraints", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(5, 5)
                    .build();
                // resize the height to 4 which is smaller than the MIN_LOGO_SIZE
                const resultTrans = pl.resizeLinkedByResizeEdge('top', 0, -1);
                expect(resultTrans).toEqual({x: 0, y: 0});
            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(50, 50)
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('top', 0, 10);
                expect(pl.position.x).toEqual(50);
                expect(pl.position.y).toEqual(50);
            });
            describe("after rotation", function () {
                it("works", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('top', 0, 10);
                    expect(pl.width).toEqual(60);
                    expect(pl.height).toEqual(50);
                });
                it("has correct position", function () {
                    const pl = new PlacedLogoBuilder()
                        .withPosition(50, 50)
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('top', 0, 10);
                    expect(pl.position.x).toEqual(100);
                    expect(pl.position.y).toEqual(50);
                });
            });
        });
        describe("bottom", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('bottom', 0, -10);
                expect(pl.width).toEqual(50);
                expect(pl.height).toEqual(60);
            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(50, 50)
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('bottom', 0, -10);
                expect(pl.position.x).toEqual(50);
                expect(pl.position.y).toEqual(40);
            });
            describe("after rotation", function () {
                it("works", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('bottom', 0, -10);
                    expect(pl.width).toEqual(60);
                    expect(pl.height).toEqual(50);
                });
                it("has correct position", function () {
                    const pl = new PlacedLogoBuilder()
                        .withPosition(50, 50)
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('bottom', 0, -10);
                    expect(pl.position.x).toEqual(100);
                    expect(pl.position.y).toEqual(40);
                });
            });
        });
        describe("left", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('left', -10, 0);
                expect(pl.width).toEqual(60);
                expect(pl.height).toEqual(50);
            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(50, 50)
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('left', -10, 0);
                expect(pl.position.x).toEqual(40);
                expect(pl.position.y).toEqual(50);
            });
            describe("after rotation", function () {
                it("works", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('left', -10, 0);
                    expect(pl.width).toEqual(50);
                    expect(pl.height).toEqual(60);
                });
                it("has correct position", function () {
                    const pl = new PlacedLogoBuilder()
                        .withPosition(50, 50)
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('left', -10, 0);
                    expect(pl.position.x).toEqual(100);
                    expect(pl.position.y).toEqual(50);
                });
            });
        });
        describe("right", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('right', 10, 0);
                expect(pl.width).toEqual(60);
                expect(pl.height).toEqual(50);

            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(50, 50)
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('right', 10, 0);
                expect(pl.position.x).toEqual(50);
                expect(pl.position.y).toEqual(50);
            });
            describe("after rotation", function () {
                it("works", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('right', 10, 0);
                    expect(pl.width).toEqual(50);
                    expect(pl.height).toEqual(60);
                });
                it("has correct position", function () {
                    const pl = new PlacedLogoBuilder()
                        .withPosition(50, 50)
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('right', 10, 0);
                    expect(pl.position.x).toEqual(110);
                    expect(pl.position.y).toEqual(50);
                });
            });
        });
        describe("corner", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('top-left', -10, 10);
                expect(pl.width).toEqual(60);
                expect(pl.height).toEqual(60);
            });
            it("keeps aspect ratio", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('top-left', -10, 20);
                expect(pl.width).toBeCloseTo(65);
                expect(pl.height).toBeCloseTo(65);

            });
            it("has correct position", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(50, 50)
                    .withSize(50, 50)
                    .build();
                pl.resizeLinkedByResizeEdge('top-left', -10, 10);
                expect(pl.position.x).toEqual(40);
                expect(pl.position.y).toEqual(50);
            });
            describe("after rotation", function () {
                it("works", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('top-left', -10, 10);

                    expect(pl.width).toEqual(60);
                    expect(pl.height).toEqual(60);
                });
                it("has correct position", function () {
                    const pl = new PlacedLogoBuilder()
                        .withPosition(50, 50)
                        .withSize(50, 50)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('top-left', -10, 10);

                    expect(pl.position.x).toEqual(100);
                    expect(pl.position.y).toEqual(50);
                });
                it("keeps aspect ratio", function () {
                    const pl = new PlacedLogoBuilder()
                        .withSize(50, 25)
                        .build();
                    pl.rotateTo(90);
                    pl.resizeLinkedByResizeEdge('top-left', -10, 20);
                    expect(pl.width).toBeCloseTo(70);
                    expect(pl.height).toBeCloseTo(35);
                });
            });
        });
        describe("snap", function () {
            it("works", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(0, 0)
                    .withSize(48, 48)
                    .build();
                pl.resizeEdgeSnap('top');
                expect(pl.width).toEqual(48);
                expect(pl.height).toEqual(50);
            });
            it("works when rotated", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(0, 0)
                    .withSize(48, 48)
                    .withRotation(90)
                    .build();
                pl.resizeEdgeSnap('top');
                expect(pl.width).toEqual(50);
                expect(pl.height).toEqual(48);
            });
            it("returns translation", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(0, 0)
                    .withSize(48, 48)
                    .withRotation(90)
                    .build();
                const trans = pl.resizeEdgeSnap('top');
                expect(trans).toEqual({x:0, y: 2});

            });
            it("snaps to edge that is closer to grid for corners", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(0, 0)
                    .withSize(23, 49)
                    .build();
                pl.resizeEdgeSnap('top-right');
                expect(pl.width).toBeCloseTo(50 / 49 * 23);
                expect(pl.height).toBeCloseTo(50);
            });
        });
    });

    describe("anchors", function () {
        describe("initiates correctly", function () {
            it("has correct anchor points", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 0
                });
                const pl = designRev.getPlacedLogos()[0];

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.point1.equals(new Point(0, 20))).toEqual(true);
                expect(top.point2.equals(new Point(10, 20))).toEqual(true);
                expect(right.point1.equals(new Point(10, 0))).toEqual(true);
                expect(right.point2.equals(new Point(10, 20))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(10, 0))).toEqual(true);
                expect(left.point1.equals(new Point(0, 0))).toEqual(true);
                expect(left.point2.equals(new Point(0, 20))).toEqual(true);
            });
            it("has correct anchor points when rotated", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 90
                });
                const pl = designRev.getPlacedLogos()[0];

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.point1.equals(new Point(0, 10))).toEqual(true);
                expect(top.point2.equals(new Point(-20, 10))).toEqual(true);
                expect(right.point1.equals(new Point(0, 0))).toEqual(true);
                expect(right.point2.equals(new Point(0, 10))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(-20, 0))).toEqual(true);
                expect(left.point1.equals(new Point(-20, 0))).toEqual(true);
                expect(left.point2.equals(new Point(-20, 10))).toEqual(true);
            });
            it("has correct linked anchors", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 0
                });
                const pl = designRev.getPlacedLogos()[0];

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.linkedAnchors.length).toEqual(1);
                expect(right.linkedAnchors.length).toEqual(1);
                expect(bottom.linkedAnchors.length).toEqual(1);
                expect(left.linkedAnchors.length).toEqual(1);
                expect(top.linkedAnchors.isLinkedTo(top)).toEqual(true);
                expect(right.linkedAnchors.isLinkedTo(right)).toEqual(true);
                expect(bottom.linkedAnchors.isLinkedTo(bottom)).toEqual(true);
                expect(left.linkedAnchors.isLinkedTo(left)).toEqual(true);
            });
        });

        describe("resizes correctly", function () {
            it("has correct points", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 0
                });
                const pl = designRev.getPlacedLogos()[0];

                pl.resize(15, 25);

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.point1.equals(new Point(0, 25))).toEqual(true);
                expect(top.point2.equals(new Point(15, 25))).toEqual(true);
                expect(right.point1.equals(new Point(15, 0))).toEqual(true);
                expect(right.point2.equals(new Point(15, 25))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(15, 0))).toEqual(true);
                expect(left.point1.equals(new Point(0, 0))).toEqual(true);
                expect(left.point2.equals(new Point(0, 25))).toEqual(true);
            });
            it("has correct anchor points when rotated", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 90
                });
                const pl = designRev.getPlacedLogos()[0];

                pl.resize(15, 25);

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.point1.equals(new Point(0, 15))).toEqual(true);
                expect(top.point2.equals(new Point(-25, 15))).toEqual(true);
                expect(right.point1.equals(new Point(0, 0))).toEqual(true);
                expect(right.point2.equals(new Point(0, 15))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(-25, 0))).toEqual(true);
                expect(left.point1.equals(new Point(-25, 0))).toEqual(true);
                expect(left.point2.equals(new Point(-25, 15))).toEqual(true);
            });
        });

        describe("rotates correctly", function () {
            it("has correct anchor points when rotated", function () {
                const designRev = new DesignRevisionBuilder().build();
                designRev.addPlacedLogoFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    svg_data: testSvgData,
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 20,
                    rotation: 0
                });
                const pl = designRev.getPlacedLogos()[0];

                pl.rotate();

                const top = pl.getAnchorByViewEdge('top');
                const right = pl.getAnchorByViewEdge('right');
                const bottom = pl.getAnchorByViewEdge('bottom');
                const left = pl.getAnchorByViewEdge('left');

                expect(top.point1.equals(new Point(0, 10))).toEqual(true);
                expect(top.point2.equals(new Point(-20, 10))).toEqual(true);
                expect(right.point1.equals(new Point(0, 0))).toEqual(true);
                expect(right.point2.equals(new Point(0, 10))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(-20, 0))).toEqual(true);
                expect(left.point1.equals(new Point(-20, 0))).toEqual(true);
                expect(left.point2.equals(new Point(-20, 10))).toEqual(true);
            });
        });
    });
});
