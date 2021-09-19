import {busResource} from "../bus/TestBus";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {DesignRevision} from "../../src/design/DesignRevision";
import {CODE_NOT_COMPATIBLE} from "../../src/bus/BusPriority";
import ConnectionController from "../../src/connection/ConnectionController";
import {BusGroup} from "../../src/bus/BusGroup";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {RequireBus} from "../../src/bus/RequireBus";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {RequireBusView} from "../../src/bus/RequireBusView";
import eventDispatcher from 'utils/events';
import {CANCEL_CONNECT} from "../../src/workspace/events";
import {PLACED_MODULE_SELECT} from "../../src/placedmodule/events";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {RemoveModule} from "../../src/module/actions";
import {ProvideBus} from "../../src/bus/ProvideBus";
import {SELECT_REQUIRE} from "../../src/bus/events";
import {Library} from "../../src/module/Library";
import {Panel} from "../../src/view/librarypanel/Panel";
import * as $ from "jquery";
import {overrideDesignRevision} from "../design/TestDesign";
import {Workspace} from "../../src/workspace/Workspace";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import DialogManager from "../../src/view/DialogManager";


function makeRequire(): RequireBus {
    const placedModule = new PlacedModuleBuilder()
        .withDesignRevision(new DesignRevisionBuilder().build())
        .build();
    const require = placedModule.addRequire(busResource());
    spyOn(require, 'needsVlogicPower').and.callFake(() => false);
    return require;
}

export function triggerSelectRequire(): void {
    eventDispatcher.publishEvent(SELECT_REQUIRE, {
        model: makeRequire()
    });
}


describe('ConnectionController', function () {

    function makeRequirer(name: string = 'my requirer') {
        return (new ModuleBuilder())
            .withName(name)
            .build();
    }

    function makeProvider(name: string = 'my provider') {
        return (new ModuleBuilder)
            .withName(name)
            .build();
    }

    function makeBusGroup(pm: PlacedModule) {
        const group = new BusGroup({levels: ['1']});
        group.set('placed_module', pm);
        return group
    }

    it('auto-connects to a provide with a matching non-stop priority', function () {
        const designRev = new DesignRevision();
        const placedProvider = designRev.addModule(makeProvider(), {x: 0, y: 0});
        const placedRequirer = designRev.addModule(makeRequirer(), {x: 0, y: 0});
        placedProvider.addProvide(
            busResource({
                name: 'provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: 'some code',
                        },
                    },
                ]
            }));
        placedRequirer.addRequire(
            busResource({
                name: 'require power',
                milliwatts: 20,
                busgroup: makeBusGroup(placedRequirer),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                    },
                ]
            }));
        const require = placedRequirer.getRequires()[0];
        ConnectionController.setRequireToConnect(require);
        ConnectionController.autoConnect({module: placedProvider});
        expect(require.isConnected()).toBe(true);
    });

    /**
     * module -> provide -> pattern -> stop
     */
    it('does not auto-connect to a provide with a matching stop priority', function () {
        const designRev = new DesignRevision();
        const placedProvider = designRev.addModule(makeProvider(), {x: 0, y: 0});
        const placedRequirer = designRev.addModule(makeRequirer(), {x: 0, y: 0});
        placedProvider.addProvide(
            busResource({
                name: 'provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ]
            }));
        placedRequirer.addRequire(
            busResource({
                name: 'require power',
                milliwatts: 20,
                busgroup: makeBusGroup(placedRequirer),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                    },
                ]
            }));
        const require = placedRequirer.getRequires()[0];
        ConnectionController.setRequireToConnect(require);
        ConnectionController.autoConnect({module: placedProvider});
        expect(require.isConnected()).toBe(false);
    });

    /**
     * module -> provide -> pattern -> non-stop
     *        -> provide -> pattern -> stop         (takes precedence)
     */
    it('auto-connects to the provide with the non-stop priority', function () {
        const designRev = new DesignRevision();
        const placedProvider = designRev.addModule(makeProvider(), {x: 0, y: 0});
        const placedRequirer = designRev.addModule(makeRequirer(), {x: 0, y: 0});
        placedProvider.addProvide(
            busResource({
                name: 'stop provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ]
            }));
        const nonStopProvide = placedProvider.addProvide(
            busResource({
                name: 'non-stop provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: 'non-stop',
                        },
                    },
                ]
            }));
        placedRequirer.addRequire(
            busResource({
                name: 'require power',
                milliwatts: 20,
                busgroup: makeBusGroup(placedRequirer),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ]
            }));
        const require = placedRequirer.getRequires()[0];
        ConnectionController.setRequireToConnect(require);
        ConnectionController.autoConnect({module: placedProvider});
        expect(require.getConnectedProvide()).toBe(nonStopProvide);
    });

    /**
     * module -> provide -> pattern -> non-stop/priority:10
     *        -> provide -> pattern -> non-stop/priority:15 (takes precedence)
     */
    it('auto-connects to the provide with the highest priority', function () {
        const designRev = new DesignRevision();
        const placedProvider = designRev.addModule(makeProvider(), {x: 0, y: 0});
        const placedRequirer = designRev.addModule(makeRequirer(), {x: 0, y: 0});
        placedProvider.addProvide(
            busResource({
                name: 'stop provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        priority: 10,
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ]
            }));
        const highestPriorityProvide = placedProvider.addProvide(
            busResource({
                name: 'non-stop provide power',
                milliwatts: 40,
                busgroup: makeBusGroup(placedProvider),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        priority: 15,
                        group: 1,
                        emblem: {
                            code: 'non-stop',
                        },
                    },
                ]
            }));
        placedRequirer.addRequire(
            busResource({
                name: 'require power',
                milliwatts: 20,
                busgroup: makeBusGroup(placedRequirer),
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
                priorities: [
                    {
                        group: 1,
                        emblem: {
                            code: CODE_NOT_COMPATIBLE,
                        },
                    },
                ]
            }));
        const require = placedRequirer.getRequires()[0];
        ConnectionController.setRequireToConnect(require);
        ConnectionController.autoConnect({module: placedProvider});
        expect(require.getConnectedProvide()).toBe(highestPriorityProvide);
    });

    describe("Selected require", function () {

        it("can be set by clicking a require bus", function () {
            const require = makeRequire();
            const busView = new RequireBusView({model: require});
            busView.click();
            const selected = ConnectionController.getRequireToConnect();
            expect(selected instanceof RequireBus).toBe(true);
        });

        it('does not send multiple AJAX requests if the same bus is reselected', function () {
            const require = makeRequire();
            const fetchFunction = spyOn(Library.prototype, 'fetch').and.callThrough();
            const busView = new RequireBusView({model: require});
            busView.click();
            busView.click();
            expect(fetchFunction).toHaveBeenCalledTimes(1);
        });

        it("triggers CANCEL_CONNECT when successfully unset", function () {
            const require = makeRequire();
            ConnectionController.setRequireToConnect(require);
            let eventFired = false;
            eventDispatcher.subscribe(CANCEL_CONNECT, () => eventFired = true);
            ConnectionController.clearRequireToConnect();
            expect(eventFired).toBe(true);
        });

        it("doesn't trigger CANCEL_CONNECT when there wasn't a selected module", function () {
            let eventFired = false;
            eventDispatcher.subscribe(CANCEL_CONNECT, () => eventFired = true);
            ConnectionController.clearRequireToConnect();
            expect(eventFired).toBe(false);
        });

        describe("Controlled by workspace", function () {

            let workspaceView = null;

            beforeEach(() => {
                // Stub the connection event fetch.
                spyOn(Library.prototype, 'fetch').and.callFake(() => {
                    const deferred = $.Deferred();
                    deferred.resolve(new Library());
                    return deferred.promise();
                });
                const ws = new Workspace(true, true);
                const panel = new Panel(ws);
                workspaceView = new WorkspaceView({
                    panel: panel,
                    model: ws
                } as WorkspaceViewOptions);
            });

            afterEach(() => {
                if (workspaceView) {
                    workspaceView.remove();
                    workspaceView = null;
                }
            });

            it("can be unset by clicking the workspace", function () {
                triggerSelectRequire();
                workspaceView.$('.interaction-helper').click();
                expect(ConnectionController.getRequireToConnect()).toBeNull();
            });

            it("can be unset by pressing the ESC key", function () {
                spyOn(DialogManager, 'hasOpenDialog').and.returnValue(false);
                triggerSelectRequire();
                const esc = $.Event('keydown', {
                    which: $.ui.keyCode.ESCAPE
                } as any);
                $(document).trigger(esc);
                const selected = ConnectionController.getRequireToConnect();
                expect(selected).toBeNull();
            });

            /**
             * TODO note these functionalities are dependent on Panel.
             */
            it("can be unset by deleting a module", function () {
                triggerSelectRequire();
                new RemoveModule(new PlacedModuleBuilder().build()).execute();
                const selected = ConnectionController.getRequireToConnect();
                expect(selected).toBeNull();
            });

            it('can be unset when another module is selected', function () {
                triggerSelectRequire();
                eventDispatcher.publishEvent(PLACED_MODULE_SELECT, {
                    model: new PlacedModuleBuilder().build()
                });
                expect(ConnectionController.getRequireToConnect()).toBeNull();
            });
        });
    });

    describe("Double click require", function () {
        function addPowerProvide(pm: PlacedModule): ProvideBus {
            return pm.addProvide(busResource({
                power: true,
                milliwatts: 25,
                busgroup: new BusGroup({
                    levels: ['3.3'],
                })
            }));
        }

        it("connects to a single provider if available", function () {
            const designRev = overrideDesignRevision();
            const pm = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = pm.addRequire(busResource({
                power: true,
                milliwatts: 20,
                busgroup: new BusGroup({
                    levels: ['3.3'],
                    placed_module: pm
                })
            }));
            const pm2 = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const provide = addPowerProvide(pm2);
            designRev.updateElectrical(); // Set require options
            const requireView = new RequireBusView({model: require});
            requireView.$el.click(); // Select the require
            requireView.$el.dblclick();
            expect(require.isConnectedToBus(provide)).toBe(true);
        });

        it("does not connect to a provider if multiple are available", function () {
            const designRev = overrideDesignRevision();
            const pm = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            const require = pm.addRequire(busResource({
                power: true,
                milliwatts: 20,
                busgroup: new BusGroup({
                    levels: ['3.3'],
                    placed_module: pm
                })
            }));
            const pm2 = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            addPowerProvide(pm2);
            addPowerProvide(pm2);
            designRev.updateElectrical(); // Set require options
            const requireView = new RequireBusView({model: require});
            requireView.$el.click(); // Select the require
            requireView.$el.dblclick();
            expect(require.isConnected()).toBe(false);
        });
    });
});
