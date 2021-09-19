import events from "utils/events";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Point} from "../../src/utils/geometry";
import {FootprintBuilder} from "../module/feature/FootprintBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import makeModule from "../module/TestModule";
import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import {PlacedLogoBuilder} from "../placedlogo/PlacedLogoBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

const REGULATOR_OVERHEAD = 0; // mW
const REGULATOR_EFFICIENCY = 0.8;


function makePowerRequire(attributes) {
    return Object.assign({
        name: "3.3V",
        level: "3.3",
        is_power: true,
        milliwatts: 0,
        efficiency: 0,
        address: null,
        exclusions: [],
        bus_group: {id: 1},
        templates: [],
    }, attributes);
}


function makeModuleWithBuses(attributes?) {
    attributes = Object.assign({
        provides: [
            {
                id: 12199,
                name: "UART1",
                level: "1.8",
                is_power: false,
                num_connections: 1,
                address: null,
                exclusions: [
                    12257,
                    12285,
                    12253
                ],
                bus_group: {id: 1},
                templates: [],
            },
            {
                id: 3205,
                name: "1.8V",
                level: "1.8",
                is_power: true,
                milliwatts: 200,
                address: null,
                exclusions: [],
                bus_group: {id: 1},
                templates: [],
            },
        ],
        requires: [
            makePowerRequire({
                id: 3205,
                name: "3.3V",
                level: "3.3",
                milliwatts: REGULATOR_OVERHEAD,
                efficiency: REGULATOR_EFFICIENCY,
            }),
        ],
    }, attributes);

    return makeModule(attributes);
}

describe("PlacedModule", function () {

    beforeEach(function () {
        spyOn(events, "publish").and.callFake(()=>{});
    });

    it("has the correct module revision ID", function () {
        const module = new ModuleBuilder().withRevisionId(20).build();
        const pm = new PlacedModuleBuilder().withModule(module).build();
        expect(pm.getRevisionId()).toEqual(20);
    });

    it("generates uuid", function () {
        const pm = new PlacedModuleBuilder().build();
        expect(pm.uuid.length).toEqual(36);
    });

    it("generates the correct JSON", function () {
        const module = new ModuleBuilder().withRevisionId(20).build();
        const pm = new PlacedModuleBuilder()
            .withModule(module)
            .withPosition(20, 15)
            .build();
        pm.setCustomName("Test custom name");
        expect(pm.toJSON()).toEqual({
            uuid: jasmine.any(String),
            module_revision: 20,
            x: 20,
            y: 15,
            rotation: 0,
            choices: [],
            custom_name: "Test custom name",
        } as any);
    });

    describe("custom name", function () {
        it("can be set", function () {
            const pm = new PlacedModuleBuilder().build();
            pm.setCustomName("custom name");
            expect(pm.customName).toEqual("custom name");
        });
    });

    describe("geometry", function () {
        it("has an outline", function () {
            const pm = new PlacedModuleBuilder().build();
            const x = 0;
            expect(pm.getOutline().xmin).toEqual(x);
        });

        it("has an display outline", function () {
            const pm = new PlacedModuleBuilder().build();
            const x = 0,
                padding = 5;
            expect(pm.getDisplayOutline().xmin).toEqual(x - padding);
        });

        it("knows its placed footprint polygon", function () {
            const module = makeModuleWithBuses(); // A 3x3 square footprint
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(-1, 2.4)
                .build();
            const footprintPolylines = pm.getPlacedPolygons();
            expect(footprintPolylines[0].hasVertex({x: -1, y: 2.4})).toBe(true);
            expect(footprintPolylines[0].hasVertex({x: 2, y: 2.4})).toBe(true);
            expect(footprintPolylines[0].hasVertex({x: 2, y: 5.4})).toBe(true);
            expect(footprintPolylines[0].hasVertex({x: -1, y: 5.4})).toBe(true);
        });

        it("knows when it overlaps with another module", function () {
            const module = makeModuleWithBuses(); // A 3x3 square footprint
            const A = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(0, 0)
                .build();
            // B overlaps with A
            const B = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(2, 2)
                .build();
            // C shares an edge with B
            const C = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(4, 5)
                .build();

            expect(A.overlapsWith(A)).toBe(false, 'A & A');
            expect(A.overlapsWith(B)).toBe(true, 'A & B');
            expect(A.overlapsWith(C)).toBe(false, 'A & C');
            // Sharing an edge does not count as overlapping, for our purposes.
            expect(B.overlapsWith(C)).toBe(false, 'B & C');
        });

        it("knows when it overlaps with a logo", function () {
            const module = makeModuleWithBuses(); // A 3x3 square footprint
            const A = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(0, 0)
                .build();

            // B overlaps with A
            const B = new PlacedLogoBuilder()
                .withPosition(2, 2)
                .withSize(3, 3)
                .build();

            // C shares an edge with B
            const C = new PlacedLogoBuilder()
                .withPosition(4, 5)
                .withSize(3, 3)
                .build();

            expect(A.overlapsWith(A)).toBe(false, 'A & A');
            expect(A.overlapsWith(B)).toBe(true, 'A & B');
            expect(A.overlapsWith(C)).toBe(false, 'A & C');
        });
    });

    describe("updateOverlaps", function () {
        // Each module is 3x3
        function make(x, y): PlacedModule {
            return new PlacedModuleBuilder()
                .withModule(makeModule())
                .withPosition(x, y)
                .build();
        }
        it("does not overlap if no other modules", function () {
            const pm = make(0, 0);
            pm.updateOverlaps([]);
            expect(pm.overlaps()).toBe(false);
        });
        it("does not overlap if not touching", function () {
            const pm = make(0, 0);
            const other = make(4, 0);
            pm.updateOverlaps([other]);
            expect(pm.overlaps()).toBe(false);
        });
        it("does not overlap if sharing an edge", function () {
            const pm = make(0, 0);
            const other = make(3, 0);
            pm.updateOverlaps([other]);
            expect(pm.overlaps()).toBe(false);
        });
        it("does overlap if they overlap", function () {
            const pm = make(0, 0);
            const other = make(0, 2);
            pm.updateOverlaps([other]);
            expect(pm.overlaps()).toBe(true);
        });
        it("does not overlap if they did but then the other one moved", function () {
            const pm = make(0, 0);
            const other = make(0, 2);
            pm.updateOverlaps([other]);

            other.translateLinked(0, 2);
            pm.updateOverlaps([other]);
            expect(pm.overlaps()).toBe(false);
        });
    });

    describe("dimensioning", function () {

        it("unconstrained", function () {
            const pm = new PlacedModuleBuilder().build();
            expect(pm.canMoveVertically()).toBe(true);
            expect(pm.canMoveHorizontally()).toBe(true);
        });
        it("vertically constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const pmTop = pm.getAnchorByEdge('top');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: pmTop,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: pmTop,
                anchor2: boardbottom,
            }).toggleLocked();

            expect(pm.canMoveVertically()).toBe(false);
            expect(pm.canMoveHorizontally()).toBe(true);
        });
        it("horizontally constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const pmLeft = pm.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: pmLeft,
                anchor2: boardRight,
            }).toggleLocked();

            expect(pm.canMoveVertically()).toBe(true);
            expect(pm.canMoveHorizontally()).toBe(false);
        });
        it("fully constrained", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const pmTop = pm.getAnchorByEdge('top');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: pmTop,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: pmTop,
                anchor2: boardbottom,
            }).toggleLocked();

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const pmLeft = pm.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();
            designRevisvion.addDimensionFromAttributes({
                anchor1: pmLeft,
                anchor2: boardRight,
            }).toggleLocked();

            expect(pm.canMoveVertically()).toBe(false);
            expect(pm.canMoveHorizontally()).toBe(false);
        });
        it("can be unlocked and unconstrained again", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardTop = board.getAnchorByEdge('top');
            const boardbottom = board.getAnchorByEdge('bottom');
            const pmTop = pm.getAnchorByEdge('top');

            const dim1 = designRevisvion.addDimensionFromAttributes({
                anchor1: boardTop,
                anchor2: pmTop,
            });
            const dim2 = designRevisvion.addDimensionFromAttributes({
                anchor1: pmTop,
                anchor2: boardbottom,
            });

            const boardLeft = board.getAnchorByEdge('left');
            const boardRight = board.getAnchorByEdge('right');
            const pmLeft = pm.getAnchorByEdge('left');

            const dim3 = designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            });
            const dim4 = designRevisvion.addDimensionFromAttributes({
                anchor1: pmLeft,
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

            expect(pm.canMoveVertically()).toBe(true);
            expect(pm.canMoveHorizontally()).toBe(true);
        });
        it("cannot move if linked to the board (other than resizing the board)", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const pmLeft = pm.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();

            pm.translateLinked(20, 0);

            expect(pm.position.x).toBe(0);
        });
        it("can move if linked to the board by resizing the board", function () {
            const designRevisvion = new DesignRevisionBuilder().build();

            const board = designRevisvion.board;
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRevisvion)
                .build();

            const boardLeft = board.getAnchorByEdge('left');
            const pmLeft = pm.getAnchorByEdge('left');

            designRevisvion.addDimensionFromAttributes({
                anchor1: boardLeft,
                anchor2: pmLeft,
            }).toggleLocked();

            board.resizeLinkedByEdge('left', 20, 0);

            expect(pm.position.x).toBe(20);
        });
    });

    describe("rotation", function () {

        function make(): PlacedModule {
            return new PlacedModuleBuilder().withPosition(50, 50).build();
        }

        describe("rotateTo", function () {
            it("works", function () {
                const pm = make();
                pm.rotateTo(270);
                expect(pm.rotation).toEqual(270);
            });
            it("normalizes positive inputs", function () {
                const pm = make();
                pm.rotateTo(450);
                expect(pm.rotation).toEqual(90);
            });
            it("normalizes negative inputs", function () {
                const pm = make();
                pm.rotateTo(-180);
                expect(pm.rotation).toEqual(180);
            });
        });
    });

    describe("features", function () {
        it("creates copies of each feature of the module", function () {
            const features = new FootprintBuilder().build();
            const module = new ModuleBuilder()
                .withFeatures(features)
                .build();

            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();

            expect(module.features.length).toEqual(4);
            for (const index in module.features) {
                const original = module.features[index];
                const placed = pm.features[index];
                expect(placed).not.toBe(original);
            }
        });
    });

    describe("exclusion sets", function () {

        const require1Attributes = {
            id: 1,
            name: "LINE IN",
            power: false,
            num_connections: 1,
            milliwatts: 0,
            efficiency: 0,
            address: "",
            levels: ["1.8"],
            exclusions: [
                2,
                3,
            ],
            bus_group: {
                id: 1,
                title: "Audio and ADC",
                levels: ["1.8"]
            },
            templates: [],
        };

        const require2Attributes = {
            id: 2,
            name: "ADC 1",
            power: false,
            num_connections: 1,
            milliwatts: 0,
            efficiency: 0,
            address: "",
            levels: ["1.8"],
            exclusions: [1],
            bus_group: {
                id: 1,
                title: "Audio and ADC",
                levels: ["1.8"]
            },
            templates: [],
        };

        const require3Attributes = {
            id: 3,
            name: "ADC 2",
            power: false,
            num_connections: 1,
            milliwatts: 0,
            efficiency: 0,
            address: "",
            levels: ["1.8"],
            exclusions: [1],
            bus_group: {
                id: 1,
                title: "Audio and ADC",
                levels: ["1.8"]
            },
            templates: [],
        };

        const requires = [
            require1Attributes,
            require2Attributes,
            require3Attributes
        ];

        describe("inclusions", function () {
            it ("returns correct inclusions for single inclusion", function () {
                const module = makeModule({
                    requires: requires
                });

                const pm = new PlacedModuleBuilder()
                    .withModule(module)
                    .build();
                const require1 = pm.getRequires()[0];

                const inclusions = pm.getRequireInclusions(require1);
                expect(inclusions.length).toEqual(1);
                expect(inclusions).toEqual([require1]);
            });
            it ("returns correct inclusions for multiple inclusion", function () {
                const module = makeModule({
                    requires: requires
                });

                const pm = new PlacedModuleBuilder()
                    .withModule(module)
                    .build();
                const require2 = pm.getRequireById(2);
                const require3 = pm.getRequireById(3);

                const inclusions = pm.getRequireInclusions(require2);
                expect(inclusions.length).toEqual(2);
                expect(inclusions).toEqual([require2, require3]);

            })
        });

        describe("when one require needs to be ready/connected in an exclusion set", function () {
            describe("require is ready/connected", function () {
                it("sets `isReady` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isReady").and.returnValue(true);
                    spyOn(require2, "isReady").and.returnValue(false);
                    spyOn(require3, "isReady").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(true);
                });
                it("sets `isConnected` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(true);
                    spyOn(require2, "isConnected").and.returnValue(false);
                    spyOn(require3, "isConnected").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isConnected()).toEqual(true);
                });
            });
            describe("require is not ready/connected", function () {
                it("sets `isReady` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isReady").and.returnValue(false);
                    spyOn(require2, "isReady").and.returnValue(false);
                    spyOn(require3, "isReady").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(false);
                });
                it("sets `isConnected` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(false);
                    spyOn(require2, "isConnected").and.returnValue(false);
                    spyOn(require3, "isConnected").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isConnected()).toEqual(false);
                });
                it("sets `isReady` and `isConnected` correctly for optional buses with NC set", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(false);
                    spyOn(require2, "isConnected").and.returnValue(false);
                    spyOn(require3, "isConnected").and.returnValue(false);
                    spyOnProperty(require1, "isOptional").and.returnValue(true);
                    spyOnProperty(require2, "isOptional").and.returnValue(true);
                    spyOnProperty(require3, "isOptional").and.returnValue(true);
                    spyOn(require1, "isNoConnect").and.returnValue(true);
                    spyOn(require2, "isNoConnect").and.returnValue(true);
                    spyOn(require3, "isNoConnect").and.returnValue(true);

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(true);
                    expect(pm.isConnected()).toEqual(true);
                });
                it("sets `isReady` and `isConnected` correctly for optional buses with NC unset", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(false);
                    spyOn(require2, "isConnected").and.returnValue(false);
                    spyOn(require3, "isConnected").and.returnValue(false);
                    spyOnProperty(require1, "isOptional").and.returnValue(true);
                    spyOnProperty(require2, "isOptional").and.returnValue(true);
                    spyOnProperty(require3, "isOptional").and.returnValue(true);
                    spyOn(require1, "isNoConnect").and.returnValue(true);
                    spyOn(require2, "isNoConnect").and.returnValue(true);
                    spyOn(require3, "isNoConnect").and.returnValue(false); // This require will cause "isReady" and "isConnected" to be false.

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(false);
                    expect(pm.isConnected()).toEqual(false);
                });
            });
        });

        describe("when multiple requires need to be ready/connected in an exclusion set", function () {
            describe("only one require is ready/connected", function () {
                it("sets `isReady` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isReady").and.returnValue(false);
                    spyOn(require2, "isReady").and.returnValue(true);
                    spyOn(require3, "isReady").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(false);
                });
                it("sets `isConnected` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(false);
                    spyOn(require2, "isConnected").and.returnValue(true);
                    spyOn(require3, "isConnected").and.returnValue(false);

                    pm.updateStatus();
                    expect(pm.isConnected()).toEqual(false);
                });
            });

            describe("necessary requires are ready/connected", function () {
                it("sets `isReady` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isReady").and.returnValue(false);
                    spyOn(require2, "isReady").and.returnValue(true);
                    spyOn(require3, "isReady").and.returnValue(true);

                    pm.updateStatus();
                    expect(pm.isReady()).toEqual(true);
                });
                it("sets `isConnected` correctly", function () {
                    const module = makeModule({
                        requires: requires
                    });

                    const pm = new PlacedModuleBuilder()
                        .withModule(module)
                        .build();
                    const require1 = pm.getRequireById(1);
                    const require2 = pm.getRequireById(2);
                    const require3 = pm.getRequireById(3);

                    spyOn(require1, "isConnected").and.returnValue(false);
                    spyOn(require2, "isConnected").and.returnValue(true);
                    spyOn(require3, "isConnected").and.returnValue(true);

                    pm.updateStatus();
                    expect(pm.isConnected()).toEqual(true);
                });
            })
        });
    });

    describe("anchors", function () {

        describe("initiates correctly", function () {
            it("has correct anchor points", function () {
                const designRev = new DesignRevisionBuilder().build();
                const module = new ModuleBuilder()
                    .withFeatures(new FootprintBuilder()
                        .rectangle(10, 20)
                        .build())
                    .build();
                designRev.addPlacedModuleFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    module_id: 1,
                    module_revision: 1,
                    revision_no: 1,
                    module_name: 'name',
                    x: 0,
                    y: 0,
                    rotation: 0,
                    custom_name: '',
                    choices: []
                }, module);
                const pm = designRev.getPlacedModules()[0];

                const top = pm.getAnchorByEdge('top');
                const right = pm.getAnchorByEdge('right');
                const bottom = pm.getAnchorByEdge('bottom');
                const left = pm.getAnchorByEdge('left');

                expect(top.point1.equals(new Point(10, 20))).toEqual(true);
                expect(top.point2.equals(new Point(0, 20))).toEqual(true);
                expect(right.point1.equals(new Point(10, 0))).toEqual(true);
                expect(right.point2.equals(new Point(10, 20))).toEqual(true);
                expect(bottom.point1.equals(new Point(0, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(10, 0))).toEqual(true);
                expect(left.point1.equals(new Point(0, 20))).toEqual(true);
                expect(left.point2.equals(new Point(0, 0))).toEqual(true);
            });
            it("has correct anchor points when rotated", function () {
                const designRev = new DesignRevisionBuilder().build();
                const module = new ModuleBuilder()
                    .withFeatures(new FootprintBuilder()
                        .rectangle(10, 20)
                        .build())
                    .build();
                designRev.addPlacedModuleFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    module_id: 1,
                    module_revision: 1,
                    revision_no: 1,
                    module_name: 'name',
                    x: 0,
                    y: 0,
                    rotation: 90,
                    custom_name: '',
                    choices: []
                }, module);
                const pm = designRev.getPlacedModules()[0];

                const top = pm.getAnchorByEdge('top');
                const right = pm.getAnchorByEdge('right');
                const bottom = pm.getAnchorByEdge('bottom');
                const left = pm.getAnchorByEdge('left');

                expect(top.point1.equals(new Point(0, 10))).toEqual(true);
                expect(top.point2.equals(new Point(-20, 10))).toEqual(true);
                expect(right.point1.equals(new Point(0, 0))).toEqual(true);
                expect(right.point2.equals(new Point(0, 10))).toEqual(true);
                expect(bottom.point1.equals(new Point(-20, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(0, 0))).toEqual(true);
                expect(left.point1.equals(new Point(-20, 10))).toEqual(true);
                expect(left.point2.equals(new Point(-20, 0))).toEqual(true);
            });
            it("has correct linked anchors", function () {
                const designRev = new DesignRevisionBuilder().build();
                const module = new ModuleBuilder()
                    .withFeatures(new FootprintBuilder()
                        .rectangle(10, 20)
                        .build())
                    .build();
                designRev.addPlacedModuleFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    module_id: 1,
                    module_revision: 1,
                    revision_no: 1,
                    module_name: 'name',
                    x: 0,
                    y: 0,
                    rotation: 0,
                    custom_name: '',
                    choices: []
                }, module);
                const pm = designRev.getPlacedModules()[0];

                const top = pm.getAnchorByEdge('top');
                const right = pm.getAnchorByEdge('right');
                const bottom = pm.getAnchorByEdge('bottom');
                const left = pm.getAnchorByEdge('left');

                expect(top.linkedAnchors.length).toEqual(2);
                expect(top.linkedAnchors).toBe(bottom.linkedAnchors);

                expect(right.linkedAnchors.length).toEqual(2);
                expect(right.linkedAnchors).toBe(left.linkedAnchors);

                expect(top.linkedAnchors.isLinkedTo(top)).toEqual(true);
                expect(top.linkedAnchors.isLinkedTo(bottom)).toEqual(true);
                expect(right.linkedAnchors.isLinkedTo(right)).toEqual(true);
                expect(right.linkedAnchors.isLinkedTo(left)).toEqual(true);
            });
        });

        describe("rotates correctly", function () {
            it("has correct anchor points when rotated", function () {
                const designRev = new DesignRevisionBuilder().build();
                const module = new ModuleBuilder()
                    .withFeatures(new FootprintBuilder()
                        .rectangle(10, 20)
                        .build())
                    .build();
                designRev.addPlacedModuleFromResource({
                    uuid: 'uuiduuid-uuid-uuid-uuiduuiduuid',
                    module_id: 1,
                    module_revision: 1,
                    revision_no: 1,
                    module_name: 'name',
                    x: 0,
                    y: 0,
                    rotation: 0,
                    custom_name: '',
                    choices: []
                }, module);
                const pm = designRev.getPlacedModules()[0];

                pm.rotate();

                const top = pm.getAnchorByEdge('top');
                const right = pm.getAnchorByEdge('right');
                const bottom = pm.getAnchorByEdge('bottom');
                const left = pm.getAnchorByEdge('left');

                expect(top.point1.equals(new Point(0, 10))).toEqual(true);
                expect(top.point2.equals(new Point(-20, 10))).toEqual(true);
                expect(right.point1.equals(new Point(0, 0))).toEqual(true);
                expect(right.point2.equals(new Point(0, 10))).toEqual(true);
                expect(bottom.point1.equals(new Point(-20, 0))).toEqual(true);
                expect(bottom.point2.equals(new Point(0, 0))).toEqual(true);
                expect(left.point1.equals(new Point(-20, 10))).toEqual(true);
                expect(left.point2.equals(new Point(-20, 0))).toEqual(true);
            });
        });
    });
});
