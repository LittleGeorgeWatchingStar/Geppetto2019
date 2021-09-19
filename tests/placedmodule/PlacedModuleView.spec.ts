import {Module} from "../../src/module/Module";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {FootprintBuilder} from "../module/feature/FootprintBuilder";
import makeModule from "../module/TestModule";
import {Workspace} from "../../src/workspace/Workspace";
import * as $ from 'jquery';
import "lib/jquery-ui";
import {busResource, groupResource} from "../bus/TestBus";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import eventDispatcher from 'utils/events';
import {PLACED_MODULE_CLICK, PLACED_MODULE_SELECT} from "../../src/placedmodule/events";
import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import {REFOCUS} from "../../src/toolbar/events";
import events from "../../src/utils/events";
import {WORKSPACE_CLICK} from "../../src/workspace/events";
import {EDGE_FOOTPRINT} from "../dimension/Dimension.spec";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

export function makePlacedModule(module: Module): PlacedModule {
    const pm = new PlacedModuleBuilder().withModule(module).build();
    pm.addRequire(busResource());
    pm.addProvide(busResource());
    return pm;
}

function makePmView(pm?: PlacedModule): PlacedModuleView {
    return new PlacedModuleView({
        model: pm ? pm : makePlacedModule(makeModule()),
        workspace: new Workspace(true, true),
        onMousewheel: event => {}
    });
}

describe("PlacedModuleView", function () {

    let view = null;

    afterEach(() => {
        if (view) {
            // Detach listenTo events.
            view.remove();
            view = null;
        }
    });

    describe("when constructed", function () {
        it("has the expected DOM tag", function () {
            view = makePmView();
            expect(view.el.tagName).toMatch('DIV');
        });
        it("has the expected DOM class", function () {
            view = makePmView();
            expect(view.$el.hasClass('module')).toBe(true);
        });
    });

    describe("when rendered", function () {
        /**
         * This test fails when ran by itself, #board is missing for
         * {@see PlacedItemView.updatePosition} to run.
         */
        it("renders the svg points", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder()
                    .withFeatures(new FootprintBuilder()
                        .rectangle(100, 60)
                        .build())
                    .build())
                .build();
            view = makePmView(pm);
            view.render();

            const actual = view.$('path.footprint').attr('d');
            const expected = 'M 0 60 L 0 0 L 100 0 L 100 60 L 0 60';
            expect(actual).toEqual(expected);
        });

        it("shows edge lines", function () {
            const edgeModule = new ModuleBuilder()
                    .withFeatures(EDGE_FOOTPRINT)
                    .build();
            const pm = new PlacedModuleBuilder()
                .withModule(edgeModule)
                .build();
            view = makePmView(pm);
            view.render();
            expect(view.$('.edge').length).toEqual(1);
        });
    });

    describe("z-index", function () {
        function getZIndex(view: PlacedModuleView): string {
            return view.$el.find('.module-svg-container').css('zIndex');
        }

        it("defaults to something reasonable", function () {
            view = makePmView();
            view.render();
            expect(getZIndex(view)).toMatch('');
        });

        it("can be set", function () {
            view = makePmView();
            view.render();
            view.zIndex = 12;
            expect(getZIndex(view)).toMatch('12');
        });
    });

    describe("require menu", function () {
        it("renders", function () {
            const pm = makePlacedModule(makeModule());
            pm.addBusGroup(groupResource());
            pm.addRequire(busResource({name: 'whiz-bang'}));

            view = makePmView(pm);

            expect(view.$el.html()).toMatch('whiz-bang');
        });
    });

    describe("custom name", function () {
        it("renders", function () {
            const pm = makePlacedModule(makeModule());
            pm.setCustomName('This is a custom name');

            view = makePmView(pm);

            expect(view.$el.html()).toMatch('This is a custom name');
        });

        it("renders on change", function () {
            const pm = makePlacedModule(makeModule());
            view = makePmView(pm);
            pm.setCustomName('This is a custom name');
            expect(view.$el.html()).toMatch('This is a custom name');
        });
    });

    describe("on click", function () {
        it("triggers click event on the module svg", function () {
            let eventFired = false;
            view = makePmView();
            view.render();
            eventDispatcher.subscribe(PLACED_MODULE_CLICK, () => eventFired = true);

            view.$el.find('.module-svg-container').click();
            expect(eventFired).toBe(true);
        });

        it("doesn't trigger click on the menus", function () {
            let eventFired = false;
            view = makePmView();
            view.render();
            eventDispatcher.subscribe(PLACED_MODULE_CLICK, () => eventFired = true);

            view.$el.find('ol.menu-page').click();
            expect(eventFired).toBe(false);
        });

        it("doesn't bubble up to the workspace", function () {
            let eventFired = false;
            view = makePmView();
            view.render();
            eventDispatcher.subscribe(WORKSPACE_CLICK, () => eventFired = true);
            view.$el.find('.module-svg-container').click();
            expect(eventFired).toBe(false);
        });

        it("doesn't trigger click event if it is displaying provide options", () => {
            let eventFired = false;
            eventDispatcher.subscribe(PLACED_MODULE_CLICK, () => eventFired = true);
            view = makePmView();
            view.model.setOptions(view.model.getProvides());
            view.$('.module-svg-container').click();
            expect(eventFired).toBe(false);
        });

        it("doesn't select the module if it is displaying provide options", () => {
            view = makePmView();
            view.model.setOptions(view.model.getProvides());
            view.$('.module-svg-container').mousedown();
            expect(view.model.isSelected).toBe(false);
        });
    });

    describe("on select", function () {
        it("selects the module", function () {
            view = makePmView();

            view.$el.find('.module-svg-container').mousedown();
            expect(view.$el.hasClass('selected')).toBe(true);
        });

        it("triggers when you mousedown a require menu-page", function () {
            view = makePmView();

            view.$el.find('.require .menu-page').mousedown();
            expect(view.$el.hasClass('selected')).toBe(true);
        });

        it("does not trigger with provide", function () {
            view = makePmView();

            view.$el.find('.provide .menu').mousedown();
            expect(view.$el.hasClass('selected')).toBe(false);
        });

        it("doesn't deselect or select the same selected module", function () {
            view = makePmView();
            const module = view.$el.find('.module-svg-container');
            let numSelections = 0;

            eventDispatcher.subscribe(PLACED_MODULE_SELECT, () => numSelections++);
            module.mousedown();
            module.mousedown();
            expect(view.$el.hasClass('selected')).toBe(true);
            expect(numSelections).toEqual(1);
        });

        it("deselects if you select another module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const module = new PlacedModuleView({
                model: new PlacedModuleBuilder().withDesignRevision(designRev).build(),
                workspace: new Workspace(true, true),
                onMousewheel: event => {}
            });
            const otherModule = new PlacedModuleView({
                model: new PlacedModuleBuilder().withDesignRevision(designRev).build(),
                workspace: new Workspace(true, true),
                onMousewheel: event => {}
            });
            module.$('.module-svg-container').mousedown();
            otherModule.$('.module-svg-container').mousedown();
            expect(module.$el.hasClass('selected')).toBe(false);
            module.remove();
            otherModule.remove();
        });
    });

    describe("On REFOCUS", function () {
        it("rerenders even if the zoom didn't change", function () {
            view = makePmView();
            const renderFunction = spyOn(view, 'render').and.callThrough();
            events.publish(REFOCUS);
            expect(renderFunction).toHaveBeenCalled();
        });
    });
});
