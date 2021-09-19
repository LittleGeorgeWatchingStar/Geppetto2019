import {busResource} from "./TestBus";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import {RequireBus} from "../../src/bus/RequireBus";
import {Workspace} from "../../src/workspace/Workspace";
import eventDispatcher from "../../src/utils/events";
import {ExclusionSet} from "../../src/bus/exclusion/ExclusionSet";
import {PLACED_MODULE_SELECT} from "../../src/placedmodule/events";
import {ExclusionMenu} from "../../src/bus/exclusion/ExclusionMenu";
import {RequireBusMenu} from "../../src/bus/RequireBusMenu";
import {BusMenuOptions} from "../../src/bus/BusMenu";
import BomOptionView from "module/BomOption/BomOptionView";
import {BomOption} from "../../src/module/BomOption/BomOption";
import {
    BomChoiceResourceBuilder,
    BomOptionResourceBuilder
} from "../bomoptions/BomOptionBuilder";

function makeRequire(placedModule: PlacedModule): RequireBus {
    return placedModule.addRequire(busResource());
}

function makePlacedModule(): PlacedModule {
    const placedModule = new PlacedModuleBuilder().build();
    makeRequire(placedModule);
    makeRequire(placedModule);
    return placedModule;
}

function makePlacedModuleView(): PlacedModuleView {
    placedModuleView = new PlacedModuleView({
        model: makePlacedModule(),
        workspace: new Workspace(true, true),
        onMousewheel: () => {}
    });
    return placedModuleView;
}

function makeMenu(): RequireBusMenu {
    const placedModule = makePlacedModule();
    const set = makeExclusionSet(placedModule);
    // TODO exclusions are server data, and the current implementation is difficult to mock.
    spyOnProperty(placedModule, "exclusionSets", "get").and.returnValue([set, set]);
    const buses = placedModule.getRequires();
    return new RequireBusMenu({
        model: placedModule,
        buses: buses
    } as BusMenuOptions);
}

function makeExclusionSet(placedModule: PlacedModule): ExclusionSet {
    const require1 = makeRequire(placedModule);
    const require2 = makeRequire(placedModule);
    require1.setExclusions([require2]);
    require2.setExclusions([require1]);
    return new ExclusionSet([
        require1,
        require2
    ]);
}

function makeExclusionMenu(placedModule?: PlacedModule): ExclusionMenu {
    const set = makeExclusionSet(placedModule ? placedModule : new PlacedModuleBuilder().build());
    return new ExclusionMenu({collection: set});
}

let placedModuleView = null;

describe("RequireBusMenu", function () {

    afterEach(() => {
        if (placedModuleView) {
            // Detach listenTo events.
            placedModuleView.remove();
            placedModuleView = null;
        }
    });

    it("renders", function () {
        const view = makePlacedModuleView();
        const numBuses = view.$el.find('ol.require li').length;
        expect(numBuses).toBeGreaterThan(0);
        view.remove();
    });

    it("removes its child views when disposed", function () {
        const view = makePlacedModuleView();
        view.remove();
        const numBuses = view.$el.find('li.bus').length;
        expect(numBuses).toEqual(0);
    });

    /**
     * This behaviour is shared across ExclusionMenu and BomOptionsView.
     */
    describe("SubMenu", function () {

        let requireBusMenu = null;

        beforeEach(function () {
            requireBusMenu = makeMenu();
        });

        it("renders when it is the only bus item", function () {
            // There was a bug where a submenu did not render if there were no "regular" requires.
            const placedModule = new PlacedModuleBuilder().build();
            const set = makeExclusionSet(placedModule);
            spyOnProperty(placedModule, "exclusionSets", "get").and.returnValue([set]);
            const view = new PlacedModuleView({
                model: placedModule,
                workspace: new Workspace(true, true),
                onMousewheel: () => {}
            });
            expect(view.$el.find('.submenu-option').length).toEqual(1);
        });

        it("opens on mouseenter", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.submenu-option').mouseenter();
            expect($submenu.find('.sub-options').css('display')).toEqual('block');
        });

        it("opens on click", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.submenu-option').click();
            expect($submenu.find('.sub-options').css('display')).toEqual('block');
        });

        it("closes on mouseleave", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.submenu-option').mouseenter();
            $submenu.find('.submenu-option').mouseleave();
            expect($submenu.find('.sub-options').css('display')).toEqual('none');
        });

        it("does not close on mouseleave after being clicked", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.submenu-option').click();
            $submenu.find('.submenu-option').mouseleave();
            expect($submenu.find('.sub-options').css('display')).toEqual('block');
        });

        it("does not close on mouseleave after one of its options are clicked", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.sub-options li').first().click();
            $submenu.find('.submenu-option').mouseleave();
            expect($submenu.find('.sub-options').css('display')).toEqual('block');
        });

        it("closes when a top-level require is clicked", function () {
            requireBusMenu.$('.sub-options li').first().click();
            requireBusMenu.$('.bus').first().click();
            expect(requireBusMenu.$('.sub-options').css('display')).toEqual('none');
        });

        it("closes when another submenu is moused over", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.sub-options li').first().click();
            requireBusMenu.$('.submenu-option').last().mouseenter();
            expect($submenu.find('.sub-options').css('display')).toEqual('none');
        });

        it("doesn't close when its own submenu is moused over", function () {
            const $submenu = requireBusMenu.$('.exclusion-menu').first();
            $submenu.find('.sub-options li').first().click();
            $submenu.find('.submenu-option').mouseenter();
            expect($submenu.find('.sub-options').css('display')).toEqual('block');
        });
    });

    describe("ExclusionMenu", function () {
        it("renders", function () {
            const menu = makeExclusionMenu();
            expect(menu.$('li').length).toEqual(2);
        });

        it("has a DOM node with the class .submenu-option", function () {
            // This class is used to render some CSS in addition to interactions.
            const menu = makeExclusionMenu();
            expect(menu.$('.submenu-option').length).toEqual(1);
        });

        it("correctly disposes of event handlers when removed", function () {
            const view = new ExclusionMenu({collection: new ExclusionSet()});
            const renderSpy = spyOn(view, 'render').and.callThrough();
            view.remove();
            eventDispatcher.publish(PLACED_MODULE_SELECT);
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it("correctly colour codes itself when its exclusion set is ready", function () {
            const placedModule = new PlacedModuleBuilder().build();
            const set = makeExclusionSet(placedModule);
            const menu = new ExclusionMenu({collection: set});
            spyOn(set, 'isReady').and.returnValue(true);
            menu.render();
            expect(menu.$el.hasClass('ready')).toBe(true);
        });

        it("correctly colour codes itself when its exclusion set is connected", function () {
            const placedModule = new PlacedModuleBuilder().build();
            const set = makeExclusionSet(placedModule);
            const menu = new ExclusionMenu({collection: set});
            spyOn(set, 'isConnected').and.returnValue(true);
            menu.render();
            expect(menu.$el.hasClass('connected')).toBe(true);
        });
    });

    describe("BOM options menu", function () {
        function getBomOption() {
            return new BomOption(
                new BomOptionResourceBuilder().withChoices([
                    new BomChoiceResourceBuilder().build()
                ]).build()
            );
        }

        function makeBomView() {
            return new BomOptionView({
                model: getBomOption()
            });
        }

        it("renders", function () {
            const view = makeBomView();
            expect(view.$el.find('li').length).toEqual(2);
        });

        it("has a DOM node with the class .submenu-option", function () {
            // This class is used to render some CSS in addition to interactions.
            const menu = makeBomView();
            expect(menu.$('.submenu-option').length).toEqual(1);
        });
    });
});
