import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import * as $ from "jquery";
import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import {busResource} from "../bus/TestBus";
import {RequireBusView} from "../../src/bus/RequireBusView";
import ConnectionController from "../../src/connection/ConnectionController";
import {ModuleBuilder} from "../module/ModuleBuilder";
import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";
import {closeBlockMenu} from "../../src/placeditem/view/Menu";
import {closeContext} from "../../src/view/ContextMenu";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Workspace} from "../../src/workspace/Workspace";
import {selectContextItem} from "../view/ContextMenu.spec";
import {FeatureFlag} from "../../src/auth/FeatureFlag";


describe("PlacedModuleView context menu", function () {

    let view = null;

    afterEach(() => {
        if (view) {
            // Detach listenTo events.
            view.remove();
            view = null;
            closeBlockMenu();
            closeContext();
            document.clear();
        }
    });

    function makePmView(pm?: PlacedModule): PlacedModuleView {
        return new PlacedModuleView({
            model: pm ? pm : new PlacedModuleBuilder().build(),
            workspace: new Workspace(true, true),
            onMousewheel: () => {}
        });
    }

    function triggerRightClickContext(view: PlacedModuleView): JQuery {
        const context = $.Event('contextmenu', {
            which: 3
        });
        view.$('.module-svg-container').trigger(context);
        return $('.contextmenu');
    }

    it("renders items", function () {
        view = makePmView();
        const $menu = triggerRightClickContext(view);
        expect(($menu).css('display')).toEqual('block');
        const numItems = $menu.find('li').length;
        expect(numItems > 0).toBe(true);
    });

    it("closes on document left mousedown", function () {
        view = makePmView();
        triggerRightClickContext(view);
        const event = $.Event('mousedown', {
            which: 1
        }) as JQuery.Event<Document>;
        $(document).trigger(event);
        expect(document.querySelector('.contextmenu')).toBeNull();
    });

    it("closes on require select", function () {
        const placedModule = new PlacedModuleBuilder().build();
        const require = placedModule.addRequire(busResource());
        spyOn(require, 'needsVlogicPower').and.callFake(() => false);
        view = makePmView();
        triggerRightClickContext(view);
        const requireView = new RequireBusView({
            model: require
        });
        requireView.$el.trigger('click');
        // Cancel the connecting status for future tests.
        ConnectionController.clearRequireToConnect();
        expect(document.querySelector('.contextmenu')).toBeNull();
    });

    it("renders 'connections' menu item", function () {
        const module = (new ModuleBuilder())
            .withCategory({id: 2, name: 'headers'})
            .build();
        const pm = (new PlacedModuleBuilder())
            .withModule(module)
            .build();
        view = makePmView(pm);
        const $menu = triggerRightClickContext(view);
        expect($menu.html()).toContain('connections');
    });

    it("does not render 'connections' menu item", function () {
        const module = (new ModuleBuilder())
            .withCategory({id: 2, name: 'lcd'})
            .build();
        const pm = (new PlacedModuleBuilder())
            .withModule(module)
            .build();
        view = makePmView(pm);
        const $menu = triggerRightClickContext(view);
        expect($menu.html()).not.toContain('connections');
    });

    it("adds a delete CSS class corresponding to the label", function () {
        view = makePmView();
        const $menu = triggerRightClickContext(view);
        expect($menu.find('.delete').length).toEqual(1);
    });

    it("adds a rotate CSS class corresponding to the label", function () {
        view = makePmView();
        const $menu = triggerRightClickContext(view);
        expect($menu.find('.rotate').length).toEqual(1);
    });

    it("adds a connections CSS class corresponding to the label", function () {
        const module = (new ModuleBuilder())
            .withCategory({id: 2, name: 'headers'})
            .build();
        const pm = (new PlacedModuleBuilder())
            .withModule(module)
            .build();
        view = makePmView(pm);
        const $menu = triggerRightClickContext(view);
        expect($menu.find('.connections').length).toEqual(1);
    });

    describe("Substitute option", function () {

        /**
         * At the moment, substitute is engineer-access only.
         */
        function makeEngineer(): void {
            spyOn(UserController, "getUser").and.returnValue(
                {
                    isEngineer: () => true,
                    isBetaTester: () => true,
                    isLoggedIn: () => true,
                    isFeatureEnabled: (feature: FeatureFlag) => true,
                } as User);
        }

        it("is included if the module has a functional group", function () {
            makeEngineer();
            const module = new ModuleBuilder().withFunctionalGroup(2).build();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            view = makePmView(placedModule);
            const $menu = triggerRightClickContext(view);
            expect($menu.html()).toContain('substitute');
        });

        it("is not included if the module isn't in a functional group", function () {
            makeEngineer();
            const module = new ModuleBuilder().withFunctionalGroup(undefined).build();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            view = makePmView(placedModule);
            const $menu = triggerRightClickContext(view);
            expect($menu.html()).not.toContain('substitute');
        });
    });

    describe("Horizontal menu", function () {

        function triggerHorizontalContext(view: PlacedModuleView): Element {
            const select = $.Event('click', {
                which: 1
            });
            view.$('.module-svg-container').trigger(select);
            return document.querySelector('.contextmenu');
        }

        it("appears when you click a module", function () {
            view = makePmView();
            const context = triggerHorizontalContext(view);
            expect(context).not.toBeNull();
        });

        it("shows default options and custom options on initial appearance", function () {
            view = makePmView();
            view.model.setSelected(true);
            const context = triggerHorizontalContext(view);
            expect(context.innerHTML).toContain('90');
            expect(context.innerHTML).toContain('Info');
            expect(context.innerHTML).toContain('Rename');
        });

        describe("Rotate", function () {
            it("shows the module's current rotation", function () {
                const pm = new PlacedModuleBuilder().withRotation(180).build();
                view = makePmView(pm);
                const context = triggerHorizontalContext(view);
                expect(context.innerHTML).toContain('Rot: 180');
            });

            it("option does not close the context menu when selected", function () {
                view = makePmView();
                triggerHorizontalContext(view);
                selectContextItem('90');
                expect(document.querySelector('.contextmenu')).not.toBeNull();
            });

            it("option rotates the module when selected", function () {
                const pm = new PlacedModuleBuilder().build();
                view = makePmView(pm);
                triggerHorizontalContext(view);
                const prevRotation = pm.rotation;
                selectContextItem('90');
                expect(pm.rotation).toBeGreaterThan(prevRotation);
            });
        });
    });
});
