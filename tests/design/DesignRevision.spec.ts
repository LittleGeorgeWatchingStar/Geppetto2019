import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {
    DesignRevision,
    EVENT_ADD_LOGO,
    EVENT_ADD_MODULE
} from '../../src/design/DesignRevision';
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {busResource, groupResource} from "../bus/TestBus";
import makeModule from "../module/TestModule";
import {FeatureBuilder} from "../module/feature/FeatureBuilder";
import {PlacedLogoBuilder, testSvgData} from "../placedlogo/PlacedLogoBuilder";
import {DesignRevisionBuilder} from "./DesignRevisionBuilder";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ModuleAnchorBuilder} from "../dimension/Anchor/ModuleAnchorBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {overrideDesignRevision} from "./TestDesign";
import {actions, executeAction, ReversibleAction} from "../../src/core/action";
import {createSpatialIndexer} from "../../src/path/spatialindexer/SpatialIndexer";

function makeProvideBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new ProvideBus(attributes);
}

function makeRequireBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new RequireBus(attributes);
}

describe("DesignRevision", function () {

    it("has the correct revision number", function () {
        const rev = new DesignRevisionBuilder().withTitle('2').build();
        expect(rev.getTitle()).toEqual('2');
    });

    it('generates the correct URL', function () {
        const rev = new DesignRevisionBuilder().withId(2).build();
        expect(rev.url()).toEqual('/api/v3/design/revision/2/');
    });

    describe('clone', function () {
        /**
         * If placed logos are clone, when you 'save as' the reference between
         * the model and view are lost
         */
        it ('does not clone placed logos', function () {
            const rev = new DesignRevisionBuilder().build();
            const pl = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .build();
            const clonedRev = rev.clone();
            const clonedPl = clonedRev.getPlacedLogos()[0];

            expect(pl).toBe(clonedPl);
        });

        /**
         * If placed modules are clone, when you 'save as' the reference between
         * the model and view are lost
         */
        it ('does not clone placed modules', function () {
            const rev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(rev)
                .build();
            const clonedRev = rev.clone();
            const clonedPm = clonedRev.getPlacedModules()[0];

            expect(pm).toBe(clonedPm);
        });
    });

    it('adds edge constraints', function () {
        const rev = new DesignRevisionBuilder().build();

        const points = [
            {x: 0, y: 0}, // bottom-left corner
            {x: 0, y: 30} // top-left corner
        ];
        const placedModule = new PlacedModuleBuilder()
            .withModule(new ModuleBuilder().build())
            .build();
        const edgeFeature = new FeatureBuilder()
            .withType('edge')
            .withPoints(points)
            .build();
        const edge = new ModuleAnchorBuilder()
            .withFeature(edgeFeature)
            .withDimensionable(placedModule)
            .build();

        rev.addEdgeConstraint(edge, 'left');

        const dimensions = rev.dimensions;
        expect(dimensions.length).toEqual(1);

        const dimension = dimensions[0];
        expect(dimension.isEdgeConstraint()).toBe(true);
    });

    describe("computeOverlaps", function () {
        function hasOverlaps(rev: DesignRevision): boolean {
            return rev.getPlacedModules().some(pm => pm.overlaps()) ||
                rev.getPlacedLogos().some(pl => pl.overlaps());
        }

        describe("with no placed items", function () {
            it("has no overlaps", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
        });

        describe("with one module", function () {
            it("has no overlaps if the module is within bounds", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule(), {x: 0, y: 0});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has overlaps if the module is off the left edge", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule(), {x: -1, y: 0});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
            it("has overlaps if the module is off the right edge", function () {
                const rev = new DesignRevisionBuilder().withDimension(100, 100).build();
                rev.addModule(makeModule(), {x: 99, y: 0});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
            it("has overlaps if the module is off the top edge", function () {
                const rev = new DesignRevisionBuilder().withDimension(100, 100).build();
                rev.addModule(makeModule(), {x: 30, y: 98});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
        });

        // Each module is 3x3
        describe("with two modules", function () {
            it("has no overlaps if they don't touch", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule(), {x: 0, y: 0});
                rev.addModule(makeModule(), {x: 4, y: 4});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has no overlaps if they share an edge", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule(), {x: 0, y: 0});
                rev.addModule(makeModule(), {x: 3, y: 1});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has overlaps if they overlap", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule(), {x: 0, y: 0});
                rev.addModule(makeModule(), {x: 2, y: 1});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
        });

        describe("with one one logo", function () {
            it("has no overlaps if the logo is within bounds", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has overlaps if the logo is off the left edge", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(-5, 0)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
            it("has overlaps if the logo is off the right edge", function () {
                const rev = new DesignRevisionBuilder().withDimension(100, 100).build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(99, 0)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
            it("has overlaps if the logo is off the top edge", function () {
                const rev = new DesignRevisionBuilder().withDimension(100, 100).build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(30, 98)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
        });

        describe("with two logos", function () {
            it("has no overlaps if they don't touch", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(4, 4)
                    .withSize(3, 3)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has no overlaps if they share an edge", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(3, 1)
                    .withSize(3, 3)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has overlaps if they overlap", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(2, 1)
                    .withSize(3, 3)
                    .build();
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
        });

        // Each module is 3x3
        describe("with one module and one logo", function () {
            it("has no overlaps if they don't touch", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                rev.addModule(makeModule(), {x: 4, y: 4});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has no overlaps if they share an edge", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                rev.addModule(makeModule(), {x: 3, y: 1});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(false);
            });
            it("has overlaps if they overlap", function () {
                const rev = new DesignRevisionBuilder().build();
                new PlacedLogoBuilder()
                    .withDesignRevision(rev)
                    .withPosition(0, 0)
                    .withSize(3, 3)
                    .build();
                rev.addModule(makeModule(), {x: 2, y: 1});
                rev.computeOverlaps();
                expect(hasOverlaps(rev)).toBe(true);
            });
        });
    });

    describe("updateElectrical", function () {
        function addPowerRequire(designRev: DesignRevision,
                                 milliwatts: number): RequireBus {
            const pm = designRev.addModule(makeModule(), {x: 0, y: 0});
            pm.addBusGroup(groupResource());
            return pm.addRequire(busResource({
                power: true,
                is_power: true,
                milliwatts: milliwatts,
                efficiency: 0,
            }));
        }

        function addPowerProvide(designRev: DesignRevision,
                                 capacity: number): ProvideBus {
            const pm = designRev.addModule(makeModule(), {x: 0, y: 0});
            pm.addBusGroup(groupResource());
            return pm.addProvide(busResource({
                power: true,
                is_power: true,
                milliwatts: capacity,
                efficiency: 0,
            }));
        }

        function addRegulator(designRev: DesignRevision,
                              milliwatts: number,
                              efficiency: number): PlacedModule {
            return designRev.addModule(makeModule({
                bus_groups: [
                    groupResource()
                ],
                requires: [
                    busResource({
                        name: 'reg-in',
                        power: true,
                        is_power: true,
                        milliwatts: milliwatts,
                        efficiency: efficiency,
                    })
                ],
                provides: [
                    busResource({
                        name: 'reg-out',
                        power: true,
                        is_power: true,
                        milliwatts: 100,
                    })
                ]
            }), {x: 0, y: 0});
        }


        describe("updateUsage", function () {
            it("is zero with only one provider", function () {
                const rev = new DesignRevisionBuilder().build();
                const provide = addPowerProvide(rev, 200);
                rev.updateElectrical();
                expect(provide.used).toEqual(0)
            });
            it("is correct with one requirer", function () {
                const rev = new DesignRevisionBuilder().build();
                const provide = addPowerProvide(rev, 200);
                const require = addPowerRequire(rev, 33);
                rev.addConnectionFromBuses(require, provide);
                rev.updateElectrical();
                expect(provide.used).toEqual(33)
            });
            it("is correct with a power regulator", function () {
                const rev = new DesignRevisionBuilder().build();
                const barrel = addPowerProvide(rev, 1000);
                const regulator = addRegulator(rev, 0, 0.5);
                const regIn = regulator.findRequire(r => r.name === 'reg-in');
                const regOut = regulator.findProvide(p => p.name === 'reg-out');
                const widget = addPowerRequire(rev, 55);
                rev.addConnectionFromBuses(regIn, barrel);
                rev.addConnectionFromBuses(widget, regOut);
                rev.updateElectrical();
                expect(barrel.used).toEqual(110);
                expect(regOut.used).toEqual(55);
            });
        });

        describe("updateOptions", function () {
            it("has no options when no provides exist", function () {
                const rev = new DesignRevisionBuilder().build();
                const require = addPowerRequire(rev, 33);
                rev.updateElectrical();
                expect(require.isReady()).toBe(false);
            });
            it("has options when a matching provide exists", function () {
                const rev = new DesignRevisionBuilder().build();
                const require = addPowerRequire(rev, 33);
                addPowerProvide(rev, 200);
                rev.updateElectrical();
                expect(require.isReady()).toBe(true);
            });

            it("has no options if updateElectrical() is not called", function () {
                const rev = new DesignRevisionBuilder().build();
                const require = addPowerRequire(rev, 33);
                addPowerProvide(rev, 200);
                expect(require.isReady()).toBe(false);
            });
            it("has only matching options", function () {
                const rev = new DesignRevisionBuilder().build();
                const require = addPowerRequire(rev, 33);
                const matching = addPowerProvide(rev, 200).getPlacedModule();
                const wrongTemplate = rev.addModule(makeModule(), {x: 0, y: 0});
                wrongTemplate.addProvide(busResource({
                    templates: [{id: 45, name: 'FOO', power: true}],
                }));
                const wrongLevels = rev.addModule(makeModule(), {x: 0, y: 0});
                wrongLevels.addBusGroup({
                    id: 13,
                    levels: ['5.5'],
                    title: 'wrong'
                });
                wrongLevels.addProvide(busResource({
                    bus_group: {id: 13}
                }));
                rev.updateElectrical();
                expect(matching.uuid in require.getOptions()).toBe(true, 'matching?');
                expect(wrongTemplate.uuid in require.getOptions()).toBe(false, 'wrong template?');
                expect(wrongLevels.uuid in require.getOptions()).toBe(false, 'wrong levels?');
            });
        });

        describe("updateStatuses", function () {
            describe("isReady", function () {
                it("is true with no requirers", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerProvide(rev, 200);
                    rev.updateElectrical();
                    expect(rev.board.isReady()).toBe(true);
                });
                it("is false with only one requirer", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerRequire(rev, 33);
                    rev.updateElectrical();
                    expect(rev.board.isReady()).toBe(false);
                });
                it("is true with a matching provider", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerProvide(rev, 200);
                    addPowerRequire(rev, 33);
                    rev.updateElectrical();
                    expect(rev.board.isReady()).toBe(true);
                });
            });
            describe("isConnected", function () {
                it("is true with no requirers", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerProvide(rev, 200);
                    rev.updateElectrical();
                    expect(rev.board.isConnected()).toBe(true);
                });
                it("is false with only one requirer", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerRequire(rev, 33);
                    rev.updateElectrical();
                    expect(rev.board.isConnected()).toBe(false);
                });
                it("is false with an unconnected provider", function () {
                    const rev = new DesignRevisionBuilder().build();
                    addPowerProvide(rev, 200);
                    addPowerRequire(rev, 33);
                    rev.updateElectrical();
                    expect(rev.board.isConnected()).toBe(false);
                });
                it("is true with a connected provider", function () {
                    const rev = new DesignRevisionBuilder().build();
                    const provide = addPowerProvide(rev, 200);
                    const require = addPowerRequire(rev, 33);
                    rev.addConnectionFromBuses(require, provide);
                    rev.updateElectrical();
                    expect(rev.board.isConnected()).toBe(true);
                });
            });
        });
    });

    describe("getComponentsPrice", function () {
        it("is zero with no components", function () {
            const rev = new DesignRevisionBuilder().build();
            expect(rev.getComponentsPrice()).toEqual(0);
        });

        it("sums up correctly", function () {
            const rev = new DesignRevisionBuilder().build();
            rev.addModule(makeModule({price: 4.99}), {x: 0, y: 0});
            rev.addModule(makeModule({price: 0.12}), {x: 0, y: 0});

            expect(rev.getComponentsPrice()).toEqual(4.99 + 0.12);
        });
    });

    describe("toJSON", function () {
        /** Make sure the Board Module is deprecated. */
        it("does not include the board", function () {
            const rev = new DesignRevisionBuilder().build();
            const result = rev.toJSON();
            expect(result.placed_modules.length).toEqual(0);
        });

        describe("placed modules", function () {
            it("is included", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule({
                    revision_id: 32,
                }), {x: 44, y: 132});
                const result = rev.toJSON();
                const modules = result.placed_modules;
                expect(modules.length).toEqual(1);
            });
            it("has the correct coordinates", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule({
                    revision_id: 32,
                }), {x: 44, y: 132});
                const result = rev.toJSON();
                const module = result.placed_modules[0];
                expect(module.x).toEqual(44);
                expect(module.y).toEqual(132);
            });
            it("is the correct module revision", function () {
                const rev = new DesignRevisionBuilder().build();
                rev.addModule(makeModule({
                    revision_id: 32,
                }), {x: 44, y: 132});
                const result = rev.toJSON();
                const module = result.placed_modules[0];
                expect(module.module_revision).toEqual(32);
            });
        });

        describe("placed logos", function () {
            it("is included", function () {
                const pl = new PlacedLogoBuilder().build();
                const rev = pl.designRevision;
                const result = rev.toJSON();
                const logos = result.placed_logos;
                expect(logos.length).toEqual(1);
            });
            it("has the correct coordinates", function () {
                const pl = new PlacedLogoBuilder()
                    .withPosition(44, 132)
                    .build();
                const rev = pl.designRevision;
                const result = rev.toJSON();
                const logo = result.placed_logos[0];
                expect(logo.x).toEqual(44);
                expect(logo.y).toEqual(132);
            });
            it("has the correct size", function () {
                const pl = new PlacedLogoBuilder()
                    .withSize(132, 44)
                    .build();
                const rev = pl.designRevision;
                const result = rev.toJSON();
                const logo = result.placed_logos[0];
                expect(logo.width).toEqual(132);
                expect(logo.height).toEqual(44);
            });
        });
    });

    describe("resetConnectingModules", function () {
        it("resets provide buses", function () {
            const rev = new DesignRevisionBuilder().build();
            const provider = rev.addModule(makeModule({
                provides: [{name: 'provide', bus_group: {id: 1}}]
            }), {x: 0, y: 0});

            const provide = provider.findProvide(p => p.name === 'provide');
            provide.setBusPriority({} as any);

            rev.resetConnectingModules();
            expect(provide.getBusPriority()).toBeNull();
        });
    });

    describe("on placed module", function () {
        describe("add", function () {
            it("works the way I think it does", function () {
                const rev = new DesignRevisionBuilder().build();
                let called = false;
                const callback = () => called = true;
                rev.on(EVENT_ADD_MODULE, callback);
                rev.trigger(EVENT_ADD_MODULE);
                expect(called).toBe(true);
            });

            it("dispatches an event", function () {
                const rev = new DesignRevisionBuilder().build();
                let called = false;
                const callback = () => called = true;
                rev.on(EVENT_ADD_MODULE, callback);
                rev.addModule(makeModule(), {x: 0, y: 0});
                expect(called).toBe(true);
            });
        });
    });

    describe("on placed module remove", function () {
        it("updates electrical status of the board", function () {
            const rev = new DesignRevisionBuilder().build();
            const module = makeModule();
            const placedModule = rev.addModule(module, {x: 0, y: 0});
            placedModule.addBusGroup(groupResource());
            placedModule.addRequire(busResource({
                power: true,
                is_power: true,
                milliwatts: 12,
                efficiency: 0,
            }));
            rev.updateElectrical();
            expect(rev.board.isReady()).toBe(false);
            rev.removePlacedModule(placedModule);
            expect(rev.board.isReady()).toBe(true);
        });
    });

    describe("on placed logo", function () {
        describe("add", function () {
            it("works the way I think it does", function () {
                const rev = new DesignRevisionBuilder().build();
                let called = false;
                const callback = () => called = true;
                rev.on(EVENT_ADD_LOGO, callback);
                rev.trigger(EVENT_ADD_LOGO);
                expect(called).toBe(true);
            });

            it("dispatches an event", function () {
                const rev = new DesignRevisionBuilder().build();
                let called = false;
                const callback = () => called = true;
                rev.on(EVENT_ADD_LOGO, callback);
                rev.addLogo(testSvgData, {x: 0, y: 0});
                expect(called).toBe(true);
            });
        });
    });

    describe("hasModule", function () {
        it("returns true when it does", function () {
            const pm = new PlacedModuleBuilder().build();
            expect(pm.designRevision.hasModule(pm.module)).toBe(true);
        });

        it("returns false when it does not", function () {
            const pm = new PlacedModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            expect(designRev.hasModule(pm.module)).toBe(false);
        });
    });

    describe("dimensionBoard", function () {
        it("applies dimensions to the board", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.dimensionBoard();
            expect(designRev.board.dimensions.length).toEqual(2);
        });

        it("does not change the board's default dimensions", function () {
            const designRev = new DesignRevisionBuilder().build();
            const board = designRev.board;
            const beforeWidth = board.width;
            const beforeHeight = board.height;
            designRev.dimensionBoard();
            expect(beforeWidth).toEqual(board.width);
            expect(beforeHeight).toEqual(board.height);
        });
    });

    describe("Dirty status", function () {
        it("is false by default", function () {
            const designRev = new DesignRevisionBuilder().build();
            expect(designRev.isDirty()).toBe(false);
        });

        it("is set true by action execution", function () {
            const designRev = new DesignRevisionBuilder().build();
            overrideDesignRevision(designRev);
            executeAction({execute: () => {}});
            expect(designRev.isDirty()).toBe(true);
        });

        it("is set true by action undo", function () {
            const designRev = new DesignRevisionBuilder().build();
            overrideDesignRevision(designRev);
            executeAction({execute: () => {}, reverse: () => {}} as ReversibleAction);
            designRev.clearDirty();
            actions.undo();
            expect(designRev.isDirty()).toBe(true);
        });
    });
    describe("Paths", function () {
        it("does not call find path if there are not paths", function () {
            const designRev = new DesignRevisionBuilder()
                .withDimension(100, 200)
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(0);
        });
        it("calls find path if there are paths", function () {
            const designRev = new DesignRevisionBuilder()
                .withDimension(100, 200)
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            const requirer = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = makeRequireBus(requirer, {
                proximity_point: {x: 3, y: 3},
            });

            const provider = designRev.addModule(new ModuleBuilder().build(), {x: 10, y: 3});
            const provide = makeProvideBus(provider, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });

            const connection = designRev.addConnectionFromBuses(require, provide);

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(1);
        });
        it("calls find path with correct spatial index tree data", function () {
            const designRev = new DesignRevisionBuilder()
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            const requirer = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = makeRequireBus(requirer, {
                proximity_point: {x: 3, y: 3},
            });

            const provider = designRev.addModule(new ModuleBuilder().build(), {x: 10, y: 3});
            const provide = makeProvideBus(provider, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });

            const connection = designRev.addConnectionFromBuses(require, provide);

            const obstacle1 = designRev.addModule(new ModuleBuilder().build(), {x: 1, y: 1});
            const obstacle2 = designRev.addModule(new ModuleBuilder().build(), {x: 4, y: 2});

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(1);
            const treeData = findPathsSpy.calls.mostRecent().args[0]['spatialIndexTreeData'];
            const expectedSpatialIndexer = createSpatialIndexer()
                .insertBoundary(designRev.board)
                .insertObstacles([
                    requirer,
                    provider,
                    obstacle1,
                    obstacle2,
                ]);
            const expectedTreeData = expectedSpatialIndexer.toJSON();
            expect(treeData).toEqual(expectedTreeData);
        });
        it("calls find path with correct pathFinds", function () {
            const designRev = new DesignRevisionBuilder()
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            const requirer = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = makeRequireBus(requirer, {
                proximity_point: {x: 3, y: 3},
            });

            const provider = designRev.addModule(new ModuleBuilder().build(), {x: 10, y: 3});
            const provide = makeProvideBus(provider, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });

            const connection = designRev.addConnectionFromBuses(require, provide);

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(1);
            const pathFinds = findPathsSpy.calls.mostRecent().args[0]['findPathAttributes'];
            expect(pathFinds).toEqual([
                {
                    uuid: jasmine.any(String),
                    spec: connection.pathSpec,
                    start: connection.startPoint,
                    end: connection.endPoint,
                }
            ]);
        });
        it("calls find path with correct pathFinds if proximity point is null", function () {
            const designRev = new DesignRevisionBuilder()
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            // Has path.
            const requirer = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = makeRequireBus(requirer, {
                proximity_point: {x: 3, y: 3},
            });
            const provider = designRev.addModule(new ModuleBuilder().build(), {x: 10, y: 3});
            const provide = makeProvideBus(provider, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });
            const connection = designRev.addConnectionFromBuses(require, provide);

            // Does not have path
            const requirer2 = designRev.addModule(new ModuleBuilder().build(), {x: 3, y: 3});
            const require2 = makeRequireBus(requirer2, {
                proximity_point: {x: 3, y: 3},
            });
            const provider2 = designRev.addModule(new ModuleBuilder().build(), {x: 6, y: 6});
            const provide2 = makeProvideBus(provider2, {
                proximity_point: null,
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });
            const connection2 = designRev.addConnectionFromBuses(require2, provide2);

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(1);
            const pathFinds = findPathsSpy.calls.mostRecent().args[0]['findPathAttributes'];
            expect(pathFinds).toEqual([
                {
                    uuid: jasmine.any(String),
                    spec: connection.pathSpec,
                    start: connection.startPoint,
                    end: connection.endPoint,
                }
            ]);
        });
        it("calls find path with correct pathFinds if path spec is null", function () {
            const designRev = new DesignRevisionBuilder()
                .build();
            const findPathsSpy = spyOn(designRev.PathFinderWorker, 'findPaths');

            // Has path.
            const requirer = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = makeRequireBus(requirer, {
                proximity_point: {x: 3, y: 3},
            });
            const provider = designRev.addModule(new ModuleBuilder().build(), {x: 10, y: 3});
            const provide = makeProvideBus(provider, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: 0,
                max_path_length: 12,
            });
            const connection = designRev.addConnectionFromBuses(require, provide);

            // Does not have path
            const requirer2 = designRev.addModule(new ModuleBuilder().build(), {x: 3, y: 3});
            const require2 = makeRequireBus(requirer2, {
                proximity_point: {x: 3, y: 3},
            });
            const provider2 = designRev.addModule(new ModuleBuilder().build(), {x: 6, y: 6});
            const provide2 = makeProvideBus(provider2, {
                proximity_point: {x: 0, y: 0},
                path_width: 4,
                min_path_length: null, // Will make path spec null.
                max_path_length: 12,
            });
            const connection2 = designRev.addConnectionFromBuses(require2, provide2);

            designRev.computePathIntersections();

            expect(findPathsSpy).toHaveBeenCalledTimes(1);
            const pathFinds = findPathsSpy.calls.mostRecent().args[0]['findPathAttributes'];
            expect(pathFinds).toEqual([
                {
                    uuid: jasmine.any(String),
                    spec: connection.pathSpec,
                    start: connection.startPoint,
                    end: connection.endPoint,
                }
            ]);
        });
    });
});
