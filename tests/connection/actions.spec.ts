import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {
    AddNoConnection,
    FinishConnection,
    StartConnection
} from "../../src/connection/actions";
import ConnectionController from "../../src/connection/ConnectionController";
import {DesignRevision} from "../../src/design/DesignRevision";
import {busResource} from "../bus/TestBus";
import makeModule from "../module/TestModule";
import {Library} from "../../src/module/Library";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {RemoveModule} from "../../src/module/actions";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {overrideDesignRevision} from "../design/TestDesign";

function requireBus(): RequireBus {
    const designRev = new DesignRevisionBuilder().build();
    const module = makeModule({
        name: 'requirer',
        requires: [
            busResource({
                name: 'test require',
                milliwatts: 20,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            }),
            busResource({
                name: 'require vlogic',
                milliwatts: 5,
                templates: [
                    {id: 100, name: 'VLOGIC', power: true},
                ],
            }),
        ],
    });
    const pm = designRev.addModule(module, {x: 0, y: 0});
    return pm.findRequire(r => r.name === 'test require');
}

function otherRequireBus(busToTest: RequireBus): RequireBus {
    const module = makeModule({
        name: 'requirer',
        requires: [
            busResource({
                name: 'other require',
                is_power: false,
                power: false,
                num_connection: 1,
                templates: [
                    {id: 163, name: 'GPIO', power: false},
                ],
            }),
        ],
    });
    const pm = busToTest.designRevision.addModule(module, {x: 0, y: 0});
    return pm.findRequire(r => r.name === 'other require');
}

function compatibleProvideBus(requireBus: RequireBus): ProvideBus {
    const module = makeModule({
        name: 'compatible provider',
        provides: [
            busResource({
                name: 'compatible provide',
                milliwatts: 40,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            }),
            busResource({
                name: 'provide vlogic',
                milliwatts: 50,
                templates: [
                    {id: 100, name: 'VLOGIC', power: true},
                ],
            }),
        ],
    });
    const pm = requireBus.designRevision.addModule(module, {x: 0, y: 0});
    return pm.findProvide(p => p.name === 'compatible provide');
}

describe("StartConnection", function () {
    function startConnection(require: RequireBus): void {
        const action = new StartConnection(require);
        action.execute();
    }
});

describe("FinishConnection", function () {
    function makeConnection(require: RequireBus, provide: ProvideBus): FinishConnection {
        const start = new StartConnection(require);
        start.execute();
        const finish = new FinishConnection(provide, require);
        finish.execute();
        return finish;
    }

    function numConnections(designRev: DesignRevision): number {
        return designRev.connections.length;
    }

    describe("Log", function () {

        it("records a connection", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            new StartConnection(require).execute();
            const finish = new FinishConnection(provide, require);
            expect(finish.log).toEqual(`Connect ${require.name} to ${provide.name}`);
        });

        it("records a disconnection", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            new StartConnection(require).execute();
            new FinishConnection(provide, require).execute();
            new StartConnection(require).execute();
            const finish = new FinishConnection(provide, require);
            finish.execute();
            expect(finish.log).toEqual(`Disconnect ${require.name} from ${provide.name}`);
        });

        it("works even if the module has been removed", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            new StartConnection(require).execute();
            const finish = new FinishConnection(provide, require);
            const pm = require.placedModule;
            pm.designRevision.removePlacedModule(pm);
            expect(finish.log).toEqual(`Connect ${require.name} to ${provide.name}`);
        });
    });

    describe("execute", function () {
        it("establishes a new connection", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);

            makeConnection(require, provide);

            expect(require.getConnectedProvide()).toBe(provide);
        });

        it("removes the connection if selected again", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);

            makeConnection(require, provide);
            makeConnection(require, provide);

            expect(require.getConnectedProvide()).toBe(null);
        });

        it("replaces a previous connection", function () {
            const require = requireBus();

            const firstProvide = compatibleProvideBus(require);
            makeConnection(require, firstProvide);

            const secondProvide = compatibleProvideBus(require);
            makeConnection(require, secondProvide);

            expect(require.getConnectedProvide()).toBe(secondProvide);
        });

        it("replaces a previous no connect", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require');
            const provide = provider.findProvide(p => p.name === 'provide');

            designRev.addNoConnection(require);
            expect(designRev.getNoConnections().length).toEqual(1);

            makeConnection(require, provide);
            expect(designRev.getNoConnections().length).toEqual(0);
        });

        it("auto-connects VLOGIC", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);

            makeConnection(require, provide);

            const vlogic = require.placedModule.findRequire(r => r.name === 'require vlogic');
            expect(vlogic.getConnectedProvide()).not.toEqual(null);
            expect(numConnections(require.designRevision)).toEqual(2);
        });

        it("updates the electrical status of the design", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            makeConnection(require, provide);

            expect(provide.used).toEqual(20);
        });

        it("clears the global require to connect", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            makeConnection(require, provide);

            expect(ConnectionController.getRequireToConnect()).toBe(null);
        });
    });

    describe("reverse", function () {
        it("disconnects a new connection", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);
            const finish = makeConnection(require, provide);

            finish.reverse();

            expect(require.getConnectedProvide()).toBe(null);
        });

        it("reconnects a removed connection", function () {
            const require = requireBus();
            const provide = compatibleProvideBus(require);

            makeConnection(require, provide); // connect
            const disconnect = makeConnection(require, provide);

            disconnect.reverse();

            expect(require.getConnectedProvide()).toBe(provide);
        });

        it("reconnects a replaced connection", function () {
            const require = requireBus();
            const firstProvide = compatibleProvideBus(require);
            const secondProvide = compatibleProvideBus(require);

            makeConnection(require, firstProvide); // connect
            const replace = makeConnection(require, secondProvide);

            replace.reverse();

            expect(require.getConnectedProvide()).toBe(firstProvide);
        });

        it("resets a replaced no connect", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require');
            const provide = provider.findProvide(p => p.name === 'provide');

            designRev.addNoConnection(require);
            expect(designRev.getNoConnections().length).toEqual(1);

            const replace = makeConnection(require, provide);
            expect(designRev.getNoConnections().length).toEqual(0);

            replace.reverse();
            expect(designRev.getNoConnections().length).toEqual(1);
        });

        it("resets a replaced no connect in an exclusion", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1],
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require1 = requirer.findRequire(r => r.name === 'require1');
            const require2 = requirer.findRequire(r => r.name === 'require2');
            const provide = provider.findProvide(p => p.name === 'provide');

            designRev.addNoConnection(require1);
            expect(designRev.getNoConnections().length).toEqual(1);
            expect(require1.getNoConnection()).not.toBeNull();

            makeConnection(require2, provide); // connecting require2 will unset NC for require1 due to exclusion.
            expect(designRev.getNoConnections().length).toEqual(0);
            expect(require1.getNoConnection()).toBeNull();
        });

        it("updates the electrical status of the design", function () {
            const require = requireBus();
            const firstProvide = compatibleProvideBus(require);
            const secondProvide = compatibleProvideBus(require);

            makeConnection(require, firstProvide); // connect
            const replace = makeConnection(require, secondProvide);

            replace.reverse();

            expect(firstProvide.used).toEqual(20);
            expect(secondProvide.used).toEqual(0);
        });

        it("re-connects exclusions", function () {
            const designRev = new DesignRevisionBuilder().build();
            overrideDesignRevision(designRev);

            const requirer = new PlacedModuleBuilder()
                .withModule(makeModule({
                    requires: [
                        busResource({
                            id: 1,
                            name: 'require 1',
                            exclusions: [2],
                        }),
                        busResource({
                            id: 2,
                            name: 'require 2',
                            exclusions: [1],
                        }),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();
            const require1 = requirer.findRequire(r => r.name === 'require 1');
            const require2 = requirer.findRequire(r => r.name === 'require 2');

            const provider = new PlacedModuleBuilder()
                .withModule(makeModule({
                    provides: [
                        busResource({name: 'provide'}),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();

            const provide = provider.findProvide(p => p.name === 'provide');

            makeConnection(require1, provide);
            const finish = makeConnection(require2, provide);
            finish.reverse();
            expect(designRev.connections.length).toEqual(1);
            expect(designRev.connections[0].requireBus.name).toEqual('require 1')
        });

        it("resets a replaced no connect for exclusion", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1],
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require1 = requirer.findRequire(r => r.name === 'require1');
            const require2 = requirer.findRequire(r => r.name === 'require2');
            const provide = provider.findProvide(p => p.name === 'provide');

            designRev.addNoConnection(require1);
            expect(designRev.getNoConnections().length).toEqual(1);
            expect(require1.getNoConnection()).not.toBeNull();

            const replace = makeConnection(require2, provide); // connecting require2 will unset NC for require1 due to exclusion.
            expect(designRev.getNoConnections().length).toEqual(0);
            expect(require1.getNoConnection()).toBeNull();

            replace.reverse();
            expect(designRev.getNoConnections().length).toEqual(1);
            expect(require1.getNoConnection()).not.toBeNull();
        });

        it("works after an undo-delete of requirer module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = new PlacedModuleBuilder()
                .withModule(makeModule({
                    requires: [
                        busResource({name: 'require'}),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();
            const require = requirer.findRequire(r => r.name === 'require');
            const provider = new PlacedModuleBuilder()
                .withModule(makeModule({
                    provides: [
                        busResource({name: 'provide'}),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();
            const provide = provider.findProvide(p => p.name === 'provide');

            const finish = makeConnection(require, provide);
            const removeRequireAction = new RemoveModule(requirer);
            removeRequireAction.execute();
            removeRequireAction.reverse();
            finish.reverse();

            expect(designRev.connections.length).toEqual(0);
        });
        it("works after an undo-delete of provider module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = new PlacedModuleBuilder()
                .withModule(makeModule({
                    requires: [
                        busResource({name: 'require'}),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();
            const require = requirer.findRequire(r => r.name === 'require');
            const provider = new PlacedModuleBuilder()
                .withModule(makeModule({
                    provides: [
                        busResource({name: 'provide'}),
                    ],
                }))
                .withDesignRevision(designRev)
                .build();
            const provide = provider.findProvide(p => p.name === 'provide');

            const finish = makeConnection(require, provide);
            const removeProviderAction = new RemoveModule(provider);
            removeProviderAction.execute();
            removeProviderAction.reverse();
            finish.reverse();

            expect(designRev.connections.length).toEqual(0);
        });
    });
});

describe("AddNoConnection", function () {
    describe("Log", function () {
        it("records when a no connect is set on a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');

            const action = new AddNoConnection([require]);
            action.execute();

            expect(action.log).toEqual('Set NC for require');
        });

        it("records when a no connect is unset on a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            designRev.addNoConnection(require);

            const action = new AddNoConnection([require]);
            action.execute();

            expect(action.log).toEqual('Unset NC for require');
        });

        it("records when a no connect is set on an exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();

            expect(action.log).toEqual('Set NC for require2, require3, and require1');
        });

        it("records when a no connect is unset on an exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});

            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require1'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require2'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require3'));

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();

            expect(action.log).toEqual('Unset NC for require2, require3, and require1');
        });
    });

    describe("execute", function () {
        it ("sets a no connect to a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            const action = new AddNoConnection([require]);
            action.execute();

            expect(designRev.getNoConnections().length).toEqual(1);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(1);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require').isNoConnect())
                .toEqual(true);
        });

        it ("unsets a no connect to a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            designRev.addNoConnection(require);

            const action = new AddNoConnection([require]);
            action.execute();

            expect(designRev.getNoConnections().length).toEqual(0);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(0);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require').isNoConnect())
                .toEqual(false);
        });

        it("sets a no connects to an exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();

            expect(designRev.getNoConnections().length).toEqual(3);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(3);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require1').isNoConnect())
                .toEqual(true);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require2').isNoConnect())
                .toEqual(true);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require3').isNoConnect())
                .toEqual(true);
        });

        it("unsets a no connects to an exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});

            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require1'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require2'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require3'));

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();

            expect(designRev.getNoConnections().length).toEqual(0);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(0);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require1').isNoConnect())
                .toEqual(false);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require2').isNoConnect())
                .toEqual(false);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require3').isNoConnect())
                .toEqual(false);
        });

        it ("set no connect to a require replaces previous connection", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require');
            const provide = provider.findProvide(p => p.name === 'provide');
            designRev.addConnectionFromBuses(require, provide);

            expect(designRev.connections.length).toEqual(1);
            expect(designRev.getNoConnections().length).toEqual(0);

            const action = new AddNoConnection([require]);
            action.execute();

            expect(designRev.connections.length).toEqual(0);
            expect(designRev.getNoConnections().length).toEqual(1);
        });

        it ("set no connect to a exclusion set replaces previous connection", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require1'),
                provider.findProvide(p => p.name === 'provide'));

            expect(designRev.connections.length).toEqual(1);
            expect(designRev.getNoConnections().length).toEqual(0);

            const exclusionSet = requirer.exclusionSets[0];
            const action = new AddNoConnection(exclusionSet.models);
            action.execute();

            expect(designRev.connections.length).toEqual(0);
            expect(designRev.getNoConnections().length).toEqual(3);
        });

        it("clears the global require to connect", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require');
            ConnectionController.setRequireToConnect(require);

            expect(ConnectionController.getRequireToConnect()).not.toBeNull();

            const action = new AddNoConnection([require]);
            action.execute();

            expect(ConnectionController.getRequireToConnect()).toBeNull();
        });
    });

    describe("reverse", function () {
        it ("unsets a new no connect on a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            const action = new AddNoConnection([require]);
            action.execute();
            action.reverse();

            expect(designRev.getNoConnections().length).toEqual(0);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(0);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require').isNoConnect())
                .toEqual(false);
        });

        it ("resets an unset no connect on a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            designRev.addNoConnection(require);

            const action = new AddNoConnection([require]);
            action.execute();
            action.reverse();

            expect(designRev.getNoConnections().length).toEqual(1);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(1);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require').isNoConnect())
                .toEqual(true);
        });

        it ("unsets new no connects to a exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();
            action.reverse();

            expect(designRev.getNoConnections().length).toEqual(0);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(0);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require1').isNoConnect())
                .toEqual(false);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require2').isNoConnect())
                .toEqual(false);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require3').isNoConnect())
                .toEqual(false);
        });

        it ("resets an unset no connects to a exclusion set", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require1'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require2'));
            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require3'));

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();
            action.reverse();

            expect(designRev.getNoConnections().length).toEqual(3);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(3);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require1').isNoConnect())
                .toEqual(true);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require2').isNoConnect())
                .toEqual(true);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require3').isNoConnect())
                .toEqual(true);
        });

        it ("reconnects a replaced connection for a require", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require');
            const provide = provider.findProvide(p => p.name === 'provide');
            designRev.addConnectionFromBuses(require, provide);

            const action = new AddNoConnection([require]);
            action.execute();

            expect(require.getConnectedProvide()).toBeNull();

            action.reverse();

            expect(designRev.connections.length).toEqual(1);
            expect(designRev.getNoConnections().length).toEqual(0);
            expect(require.getConnectedProvide()).toBe(provide);
        });

        it ("reconnects a replaced connection for exclusion sets", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        id: 1,
                        name: 'require1',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [2, 3],
                    }),
                    busResource({
                        id: 2,
                        name: 'require2',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 3],
                    }),
                    busResource({
                        id: 3,
                        name: 'require3',
                        is_optional: true, // Only optional require buses may have no connects.
                        exclusions: [1, 2],
                    }),
                ],
            }), {x: 10, y: 20});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 60, y: 70});

            const require = requirer.findRequire(r => r.name === 'require1');
            const provide = provider.findProvide(p => p.name === 'provide');
            designRev.addConnectionFromBuses(require, provide);

            const exclusionSet = requirer.exclusionSets[0];

            const action = new AddNoConnection(exclusionSet.models);
            action.execute();
            action.reverse();

            expect(designRev.connections.length).toEqual(1);
            expect(designRev.getNoConnections().length).toEqual(0);
            expect(require.getConnectedProvide()).toBe(provide);
        });

        it("reconnect works after an undo-delete of requirer", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 10, y: 20});

            const require = requirer.findRequire(r => r.name === 'require');
            designRev.addNoConnection(require);

            const action = new AddNoConnection([require]);
            const removeAction = new RemoveModule(requirer);
            action.execute();
            removeAction.execute();
            removeAction.reverse();
            action.reverse();

            expect(designRev.getNoConnections().length).toEqual(1);
            expect(designRev.getPlacedModules()[0].requireNoConnections.length).toEqual(1);
            expect(designRev.getPlacedModules()[0].findRequire(r => r.name === 'require').isNoConnect())
                .toEqual(true);
        });
    });
});

