import eventDispatcher from "utils/events";
import User from "../../src/auth/User";
import {
    MODULE_INFO,
    MODULE_AUTO_ADD,
    MODULE_TILE_CLICK, ModuleEvent, LOGO_AUTO_ADD,
} from "../../src/module/events";
import {WorkspaceModuleInfoBox} from "../../src/module/ModuleInfoBox";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {ESC, WORKSPACE_CLICK, WORKSPACE_DRAG} from "../../src/workspace/events";
import makeModule from "./TestModule";
import {PLACED_MODULE_SELECT} from "../../src/placedmodule/events";
import {DESIGN_LOADED} from "../../src/design/events";
import UserController from "../../src/auth/UserController";
import {PseudoModuleTile} from "../../src/view/librarypanel/PseudoModuleTile";
import {ModuleBuilder} from "./ModuleBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {Workspace} from "../../src/workspace/Workspace";
import * as ReactTestUtils from 'react-dom/test-utils';
import * as ReactDOM from "react-dom";
import * as React from "react";
import {FeatureFlag} from "../../src/auth/FeatureFlag";


function makeBox(workspace = new Workspace(true, true)): WorkspaceModuleInfoBox {
    spyOn(UserController, 'getUser').and.returnValue({
        isEngineer: () => true,
        isBetaTester: () => true,
        isLoggedIn: () => true,
        isFeatureEnabled: (feature: FeatureFlag) => true,
    } as User);
    return new WorkspaceModuleInfoBox(document.createElement('div'), workspace);
}

function makeBoxForPlacedModule(pm: PlacedModule): WorkspaceModuleInfoBox {
    const box = makeBox();
    box.onSelectPlacedModule(pm);
    return box;
}

function makePlacedModule(module?): PlacedModule {
    const designRev = new DesignRevisionBuilder().build();
    const moduleToAdd = module ? module : makeModule();
    return designRev.addModule(moduleToAdd, {x: 12, y: 5});
}

function expectName(box: WorkspaceModuleInfoBox, moduleName: string) {
    expect(box.el.querySelector('.title').textContent).toEqual(moduleName);
}

describe("WorkspaceModuleInfoBox", function () {

    let box: WorkspaceModuleInfoBox = null;

    afterEach(() => {
        if (box) {
            box.remove();
            box = null;
            document.clear();
        }
    });

    describe("render", function () {
        it("displays the placed module custom name", function () {
            const pm = makePlacedModule();
            pm.setCustomName('Pepero');
            box = makeBoxForPlacedModule(pm);
            expectName(box, `Pepero (${pm.name})`);
        });
        it("does not display the placed module custom name if it is the same as the regular module name", function () {
            const pm = makePlacedModule();
            pm.setCustomName(pm.name);
            box = makeBoxForPlacedModule(pm);
            expectName(box, pm.name);
        });
        it("displays an 'add' button for unplaced modules", function () {
            box = makeBox();
            box.onSelectModule(new ModuleBuilder().build());
            expect(box.el.querySelector('.add')).not.toBeNull();
        });
        it("doesn't display an 'add' button if it is information about a placed module", function () {
            const pm = makePlacedModule();
            box = makeBoxForPlacedModule(pm);
            expect(box.el.querySelector('.add')).toBeNull();
        });
        it("displays a close 'x' button", function () {
            box = makeBox();
            box.onSelectModule(new ModuleBuilder().build());
            expect(box.el.querySelector('.close-btn')).not.toBeNull();
        });
        it("displays the price for unplaced modules", function () {
            const workspace = new Workspace(true, true);
            box = makeBox(workspace);
            const module = new ModuleBuilder().withPrice(10).build();
            box.onSelectModule(module);
            expect(box.el.querySelector('.price').textContent).toContain(module.getFormattedPrice());
        });
        it("displays the price for placed modules", function () {
            const module = new ModuleBuilder().withPrice(500).build();
            const pm = makePlacedModule(module);
            pm.setCustomName(pm.name);
            box = makeBoxForPlacedModule(pm);
            expect(box.el.querySelector('.price').textContent).toContain(module.getFormattedPrice());
        });
    });

    describe("On module tile info", function () {
        it("renders", function () {
            box = makeBox();
            const module = makeModule({name: 'boo-bop'});
            eventDispatcher.publish(MODULE_INFO, module);
            expectName(box, 'boo-bop');
        });
    });

    describe("Add module button click", function () {
        it("publishes the module", function () {
            box = makeBox();
            const module = new ModuleBuilder()
                .withRevisionId(1)
                .withModuleId(3)
                .build();
            box.onSelectModule(module);
            let correct = false;
            eventDispatcher.subscribe(MODULE_AUTO_ADD, (event: ModuleEvent) => {
                correct = event.model === module;
            });
            ReactTestUtils.Simulate.click(box.el.querySelector('.add'));
            expect(correct).toBe(true);
        });
    });

    describe("on library module click", function () {
        it("re-renders", function () {
            box = makeBox();
            const module = makeModule({name: 'boo-bop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            expectName(box, 'boo-bop');
        });
    });

    describe("on logo tile click", function () {
        it("re-renders", function () {
            box = makeBox();
            const div = document.createElement("div");
            const logo = PseudoModuleTile.logo(new Workspace(true, true), () => {
            }, () => {
            });
            ReactDOM.render(logo, div);
            ReactTestUtils.Simulate.click(div.querySelector('.module-tile'));
            expectName(box, 'Add Custom Logo');
        });
    });

    describe("on placed module select", function () {
        it("doesn't render", function () {
            box = makeBox();
            const module = makeModule({name: 'killer rainbow unicorns'});
            const placedModule = makePlacedModule(module);
            eventDispatcher.publish(PLACED_MODULE_SELECT, placedModule);
            expect(box.$el.html()).toBe('');
        });
    });

    describe("on workspace drag", function () {
        it("unselects and can re-render", function () {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(WORKSPACE_DRAG);
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            expectName(box, 'boop');
        });
    });

    describe("deselects", function () {
        function expectClosed() {
            expect(box.el.textContent).toEqual('');
        }

        it("on workspace click", function () {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            eventDispatcher.publish(WORKSPACE_CLICK);
            expectClosed();
        });

        it("on ESC event", function () {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            eventDispatcher.publish(ESC);
            expectClosed();
        });

        it("on loading a design", function () {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            eventDispatcher.publish(DESIGN_LOADED);
            expectClosed();
        });

        it("on clicking the corner 'x'", () => {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            ReactTestUtils.Simulate.click(box.el.querySelector('.close-btn'));
            expectClosed();
        });

        it("can be reopened after being deselected", () => {
            box = makeBox();
            const module = makeModule({name: 'boop'});
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            ReactTestUtils.Simulate.click(box.el.querySelector('.close-btn'));
            eventDispatcher.publish(MODULE_TILE_CLICK, module);
            expect(box.el.textContent).not.toEqual('');
        });
    });

    describe("logo tile", function () {

        let container = null;

        beforeEach(() => {
            box = makeBox();
            const tile = PseudoModuleTile.logo(new Workspace(true, true), () => {}, () => {});
            container = document.createElement('div');
            ReactDOM.render(tile, container);
            ReactTestUtils.Simulate.click(container.querySelector('.module-tile'));
        });

        afterEach(() => {
            ReactDOM.unmountComponentAtNode(container);
        });

        it("on click, displays correct information in the module info box", () => {
            expect(box.el.textContent).toContain('Add a custom silk screen logo from an uploaded SVG file.');
        });

        it("publishes logo auto add event when adding the logo from the info box", () => {
            let eventDispatched = false;
            eventDispatcher.subscribe(LOGO_AUTO_ADD, () => eventDispatched = true);
            ReactTestUtils.Simulate.click(box.el.querySelector('.add'));
            expect(eventDispatched).toBe(true);
        });
    });
});
