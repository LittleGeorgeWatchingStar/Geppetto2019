import {DisconnectionWidget, DisconnectionWidgetOptions} from "../../src/view/DisconnectionWidget";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Workspace} from "../../src/workspace/Workspace";
import * as $ from "jquery";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import events from "../../src/utils/events";
import {BusGroup} from "../../src/bus/BusGroup";
import {BusResource} from "../../src/bus/api";
import {busResource} from "./TestBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {ProvideBus} from "../../src/bus/ProvideBus";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {DesignRevision} from "../../src/design/DesignRevision";
import * as ReactTestUtils from "react-dom/test-utils";
import {RequireBusView} from "../../src/bus/RequireBusView";
import ConnectionController from "../../src/connection/ConnectionController";
import {FinishConnection} from "../../src/connection/actions";
import {Panel} from "../../src/view/librarypanel/Panel";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import {PROVIDE_ERROR} from "../../src/bus/events";

/**
 * @param designRev must be the same across all modules being tested here.
 * @see FinishConnection
 */
function makePlacedModule(designRev: DesignRevision): PlacedModule {
    return designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
}

function makeDomNodes() {
    $('body').html(`<div id="disconnect-widget"></div><div id="design" class="test"><div id="board"></div></div>`);
}

function makeView(pm: PlacedModule): PlacedModuleView {
    makeDomNodes();
    return new PlacedModuleView({
        model: pm,
        workspace: new Workspace(true, true),
        onMousewheel: () => {}
    });
}

function makeRequire(placedModule: PlacedModule): RequireBus {
    return placedModule.addRequire(getAttributes(placedModule));
}

function makeProvide(placedModule: PlacedModule): ProvideBus {
    return placedModule.addProvide(getAttributes(placedModule));
}

function getAttributes(pm: PlacedModule): BusResource {
    return busResource({
        milliwatts: 15,
        power: true,
        bus_group: {id: 12},
        busgroup: new BusGroup({
            placed_module: pm,
            title: "A Group",
            levels: ['1.8', '3.3']
        })
    });
}

/**
 * This fixture, by default, contains 3 buses of equal specs (from getAttributes()):
 * One "require-to-disconnect" which is connected to a provide, and a "require-to-connect"
 */
function getOptions(designRev?: DesignRevision,
                    options?): DisconnectionWidgetOptions {
    designRev = designRev ? designRev : new DesignRevisionBuilder().build();
    const providerModule = makePlacedModule(designRev);
    const provideBus = makeProvide(providerModule);
    addConflictingRequire(provideBus, makePlacedModule(designRev));
    options = options ? options : {};
    return Object.assign({
        provideToConnect: provideBus,
        provideToDisconnect: provideBus,
        requireToConnect: makeRequire(makePlacedModule(designRev)),
        message: "Help!",
        listHeader: "Conflicts:",
        targetPosition: makeView(providerModule).el
    }, options);
}

function addConflictingRequire(provideBus: ProvideBus,
                               placedModule: PlacedModule): RequireBus {
    const req = makeRequire(placedModule);
    new FinishConnection(provideBus, req).execute();
    return req;
}


describe("DisconnectionWidget", function () {

    let box = null;

    afterEach(() => {
        if (box) {
            box.remove();
            box = null;
            document.clear();
        }
    });

    function createBox(options?): DisconnectionWidget {
        return new DisconnectionWidget(getOptions(new DesignRevisionBuilder().build(), options));
    }

    describe("WorkspaceView integration", function () {

        it("renders", function() {
            const workspace = new Workspace(true, true);
            const panel = new Panel(workspace);
            const workspaceView = new WorkspaceView({
                model: workspace,
                panel: panel
            } as WorkspaceViewOptions);
            events.publishEvent(PROVIDE_ERROR, {options: getOptions(), target: $('<div></div>')});
            expect(workspaceView.$('.disconnect-widget').length).toEqual(1);
            workspaceView.remove();
        });

        it ("re-renders by replacing itself", function() {
            const workspace = new Workspace(true, true);
            const panel = new Panel(workspace);
            const workspaceView = new WorkspaceView({
                model: workspace,
                panel: panel
            } as WorkspaceViewOptions);
            events.publishEvent(PROVIDE_ERROR, {options: getOptions(), target: $('<div></div>')});
            events.publishEvent(PROVIDE_ERROR, {options: getOptions(), target: $('<div></div>')});
            expect(workspaceView.$('.disconnect-widget').length).toEqual(1);
            workspaceView.remove();
        });
    });

    it("contains the correct information", function() {
        box = createBox({message: "Questionable life advice"});
        expect(box.el.querySelector('.connection-info').innerHTML).toContain("Questionable life advice");
    });

    it("lists connections", function () {
        box = createBox();
        expect(box.el.querySelectorAll('li').length).toBeGreaterThan(0);
    });

    describe("Clicking disconnect", function() {

        it("disconnects the associated require", function () {
            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = makeProvide(providerModule);
            const require = makeRequire(makePlacedModule(design));
            const conflictingReq = addConflictingRequire(provideBus, makePlacedModule(design));

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            ReactTestUtils.Simulate.click(box.el.querySelector('.disconnect'));
            expect(conflictingReq.isConnected()).toBe(false);
        });

        it("doesn't deselect the selected require", function () {
            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = makeProvide(providerModule);
            const require = makeRequire(makePlacedModule(design));
            addConflictingRequire(provideBus, makePlacedModule(design));

            new RequireBusView({model: require}).$el.trigger('click');

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            ReactTestUtils.Simulate.click(box.el.querySelector('.disconnect'));
            expect(ConnectionController.getRequireToConnect()).toEqual(require);
        });

        it("doesn't reset the provide menu", function () {
            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = makeProvide(providerModule);
            const require = makeRequire(makePlacedModule(design));
            addConflictingRequire(provideBus, makePlacedModule(design));

            new RequireBusView({model: require}).$el.trigger('click');

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            const optionsBefore = providerModule.options;
            ReactTestUtils.Simulate.click(box.el.querySelector('.disconnect'));
            expect(providerModule.options.length).toBe(optionsBefore.length);
        });
    });

    describe("Swap", function () {
        it("displays if the requires can swap", function () {
            const designRev = new DesignRevisionBuilder().build();
            const options = getOptions(designRev);
            box = createBox(options);
            expect(box.el.innerHTML).toContain('Swap');
        });

        it("on click, disconnects the connected require and connects the unconnected one", function () {
            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = makeProvide(providerModule);
            const require = makeRequire(makePlacedModule(design));
            const conflictingReq = addConflictingRequire(provideBus, makePlacedModule(design));

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            ReactTestUtils.Simulate.click(box.el.querySelector('.swap'));
            expect(conflictingReq.isConnected()).toBe(false);
            expect(require.isConnected()).toBe(true);
        });

        it("doesn't display if the require-to-connect is already connected", function () {
            const design = new DesignRevisionBuilder().build();
            const provide = makeProvide(makePlacedModule(design));
            const require = makeRequire(makePlacedModule(design));
            const provide2 = makeProvide(makePlacedModule(design));

            new FinishConnection(provide2, require).execute();

            addConflictingRequire(provide, makePlacedModule(design));
            box = createBox({
                provideToConnect: provide,
                provideToDisconnect: provide,
                requireToConnect: require
            });

            expect(box.el.innerHTML).not.toContain('Swap');
        });

        it("doesn't display if power vacated by require-to-disconnect can't fulfill the require-to-connect", function () {
            const getPowerResource = (pm: PlacedModule, mw: number) => {
                return busResource({
                    milliwatts: mw,
                    is_power: true,
                    bus_group: {id: 12},
                    busgroup: new BusGroup({
                        placed_module: pm,
                        title: "A Group",
                        levels: ['1.8', '3.3']
                    })
                })
            };

            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = providerModule.addProvide(getPowerResource(providerModule, 20));

            const conflictingModule = makePlacedModule(design);
            const conflictingReq1 = conflictingModule.addRequire(getPowerResource(conflictingModule, 10));
            const conflictingReq2 = conflictingModule.addRequire(getPowerResource(conflictingModule, 10));

            new FinishConnection(provideBus, conflictingReq1).execute();
            new FinishConnection(provideBus, conflictingReq2).execute();

            const requirerModule = makePlacedModule(design);
            const require = requirerModule.addRequire(getPowerResource(requirerModule, 15));

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            expect(box.el.innerHTML).not.toContain('Swap');
        });

        it("doesn't display if data connections vacated by require-to-disconnect can't fulfill the require-to-connect", function () {
            const getDataResource = (pm: PlacedModule, conn: number) => {
                return busResource({
                    num_connections: conn,
                    is_power: false,
                    bus_group: {id: 12},
                    busgroup: new BusGroup({
                        placed_module: pm,
                        title: "A Group",
                        levels: ['1.8', '3.3']
                    })
                })
            };

            const design = new DesignRevisionBuilder().build();
            const providerModule = makePlacedModule(design);
            const provideBus = providerModule.addProvide(getDataResource(providerModule, 2));

            const conflictingModule = makePlacedModule(design);
            const conflictingReq1 = conflictingModule.addRequire(getDataResource(conflictingModule, 1));
            const conflictingReq2 = conflictingModule.addRequire(getDataResource(conflictingModule, 1));

            new FinishConnection(provideBus, conflictingReq1).execute();
            new FinishConnection(provideBus, conflictingReq2).execute();

            const requirerModule = makePlacedModule(design);
            const require = requirerModule.addRequire(getDataResource(requirerModule, 2));

            box = createBox({
                provideToConnect: provideBus,
                provideToDisconnect: provideBus,
                requireToConnect: require
            });

            expect(box.el.innerHTML).not.toContain('Swap');
        });
    });
});

