import {PlacedModule} from 'placedmodule/PlacedModule';
import events from "utils/events";
import makeModule from "../module/TestModule";
import {CODE_NOT_COMPATIBLE} from "../../src/bus/BusPriority";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";


function makePlacedModule(attributes?) {
    attributes = Object.assign({
        id: 20,
        x: 10,
        y: 20,
        rotation: 0,
        module: makeModule(),
        design_revision: new DesignRevisionBuilder().build(),
    }, attributes);

    return new PlacedModule(attributes);
}

function makeRequire(placedModule, attributes) {
    attributes = Object.assign({
        priorities: [],
        bus_group: {id: 12},
    }, attributes);
    return placedModule.addRequire(attributes);
}

function makeProvide(placedModule, attributes) {
    attributes = Object.assign({
        priorities: [],
        bus_group: {id: 12},
    }, attributes);
    return placedModule.addProvide(attributes);
}

describe("RequireBus", function () {

    beforeEach(function () {
        spyOn(events, "publish").and.callFake(()=>{});
    });

    it('returns the correct module uuid', function () {
        const placedModule = makePlacedModule();
        const pmUuid = placedModule.uuid;
        const bus = makeRequire(placedModule, {
            amount: '10'
        });
        expect(bus.getPlacedModuleUuid()).toEqual(pmUuid);
    });

    describe("priority", function () {
        it('sets the provide priority', function () {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {
                milliwatts: 10,
                is_power: true,
                priorities: [
                    {priority: 1, group: {id: 10, name: 'group'}},
                    {priority: 2, group: {id: 20, name: 'group2'}},
                ],
            });

            const provide = makeProvide(placedModule, {
                milliwatts: 100,
                is_power: true,
                priorities: [
                    {priority: 3, group: {id: 30, name: 'group3'}},
                    {priority: 2, group: {id: 20, name: 'group2'}}, // this group matches
                ],
            });

            require.setProvidePriority(provide);

            expect(provide.getPriority()).toEqual(2);
        });

        it("gives precedence to 'stop' priority when setting the provide connection priority", function () {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {
                milliwatts: 10,
                is_power: true,
                priorities: [
                    {priority: 3, group: {id: 30, name: 'group3'}},
                    {priority: 2, group: {id: 20, name: 'group2'}},

                ],
            });

            const provide = makeProvide(placedModule, {
                milliwatts: 100,
                is_power: true,
                priorities: [
                    {priority: 5, group: {id: 30, name: 'group3'}, emblem: {code: 'non-stop'}},
                    {priority: 2, group: {id: 20, name: 'group2'}, emblem: {code: CODE_NOT_COMPATIBLE}}, // this priority takes precedence
                ],
            });

            require.setProvidePriority(provide);
            expect(provide.hasStopPriority()).toBe(true);
            expect(provide.getBusPriority().emblem.code).toEqual(CODE_NOT_COMPATIBLE);
        });

        it("sets provide connection priority to highest priority pattern", function () {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {
                milliwatts: 10,
                is_power: true,
                priorities: [
                    {group: {id: 30, name: 'group3'}},
                    {group: {id: 20, name: 'group2'}},
                ],
            });

            const provide = makeProvide(placedModule, {
                milliwatts: 100,
                is_power: true,
                priorities: [
                    {priority: 1, group: {id: 30, name: 'group3'}, emblem: {code: 'low-priority'}},
                    {priority: 2, group: {id: 20, name: 'group2'}, emblem: {code: 'high-priority'}}, // this priority takes precedence
                ],
            });

            require.setProvidePriority(provide);
            expect(provide.getPriority()).toEqual(2);
            expect(provide.getBusPriority().emblem.code).toEqual('high-priority');
        });
    });

    describe('downstream provides initialization', function () {
        it('does not graph non-regulators', function () {
            const regulator = makePlacedModule();
            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
            });

            // Put this last so it inits after everything is set up.
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0, // Non-regulator if this is 0.
            });

            expect(regulatorIn.getGraphChildren().length).toEqual(0);
        });

        it('graphs power in to power out', function () {
            const regulator = makePlacedModule();
            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
            });

            // Put this last so it inits after everything is set up.
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
            });

            expect(regulatorIn.getGraphChildren().length).toEqual(1);
            expect(regulatorIn.getGraphChildren()[0]).toEqual(regulatorOut);
        });

        it('graphs power in to VLOGIC out', function () {
            const regulator = makePlacedModule();
            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
                templates: [{name: 'VLOGIC'}],
            });

            // Put this last so it inits after everything is set up.
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
            });

            expect(regulatorIn.getGraphChildren().length).toEqual(1);
            expect(regulatorIn.getGraphChildren()[0]).toEqual(regulatorOut);
        });

        it('does not graphs VLOGIC in to power out', function () {
            const regulator = makePlacedModule();
            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
            });

            // Put this last so it inits after everything is set up.
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
                templates: [{name: 'VLOGIC'}],
            });

            expect(regulatorIn.getGraphChildren().length).toEqual(0);
        });

        it('graphs VLOGIC in to VLOGIC out', function () {
            const regulator = makePlacedModule();
            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
                templates: [{name: 'VLOGIC'}],
            });

            // Put this last so it inits after everything is set up.
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
                templates: [{name: 'VLOGIC'}],
            });

            expect(regulatorIn.getGraphChildren().length).toEqual(1);
            expect(regulatorIn.getGraphChildren()[0]).toEqual(regulatorOut);
        });
    });

    describe('non-regulator power draw', function () {
        it('is correct', function () {
            const placedModule = makePlacedModule();
            const bus = makeRequire(placedModule, {
                milliwatts: 12,
                is_power: true,
                efficiency: 0, // Non-regulator if this is 0.
            });

            expect(bus.powerDraw).toEqual(12);
        });
    });

    describe('regulator power draw', function () {
        it('is correct when not connected', function () {
            const placedModule = makePlacedModule();
            const bus = makeRequire(placedModule, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5
            });

            expect(bus.powerDraw).toEqual(10);
        });

        it("is correct when connected", function () {
            const regulator = makePlacedModule();
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
            });

            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
            });

            const downstream = makePlacedModule({id: 30});
            const downstreamRequire = makeRequire(downstream, {
                milliwatts: 10,
                is_power: true,
            });

            regulatorIn.addGraphChild(regulatorOut);
            regulatorOut.addGraphParent(regulatorIn);
            downstreamRequire.connect(regulatorOut);
            expect(regulatorIn.powerDraw).toEqual(30);
        });
    });

    describe("isPowerSource", function () {
        it("is false for data bus", function () {
            const placedModule = makePlacedModule();
            const bus = makeRequire(placedModule, {
                is_power: false,
                num_connections: 4,
            });

            expect(bus.isPowerSource).toBe(false);
        });

        it("is true for unconnected power bus", function () {
            const placedModule = makePlacedModule();
            const bus = makeRequire(placedModule, {
                is_power: true,
                milliwatts: 10,
                templates: [],
            });

            expect(bus.isPowerSource).toBe(true);
        });

        it("is true for VLOGIC bus", function () {
            const placedModule = makePlacedModule();
            const bus = makeRequire(placedModule, {
                is_power: true,
                milliwatts: 10,
                templates: [{name: 'VLOGIC'}],
            });

            expect(bus.isPowerSource).toBe(true);
        });

        it("is false for connected power bus", function () {
            const regulator = makePlacedModule();
            const regulatorIn = makeRequire(regulator, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0.5,
            });

            const regulatorOut = makeProvide(regulator, {
                milliwatts: 100,
                is_power: true,
            });

            const downstream = makePlacedModule({id: 30});
            const downstreamRequire = makeRequire(downstream, {
                milliwatts: 10,
                is_power: true,
                templates: [],
            });

            regulatorIn.addGraphChild(regulatorOut);
            regulatorOut.addGraphParent(regulatorIn);
            downstreamRequire.connect(regulatorOut);

            expect(downstreamRequire.isPowerSource).toBe(false);
        });

        it("is false for connected VLOGIC bus", function () {
            const placedModule = makePlacedModule();
            makeRequire(placedModule, {
                milliwatts: 10,
                is_power: true,
                efficiency: 0,
            });

            const vlogicOut = makeProvide(placedModule, {
                milliwatts: 100,
                is_power: true,
                templates: [{name: 'VLOGIC'}],
            });

            const downstream = makePlacedModule({id: 30});
            const downstreamRequire = makeRequire(downstream, {
                milliwatts: 10,
                is_power: true,
                templates: [{name: 'VLOGIC'}],
            });

            downstreamRequire.connect(vlogicOut);

            expect(downstreamRequire.isPowerSource).toBe(false);
        });
    });

    describe("isHighPriority", function () {
        it("detects a high priority ProvideBus", function () {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {
                priorities: [{
                    group: {id: 1, name: 'group'},
                    priority: 1,
                }]
            });
            const provide = makeProvide(placedModule, {
                priorities: [{
                    group: {id: 1, name: 'group'},
                    priority: 1,
                }]
            });
            expect(require.isHighPriority(provide)).toBe(true);
        });

        it("detects a regular priority ProvideBus", function () {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {
                priorities: [{
                    group: {id: 1, name: 'group'},
                    priority: 1,
                }]
            });
            const provide = makeProvide(placedModule, {
                priorities: []
            });
            expect(require.isHighPriority(provide)).toBe(false);
        });
    });
    describe('isVlogicConnectionNotRequired', () => {
        it ('is false if bus does not implement VLOGIC', () => {
            const placedModule = makePlacedModule();
            const require = makeRequire(placedModule, {});
            expect(require.isVlogicConnectionNotRequired()).toEqual(false);
        });
        describe('implements VLOGIC', () => {
            it ('is true if there are no buses in the bus group to connect', () => {
                const placedModule = makePlacedModule();
                const require = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'VLOGIC'}],
                });
                expect(require.isVlogicConnectionNotRequired()).toEqual(true);
            });
            it ('is false if there are buses in the bus group to connect, but are not connected', () => {
                const placedModule = makePlacedModule();
                const require = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'VLOGIC'}],
                });
                const otherRequire = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'NOT VLOGIC'}],
                });
                expect(require.isVlogicConnectionNotRequired()).toEqual(false);
            });
            it ('is false if there are buses in the bus group to connect, and are connected', () => {
                const placedModule = makePlacedModule();
                const require = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'VLOGIC'}],
                });
                const otherRequire = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'NOT VLOGIC'}],
                });
                const providePlacedModule = makePlacedModule();
                const otherProvide = makeProvide(providePlacedModule, {
                    templates: [{name: 'NOT VLOGIC'}],
                });
                otherRequire.connect(otherProvide);
                expect(require.isVlogicConnectionNotRequired()).toEqual(false);
            });
            it ('is false if there are buses in the bus group to connect, are optional, but not set to NC', () => {
                const placedModule = makePlacedModule();
                const require = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'VLOGIC'}],
                });
                const otherRequire = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'NOT VLOGIC'}],
                    is_optional: false,
                });

                expect(require.isVlogicConnectionNotRequired()).toEqual(false);
            });
            it ('is true if there are buses in the bus group to connect, are optional, and set to NC', () => {
                const placedModule = makePlacedModule();
                const require = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'VLOGIC'}],
                });
                const otherRequire = makeRequire(placedModule, {
                    bus_group: {id: 12},
                    templates: [{name: 'NOT VLOGIC'}],
                    is_optional: true,
                });
                otherRequire.makeNoConnect();

                expect(require.isVlogicConnectionNotRequired()).toEqual(true);
            });
        });
    });
});
