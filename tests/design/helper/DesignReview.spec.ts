import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {ModuleBuilder} from "../../module/ModuleBuilder";
import {busResource} from "../../bus/TestBus";
import {
    filterModuleRecommendations,
    filterUnconnectedConsolePorts,
    filterUnconnectedReset, findDuplicatePower,
    isSuspiciousCornerRadius
} from "../../../src/design/helper/DesignReview";
import {BusResource} from "../../../src/bus/api";
import {ModuleResourceBuilder} from "../../module/ModuleResourceBuilder";
import {Module} from "../../../src/module/Module";

describe("DesignValidation", () => {

    describe("Filter unconnected console ports", () => {
        function makeSystemConsoleBus(): BusResource {
            return busResource({
                priorities: [{
                    priority: 1,
                    group: {
                        id: '2',
                        name: 'System Console'
                    },
                    message: 'Sad',
                    emblem: {}
                }]
            });
        }

        it("returns console port buses", () => {
            const design = new DesignRevisionBuilder().build();
            const pm = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(makeSystemConsoleBus());
            const buses = filterUnconnectedConsolePorts(design);
            expect(buses.length).toEqual(1);
        });

        it("does not return buses that have a custom recommendation", () => {
            const design = new DesignRevisionBuilder().build();
            const bus = makeSystemConsoleBus();
            const pm = design.addModule(new ModuleBuilder()
                .withBusRecommendations([{
                        provide_bus_ids: [bus.id],
                        suggested_module_ids: [],
                        warning: 'Sadness'
                    }])
                .build(), {x: 0, y: 0});
            pm.addProvide(bus);
            const buses = filterUnconnectedConsolePorts(design);
            expect(buses.length).toEqual(0);
        });
    });

    describe("Filter unconnected RESET", () => {
        function makeResetBus(): BusResource {
            return busResource({
                name: 'nRESET',
                templates: [
                    {id: 44, name: 'RESET', power: true}
                ]
            });
        }

        it("returns RESET buses", () => {
            const design = new DesignRevisionBuilder().build();
            const pm = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(makeResetBus());
            const buses = filterUnconnectedReset(design);
            expect(buses.length).toEqual(1);
        });

        it("does not return buses that have a custom recommendation", () => {
            const design = new DesignRevisionBuilder().build();
            const bus = makeResetBus();
            const pm = design.addModule(new ModuleBuilder()
                .withBusRecommendations([{
                    provide_bus_ids: [bus.id],
                    suggested_module_ids: [],
                    warning: 'Very sad'
                }])
                .build(), {x: 0, y: 0});
            pm.addProvide(bus);
            const buses = filterUnconnectedReset(design);
            expect(buses.length).toEqual(0);
        });
    });

    describe("Filter module recommendations", () => {
        it("returns module recommendations that aren't yet fulfilled", () => {
            const resource = new ModuleResourceBuilder().withModuleId(1).build();
            const design = new DesignRevisionBuilder().build();
            design.addModule(new Module(resource), {x: 0, y: 0});
            const recommendation = {
                modules: [new ModuleResourceBuilder().withModuleId(14).build()],
                warning: 'Ban inheritance! Ban JavaScript classes!'
            };
            const unfulfilled = filterModuleRecommendations(design, [recommendation]);
            expect(unfulfilled.length).toEqual(1);
        });

        it("doesn't return recommendations that have been fulfilled", () => {
            const resource = new ModuleResourceBuilder().build();
            const design = new DesignRevisionBuilder().build();
            design.addModule(new Module(resource), {x: 0, y: 0});
            const recommendation = {
                modules: [resource],
                warning: 'Ban inheritance! Ban JavaScript classes!'
            };
            const unfulfilled = filterModuleRecommendations(design, [recommendation]);
            expect(unfulfilled.length).toEqual(0);
        });
    });

    describe("Suspicious corner radius", () => {
        it("returns false if it is 0", () => {
            const design = new DesignRevisionBuilder().build();
            design.board.setCornerRadius(0);
            expect(isSuspiciousCornerRadius(design)).toBe(false);
        });

        it("returns true if 0 < N < 1.0", () => {
            const design = new DesignRevisionBuilder().build();
            design.board.setCornerRadius(0.9);
            expect(isSuspiciousCornerRadius(design)).toBe(true);
        });
    });

    // TODO fix the undefined bus group/voltage domain shenanigans
    xdescribe("Find duplicate power", () => {
        function makeTemplateBus() {
            return busResource({
                templates: [
                    {id: 14, name: 'Suffering', power: true}
                ]
            });
        }

        it("can find modules that have the same output and same power source", () => {
            const design = new DesignRevisionBuilder().build();
            const pm = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(makeTemplateBus());
            const req1 = pm.addRequire(busResource());
            const pm2 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm2.addProvide(makeTemplateBus());
            const req2 = pm2.addRequire(busResource());
            const pm3 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const prov = pm3.addProvide(busResource());
            design.connectPair(req1, prov);
            design.connectPair(req2, prov);
            const dupeGroups = findDuplicatePower(design);
            expect(Object.keys(dupeGroups).length).toEqual(1);
        });

        it("excludes modules that have the same power source, but not the same output", () => {
            const design = new DesignRevisionBuilder().build();
            const pm = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(makeTemplateBus());
            const req1 = pm.addRequire(busResource());
            const pm2 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm2.addProvide(busResource({
                templates: [
                    {id: 23, name: 'Pain', power: true}
                ]
            }));
            const req2 = pm2.addRequire(busResource());
            const pm3 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const prov = pm3.addProvide(busResource());
            design.connectPair(req1, prov);
            design.connectPair(req2, prov);
            const dupeGroups = findDuplicatePower(design);
            expect(Object.keys(dupeGroups).length).toEqual(0);
        });

        it("excludes modules that have the same output, but not the same power source", () => {
            const design = new DesignRevisionBuilder().build();
            const pm = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(makeTemplateBus());
            const req1 = pm.addRequire(busResource());
            const pm2 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm2.addProvide(makeTemplateBus());
            pm2.addRequire(busResource());
            const pm3 = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const prov = pm3.addProvide(busResource());
            design.connectPair(req1, prov);
            const dupeGroups = findDuplicatePower(design);
            expect(Object.keys(dupeGroups).length).toEqual(0);
        });

        it("excludes modules that have the same data output and source", () => {
        });

        it("doesn't show the same modules in multiple groups", () => {
        });
    });
});
