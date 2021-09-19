import {SELECT_REQUIRE} from "../../src/bus/events";
import eventDispatcher from 'utils/events';
import {RequireBusView} from "../../src/bus/RequireBusView";
import "lib/jquery-ui";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Workspace} from "../../src/workspace/Workspace";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import {busResource} from "./TestBus";
import {RequireBus} from "../../src/bus/RequireBus";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {PLACED_MODULE_SELECT} from "../../src/placedmodule/events";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {RemoveModule} from "../../src/module/actions";
import ConnectionController from "../../src/connection/ConnectionController";


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
    return new PlacedModuleView({
        model: makePlacedModule(),
        workspace: new Workspace(true, true),
        onMousewheel: () => {}
    });
}

describe("RequireBusView", function () {
    it("starts in an unready state", function () {
        const view = makePlacedModuleView();
        const numBuses = view.$el.find('ol.require li').length;
        const numUnreadyBuses = view.$el.find('.unready').length;
        expect(numBuses).toEqual(numUnreadyBuses);
    });

    it("correctly disposes of event handlers when removed", function () {
        const require = makeRequire(new PlacedModuleBuilder().build());
        const view = new RequireBusView({model: require});
        const renderSpy = spyOn(view, 'render').and.callThrough();
        view.remove();
        eventDispatcher.publish(PLACED_MODULE_SELECT);
        expect(renderSpy).not.toHaveBeenCalled();
    });

    describe("on select", function () {
        it("triggers require select", function () {
            let selectedRequire = null;
            eventDispatcher.subscribe(SELECT_REQUIRE, event => {
                selectedRequire = event.model;
            });
            const placedModule = new PlacedModuleBuilder().build();
            const require = makeRequire(placedModule);
            const busView = new RequireBusView({model: require});

            busView.$el.click();
            expect(selectedRequire).toBe(require);
        });

        it("blanks out other requires", function () {
            const placedModule = new PlacedModuleBuilder().build();
            const require = makeRequire(placedModule);
            const otherRequire = makeRequire(placedModule);
            const busView = new RequireBusView({model: require});
            const otherBusView = new RequireBusView({model: otherRequire});

            busView.$el.click();
            expect(otherBusView.$el.hasClass('ui-state-disabled')).toBe(true);
        });
    });

    describe("on cancel connect", function () {
        it("rerenders, clearing the visual connection state", function () {
            const placedModule = new PlacedModuleBuilder().build();
            const require = makeRequire(placedModule);
            const otherRequire = makeRequire(placedModule);
            const busView = new RequireBusView({model: require});
            const otherBusView = new RequireBusView({model: otherRequire});

            busView.$el.click();
            ConnectionController.clearRequireToConnect();
            expect(otherBusView.$el.hasClass('ui-state-disabled')).toBe(false);
        });
    });

    describe("on module remove", function () {
        it("rerenders, clearing the visual connection state", function () {
            const designRev = new DesignRevisionBuilder().build();
            const placedModule = new PlacedModuleBuilder().withDesignRevision(designRev).build();
            const otherPlacedModule = new PlacedModuleBuilder().withDesignRevision(designRev).build();
            const require = makeRequire(placedModule);
            const otherRequire = makeRequire(otherPlacedModule);
            const busView = new RequireBusView({model: require});
            const otherBusView = new RequireBusView({model: otherRequire});
            busView.$el.click();
            new RemoveModule(placedModule).execute();
            expect(otherBusView.$el.hasClass('ui-state-disabled')).toBe(false);
        });
    });
});
