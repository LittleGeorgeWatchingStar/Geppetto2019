import {BusGroup} from "../../src/bus/BusGroup";
import {CODE_NOT_COMPATIBLE} from "../../src/bus/BusPriority";
import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import makeModule from "../module/TestModule";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

describe("ProvideBus", () => {

    function makeProvideBus(attributes, placedModule={}) {
        attributes.placed_module = placedModule;
        return new ProvideBus(attributes);
    }

    function makeRequireBus(attributes, placedModule={}) {
        attributes.placed_module = placedModule;
        return new RequireBus(attributes);
    }

    function makeBusGroup(...levels) {
        return new BusGroup({
            levels: levels,
        });
    }

    function getMockedPM() {
        return {
            id: 20,
            getProvideById: (id) => {
                return {
                    id: id,
                    hasGraphChildren: () => {
                        return true;
                    }
                };
            }
        };
    }

    describe("isMatch", () => {
        it('does not match a different bus template', () => {
            const provideBus = makeProvideBus({
                level_type: 'fixed',
                busgroup: makeBusGroup(3.3),
                templates: [
                    {id: 2}
                ]
            });
            const require = new RequireBus({
                level_type: 'fixed',
                busgroup: makeBusGroup(3.3),
                templates: [
                    {id: 1},
                    {id: 3}
                ]
            }, {});
            expect(provideBus.isMatch(require)).toBeFalsy();
        });

        it('matches fixed 3.3 to fixed 3.3', () => {
            const provideBus = makeProvideBus({
                level_type: 'fixed',
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ],
                num_connections: 2,
            });
            const require = new RequireBus({
                level_type: 'fixed',
                busgroup: makeBusGroup("3.3"),
                templates: [
                    {id: 1},
                    {id: 2}
                ],
                is_power: false,
                num_connections: 2,
            }, {});
            expect(provideBus.isMatch(require)).toBeTruthy();
        });

        it('does not match fixed 3.3 to fixed 1.8', () => {
            const provideBus = makeProvideBus({
                level_type: 'fixed',
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ]
            });
            const require = new RequireBus({
                level_type: 'fixed',
                busgroup: makeBusGroup('1.8'),
                templates: [
                    {id: 1},
                    {id: 2}
                ]
            }, {});

            expect(provideBus.isMatch(require)).toBeFalsy();
        });

        it('matches require bus power requirement (500mW)', () => {
            const provideBus = makeProvideBus({
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ],
                is_power: true,
                milliwatts: 501,
            });
            const require = new RequireBus({
                is_power: true,
                busgroup: makeBusGroup("3.3"),
                templates: [
                    {id: 2}
                ],
                milliwatts: 500,
            }, {});

            expect(provideBus.isMatch(require)).toBeTruthy();
        });

        xit('does not match require bus power requirement (500mW)', () => {
            const provideBus = makeProvideBus({
                is_power: true,
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ],
                milliwatts: 499,
            });
            const require = new RequireBus({
                is_power: true,
                busgroup: makeBusGroup("3.3"),
                templates: [
                    {id: 2}
                ],
                milliwatts: 501,
            }, {});

            expect(provideBus.isMatch(require)).toBeFalsy();
        });

        xit('does not match number of connections required (4)', () => {
            const provideBus = makeProvideBus({
                is_power: false,
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ],
                num_connections: 3,
            });
            const require = new RequireBus({
                is_power: false,
                busgroup: makeBusGroup("3.3"),
                templates: [
                    {id: 2}
                ],
                num_connections: 4,
            }, {});

            expect(provideBus.isMatch(require)).toBeFalsy();
        });

        it('matches number of connections required (4)', () => {
            const provideBus = makeProvideBus({
                is_power: false,
                busgroup: makeBusGroup('3.3'),
                templates: [
                    {id: 2}
                ],
                num_connections: 5,
            });
            const require = new RequireBus({
                is_power: false,
                busgroup: makeBusGroup("3.3"),
                templates: [
                    {id: 2}
                ],
                num_connections: 5,
            }, {});

            expect(provideBus.isMatch(require)).toBeTruthy();
        });

        describe("requires with exclusions", () => {
            const template1Attributes = {
                id: 1,
                name: 'LINE IN',
                is_power: false
            };

            const template2Attributes = {
                id: 2,
                name: 'ADC',
                is_power: false
            };

            const requireBusGroupAttributes = {
                id: 1,
                title: "Audio and ADC",
                levels: ["1.8", "2.5"]
            };

            const require1Attributes = {
                id: 1,
                name: "LINE IN",
                is_power: false,
                num_connections: 1,
                milliwatts: 0,
                efficiency: 0,
                address: "",
                levels: ["1.8"],
                exclusions: [2],
                bus_group: requireBusGroupAttributes,
                templates: [template1Attributes],
            };

            const require2Attributes = {
                id: 2,
                name: "ADC 1",
                is_power: true,
                num_connections: 1,
                milliwatts: 0,
                efficiency: 0,
                address: "",
                levels: ["1.8"],
                exclusions: [1],
                bus_group: requireBusGroupAttributes,
                templates: [template2Attributes],
            };

            const requires = [
                require1Attributes,
                require2Attributes
            ];

            const provideBusGroup1Attributes = {
                id: 2,
                title: "Fixed 1.8",
                levels: ["1.8"]
            };

            const provideBusGroup2Attributes = {
                id: 3,
                title: "Fixed 2.5",
                levels: ["2.5"]
            };

            const provide1Attributes = {
                id: 1,
                name: "LINEIN",
                is_power: false,
                num_connections: 1,
                milliwatts: 0,
                efficiency: null,
                address: "",
                levels: ["1.8"],
                bus_group: provideBusGroup1Attributes,
                templates: [template1Attributes],
            };

            const provide2Attributes = {
                id: 2,
                name: "ADC0",
                is_power: false,
                num_connections: 1,
                milliwatts: 0,
                efficiency: null,
                address: "",
                levels: ["2.5"],
                bus_group: provideBusGroup2Attributes,
                templates: [template2Attributes],
            };

            const provides = [
                provide1Attributes,
                provide2Attributes,
            ];

            /**
             * Even though require(1) has set the determined levels for the
             * bus group, require (2) should ignore what (1) has set, because
             * (1) will be disconnected upon (2)'s connection due to the
             * exclusions.
             */
            it ("still matches when level is determined by a require from the current requires exclusion", function () {
                // make require module
                const requireModule = makeModule({
                    requires: requires,
                    bus_groups: [requireBusGroupAttributes],
                });
                const requirePm = new PlacedModuleBuilder()
                    .withModule(requireModule)
                    .build();
                const require1 = requirePm.getRequireById(1);
                const require2 = requirePm.getRequireById(2);

                // make provide module
                const provideModule = makeModule({
                    provides: provides,
                    bus_groups: [
                        provideBusGroup1Attributes,
                        provideBusGroup2Attributes
                    ],
                });
                const providePm = new PlacedModuleBuilder()
                    .withModule(provideModule)
                    .build();
                const provide1 = providePm.getProvideById(1);
                const provide2 = providePm.getProvideById(2);

                expect(provide1.isMatch(require1)).toEqual(true);
                expect(provide2.isMatch(require2)).toEqual(true);
                require1.connect(provide1);
                expect(provide1.isMatch(require1)).toEqual(true);
                expect(provide2.isMatch(require2)).toEqual(true);
            });
        });
    });

    it('reports mux exclusions', () => {
        const provideBus = makeProvideBus({
            exclusions: [55],
        }, getMockedPM());
        expect(provideBus.isExcluded()).toBeTruthy();
    });

    it('reports the lack of mux exclusions', () => {
        const provideBus = makeProvideBus({
            exclusions: [],
        }, getMockedPM());
        expect(provideBus.isExcluded()).toBeFalsy();
    });

    it('reports unconnected mux exclusions', () => {
        const pm = {
            id: 20,
            getProvideById: (id) => {
                return {
                    id: id,
                    hasGraphChildren: () => {
                        return false;
                    }
                };
            }
        };
        const provideBus = makeProvideBus({
            exclusions: [55],
        }, pm);
        expect(provideBus.isExcluded()).toBeFalsy();
    });

    describe('PathSpec', () => {
        describe('isDesignCreatedBeforePathSpec', () => {
            it('returns false if design has not been saved yet', () => {
                const rev = new DesignRevisionBuilder()
                    .build();
                const pm = {
                    id: 1,
                    designRevision: rev,
                };
                const bus = makeProvideBus({
                    path_width: 1,
                    min_path_length: 12,
                    max_path_length: 20,
                    path_created: new Date('Jan 1, 1000').toISOString()
                }, pm);
                expect(bus.isDesignCreatedBeforePathSpec()).toBe(false);
            });

            it('returns false if design is not created before path', () => {
                const rev = new DesignRevisionBuilder()
                    .withFirstSaved(new Date('Jan 1, 1000')) // Created same time (not before).
                    .build();
                const pm = {
                    id: 1,
                    designRevision: rev,
                };
                const bus = makeProvideBus({
                    path_width: 1,
                    min_path_length: 12,
                    max_path_length: 20,
                    path_created: new Date('Jan 1, 1000').toISOString()
                }, pm);
                expect(bus.isDesignCreatedBeforePathSpec()).toBe(false);
            });

            it('returns true if design is created after path', () => {
                const rev = new DesignRevisionBuilder()
                    .withFirstSaved(new Date('Jan 1, 1000'))
                    .build();
                const pm = {
                    id: 1,
                    designRevision: rev,
                };
                const bus = makeProvideBus({
                    path_width: 1,
                    min_path_length: 12,
                    max_path_length: 20,
                    path_created: new Date('Jan 2, 1000').toISOString()
                }, pm);
                expect(bus.isDesignCreatedBeforePathSpec()).toBe(true);
            });

            it('returns false if path create is null', () => {
                const rev = new DesignRevisionBuilder()
                    .withFirstSaved(new Date('Jan 1, 1000'))
                    .build();
                const pm = {
                    id: 1,
                    designRevision: rev,
                };
                const bus = makeProvideBus({
                    path_width: 1,
                    min_path_length: 12,
                    max_path_length: 20,
                    path_created: null
                }, pm);
                expect(bus.isDesignCreatedBeforePathSpec()).toBe(false);
            });
        });

        it('returns null if any number is missing', () => {
            const rev = new DesignRevisionBuilder()
                .withFirstSaved(new Date('Jan 1, 1000'))
                .build();
            const pm = {
                id: 1,
                designRevision: rev,
            };
            const bus = makeProvideBus({
                path_width: 1,
                min_path_length: 12,
                max_path_length: null,
                path_created: new Date('Jan 1, 1000').toISOString()
            }, pm);
            expect(bus.pathSpec).toBe(null);
        });

        it('returns null design is created before path spec', () => {
            const rev = new DesignRevisionBuilder()
                .withFirstSaved(new Date('Jan 1, 1000'))
                .build();
            const pm = {
                id: 1,
                designRevision: rev,
            };
            const bus = makeProvideBus({
                path_width: 1,
                min_path_length: 12,
                max_path_length: 0,
                path_created: new Date('Jan 2, 1000').toISOString()
            }, pm);
            expect(bus.pathSpec).toBe(null);
        });

        it('returns the spec if all numbers are present, and design is not created before path spec', () => {
            const rev = new DesignRevisionBuilder()
                .withFirstSaved(new Date('Jan 1, 1000'))
                .build();
            const pm = {
                id: 1,
                designRevision: rev,
            };
            const bus = makeProvideBus({
                path_width: 1,
                min_path_length: 12,
                max_path_length: 0,
                path_created: new Date('Jan 1, 1000').toISOString()
            }, pm);

            expect(bus.pathSpec).not.toBe(null);
        });
    });

    describe("priorities", () => {
        it("has the correct default priority", () => {
            const provide = makeProvideBus({
                milliwatts: 100,
                is_power: true,
                priorities: [
                    {priority: 3, group: 30},
                    {priority: 2, group: 20},
                ],
            });

            expect(provide.getPriority()).toEqual(0);
        });

        it("has the correct default priority message", () => {
            const provide = makeProvideBus({
                milliwatts: 100,
                is_power: true,
                priorities: [
                    {priority: 3, group: 30},
                    {priority: 2, group: 20},
                ],
            });

            expect(provide.getPriorityMessage()).toEqual('');
        });
        it('has stop priority', () => {
            const provide = makeProvideBus({
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ],
            });
            const require = new RequireBus({
                priorities: [
                    {
                        group: 1,
                    },
                ],
            }, {});

            require.setProvidePriority(provide);
            expect(provide.hasStopPriority()).toBe(true);
        });
    });

    describe('disconnect', () => {
        it ('disconnects its own connections only', () => {
            const desRev = new DesignRevisionBuilder().build();
            const provider = new PlacedModuleBuilder().withDesignRevision(desRev).build();
            const requirer = new PlacedModuleBuilder().withDesignRevision(desRev).build();

            const provideBus1 = makeProvideBus({name: 'pb1'}, provider);
            const provideBus2 = makeProvideBus({name: 'pb2'}, provider);
            const requireBus1 = makeRequireBus({name: 'rb1'}, requirer);
            const requireBus2 = makeRequireBus({name: 'rb2'}, requirer);

            const conn1 = desRev.addConnectionFromBuses(requireBus1, provideBus1);
            const conn2 = desRev.addConnectionFromBuses(requireBus2, provideBus2);

            provideBus1.disconnect();

            expect(desRev.connections.length).toEqual(1);
            expect(desRev.connections[0]).toEqual(conn2);
        });
        it ('disconnects all of its connections', () => {
            const desRev = new DesignRevisionBuilder().build();
            const provider = new PlacedModuleBuilder().withDesignRevision(desRev).build();
            const requirer = new PlacedModuleBuilder().withDesignRevision(desRev).build();

            const provideBus = makeProvideBus({name: 'pb'}, provider);
            const requireBus1 = makeRequireBus({name: 'rb1'}, requirer);
            const requireBus2 = makeRequireBus({name: 'rb2'}, requirer);
            const requireBus3 = makeRequireBus({name: 'rb3'}, requirer);

            desRev.addConnectionFromBuses(requireBus1, provideBus);
            desRev.addConnectionFromBuses(requireBus2, provideBus);
            desRev.addConnectionFromBuses(requireBus3, provideBus);

            provideBus.disconnect();

            expect(desRev.connections.length).toEqual(0);
        });
    });
});
