import {ProviderOptionsView} from "../../src/workspace/ProviderOptionsView";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {makePlacedModule} from "../placedmodule/PlacedModuleView.spec";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import * as ReactTestUtils from 'react-dom/test-utils';
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import makeModule from "../module/TestModule";
import {Workspace} from "../../src/workspace/Workspace";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import * as $ from "jquery";
import eventDispatcher from 'utils/events';
import {ON_OPTIONS_SET, ProvideOptionsSetEvent} from "../../src/connection/events";
import {overrideDesignRevision} from "../design/TestDesign";
import {CURRENT_DESIGN_SET} from "../../src/design/events";

interface ProviderOptionsStubProperties {
    tooManyOptions?: boolean;
    requireName?: string;
    placedModuleViews?: PlacedModuleView[];
}

/**
 * Create a PlacedModuleView that has an open provide menu.
 */
function makePmView(pm?: PlacedModule): PlacedModuleView {
    const pmView = new PlacedModuleView({
        model: pm ? pm : makePlacedModule(makeModule()),
        workspace: new Workspace(true, true),
        onMousewheel: () => {}
    });
    pmView.model.setOptions(pmView.model.getProvides());
    return pmView;
}

function makePmViewWithName(name: string): PlacedModuleView {
    return makePmView(makePlacedModule(new ModuleBuilder().withName(name).build()));
}

describe("ProviderOptionsView", () => {
    let container = null;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        container = null;
    });

    function renderProvideOptionsView(customOptions: ProviderOptionsStubProperties = {}): void {
        const options = Object.assign({
            tooManyOptions: false,
            requireName: 'REQUIRE',
            placedModuleViews: [makePmViewWithName('SomePM')]
        }, customOptions);
        ReactDOM.render(<ProviderOptionsView tooManyOptions={options.tooManyOptions}
                                             requireName={options.requireName}
                                             placedModuleViews={options.placedModuleViews}/>, container);
    }

    function getProvideMenuVisibility(pmView: PlacedModuleView): string {
        return pmView.el.querySelector('.provide-bus-menu-container').style.display;
    }

    it("renders placed module names", () => {
        const pmViews = [
            makePmViewWithName('Pocky'),
            makePmViewWithName('Pejoy')
        ];
        renderProvideOptionsView({placedModuleViews: pmViews});
        expect(container.textContent).toContain('Pocky');
        expect(container.textContent).toContain('Pejoy');
    });

    it("updates when it receives new placed modules", () => {
        renderProvideOptionsView({placedModuleViews: []});
        renderProvideOptionsView({placedModuleViews: [makePmViewWithName('Pepero')]});
        expect(container.textContent).toContain('Pepero');
    });

    describe("Too many compatible modules", () => {
        let pmViews = null;

        beforeEach(() => {
            // Appropriate display is dependent on there being at least 2 PM views.
            pmViews = [makePmView(), makePmView()];
            renderProvideOptionsView({tooManyOptions: true, placedModuleViews: pmViews});
        });

        function getToggleSuppressionButton(): HTMLButtonElement | null {
            return container.querySelector("[data-test='toggleSuppression']");
        }

        it("displays a show/hide button for provide menus", () => {
            expect(getToggleSuppressionButton()).not.toBeNull();
        });

        it("hides provide menus by default", () => {
            expect(getProvideMenuVisibility(pmViews[0])).toEqual('none');
        });

        it("does not hide the menu containing the provide currently connected to the require", () => {
            const pmView = makePmView();
            pmView.findCurrentlyConnectedProvide = () => pmView.model.getProvides()[0]; // The internals of this rely on ConnectionController...
            renderProvideOptionsView({tooManyOptions: true, placedModuleViews: [pmView, makePmView()]});
            expect(getProvideMenuVisibility(pmView)).not.toEqual('none');
        });

        it("can toggle showing provide menus", () => {
            ReactTestUtils.Simulate.click(getToggleSuppressionButton());
            expect(getProvideMenuVisibility(pmViews[0])).not.toEqual('none');
        });

        it("can hide provide menus after showing them", () => {
            ReactTestUtils.Simulate.click(getToggleSuppressionButton());
            ReactTestUtils.Simulate.click(getToggleSuppressionButton());
            expect(getProvideMenuVisibility(pmViews[0])).toEqual('none');
        });
    });

    describe("Mouseover placed module name", () => {
        it("causes the associated view to gain a blinking CSS class", () => {
            const pmView = makePmView();
            renderProvideOptionsView({placedModuleViews: [pmView]});
            const name = container.querySelector("[data-test='moduleName']");
            ReactTestUtils.Simulate.mouseOver(name);
            expect(pmView.el.querySelector('.fast-blink')).not.toBeNull();
        });

        it("reveals the placed module's provide menu if the menu was hidden", () => {
            const pmView = makePmView();
            renderProvideOptionsView({tooManyOptions: true, placedModuleViews: [pmView, makePmView()]});
            const name = container.querySelector("[data-test='moduleName']");
            ReactTestUtils.Simulate.mouseOver(name);
            expect(getProvideMenuVisibility(pmView)).not.toEqual('none');
        });
    });

    describe("Mouseout placed module name", () => {
        it("causes the associated view to stop blinking", () => {
            const pmView = makePmView();
            renderProvideOptionsView({placedModuleViews: [pmView]});
            const name = container.querySelector("[data-test='moduleName']");
            ReactTestUtils.Simulate.mouseOver(name);
            ReactTestUtils.Simulate.mouseOut(name);
            expect(pmView.el.querySelector('.fast-blink')).toBeNull();
        });

        describe("Multiple modules", () => {

            it("hides the PlacedModuleView's provide menu, if provides are suppressed", () => {
                const pmViews = [makePmView(), makePmView()];
                renderProvideOptionsView({tooManyOptions: true, placedModuleViews: pmViews});
                const name = container.querySelector("[data-test='moduleName']");
                ReactTestUtils.Simulate.mouseOver(name);
                ReactTestUtils.Simulate.mouseOut(name);
                expect(getProvideMenuVisibility(pmViews[0])).toEqual('none');
            });

            it("does not hide the PlacedModuleView's provide menu if provides are not suppressed", () => {
                const pmViews = [makePmView(), makePmView()];
                renderProvideOptionsView({tooManyOptions: false, placedModuleViews: pmViews});
                const name = container.querySelector("[data-test='moduleName']");
                ReactTestUtils.Simulate.mouseOver(name);
                ReactTestUtils.Simulate.mouseOut(name);
                expect(getProvideMenuVisibility(pmViews[0])).not.toEqual('none');
            });

            it("does not hide the PlacedModuleView's provide menu if the name was clicked, even if provides are suppressed", () => {
                const pmViews = [makePmView(), makePmView()];
                renderProvideOptionsView({tooManyOptions: true, placedModuleViews: pmViews});
                const name = container.querySelector("[data-test='moduleName']");
                ReactTestUtils.Simulate.click(name);
                ReactTestUtils.Simulate.mouseOut(name);
                expect(getProvideMenuVisibility(pmViews[0])).not.toEqual('none');
            });
        });
    });

    describe("Integration with PlacedModuleView", () => {

        function triggerEvent(pmView, event: string) {
            pmView.$('.module-svg-container').trigger(event);
        }

        describe("Suppressed provides", () => {
            it("on PlacedModuleView mouseenter, the provide menu is revealed", () => {
                const pmView = makePmView();
                renderProvideOptionsView({tooManyOptions: true, placedModuleViews: [pmView]});
                // PlacedModuleView is still Backbone, so we use JQuery events here.
                triggerEvent(pmView, 'mouseenter');
                expect(getProvideMenuVisibility(pmView)).not.toEqual('none');
            });

            it("on PlacedModuleView mouseleave, the provide menu is hidden again", () => {
                const pmView = makePmView();
                renderProvideOptionsView({tooManyOptions: true, placedModuleViews: [pmView]});
                triggerEvent(pmView, 'mouseenter');
                triggerEvent(pmView, 'mouseleave');
                expect(getProvideMenuVisibility(pmView)).toEqual('none');
            });

            it("on PlacedModuleView mousedown selection, the provide menu stays revealed even after mouseleave", () => {
                const pmView = makePmView();
                renderProvideOptionsView({tooManyOptions: true, placedModuleViews: [pmView]});
                triggerEvent(pmView, 'mousedown');
                triggerEvent(pmView, 'mouseleave');
                expect(getProvideMenuVisibility(pmView)).not.toEqual('none');
            });
        });
    });

    describe("Integration with WorkspaceView", () => {

        let workspace = null;

        beforeEach(() => {
            workspace = makeWorkspaceView();
        });

        afterEach(() => {
            workspace.remove();
            workspace = null;
        });

        function makeWorkspaceView(): WorkspaceView {
            return new WorkspaceView({
                model: new Workspace(true, true),
                panel: {
                    $el: $('<div></div>'),
                    remove: () => {}
                }
            } as WorkspaceViewOptions);
        }

        function publishOptionsSet(placedModuleId?: string): void {
            eventDispatcher.publishEvent(ON_OPTIONS_SET, {
                placedModuleIds: placedModuleId ? [placedModuleId] : [],
                hasTooManyOptions: false,
                requireName: 'REQUIRE'
            } as ProvideOptionsSetEvent);
        }

        describe("On provide options set", () => {
            it("renders the option view widget", () => {
                const designRev = overrideDesignRevision();
                const pm = designRev.addModule(makeModule(), {x: 30, y: 55});
                publishOptionsSet(pm.uuid);
                expect(workspace.el.querySelector('.provider-options').textContent).toContain(pm.name);
            });

            it("adds a CSS class selector to the workspace (that controls the rendering of placed modules)", () => {
                publishOptionsSet();
                expect(workspace.el.classList).toContain('connecting-require-js');
            });
        });

        describe("On reset connecting", () => {
            it("removes the option view widget", () => {
                const designRev = overrideDesignRevision();
                publishOptionsSet();
                designRev.resetConnectingModules();
                expect(workspace.el.querySelector('.provider-options')).toBeNull();
            });

            it("removes the mode's CSS class selector", () => {
                const designRev = overrideDesignRevision();
                publishOptionsSet();
                designRev.resetConnectingModules();
                expect(workspace.el.classList).not.toContain('connecting-require-js');
            });
        });

        describe("on set new design", () => {
            it("removes the option view widget", () => {
                overrideDesignRevision();
                publishOptionsSet();
                eventDispatcher.publish(CURRENT_DESIGN_SET);
                expect(workspace.el.classList).not.toContain('connecting-require-js');
            });
        });
    });
});
