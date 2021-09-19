import {TabNavigation} from "../../src/view/TabNavigation";
import * as $ from "jquery";
import {TABBUTTON_CLICKED, TabEvent} from "../../src/view/events";
import eventDispatcher from "../../src/utils/events";
import * as Backbone from "backbone";
import {Tab} from "../../src/view/DesignsTab";


function makeDomNodes(): void {
    $('body').html('<div class="tabbuttons">' +
        '<div class="tabcontainer"></div></div>');
}

class FakeWorkspace extends Backbone.View<any> implements Tab {
    public url = TabNavigation.WORKSPACE;

    constructor() {
        super();
        this.setElement('<div class="workspace tabview"></div>');
    }

    onOpen() {
        this.$el.show();
    }

    onClose() {
        this.$el.hide();
    }
}

export function makeTabNav(): void {
    makeDomNodes();
    TabNavigation.initialize(true, [], $('.tabbuttons'), $('.tabcontainer'), new FakeWorkspace() as any);
}

describe("TabNavigation", function () {

    afterEach(() => {
        TabNavigation.designTabs.forEach((t: any) => t.remove());
    });

    it("renders", function () {
        makeTabNav();
        expect($(".tabbutton").length).toBeGreaterThan(0);
    });

    describe("Click tab open", function () {

        it("traverses to the correct tab", function () {
            makeTabNav();
            $(`.tabbutton.${TabNavigation.WORKSPACE}`).trigger('click');
            expect($(`.tabview.${TabNavigation.WORKSPACE}`).css('display')).not.toEqual('none');
        });

        it("publishes the correct identifier", function () {
            makeTabNav();
            let correctEventFired = false;
            eventDispatcher.subscribe(TABBUTTON_CLICKED, (event: TabEvent) => {
                correctEventFired = event.tab === TabNavigation.WORKSPACE;
            });
            $(`.tabbutton.${TabNavigation.WORKSPACE}`).trigger('click');
            expect(correctEventFired).toBe(true);
        });
    });

    describe("openTab", function () {

        it('makes the opened tab visible', function () {
            makeTabNav();
            TabNavigation.openWorkspace();
            expect($('.workspace.tabview').css('display')).not.toEqual('none');
        });

        it('hides other tabs', function () {
            makeTabNav();
            TabNavigation.openWorkspace();
            TabNavigation.openTab(TabNavigation.MY_DESIGNS);
            expect($('.workspace.tabview').css('display')).toEqual('none');
        });
    });

    describe("open dashboard", function () {
        it("makes the dashboard visible", function () {
            makeTabNav();
            TabNavigation.openDashboard();
            expect($('.dashboard.tabview').css('display')).not.toEqual('none');
        });
    });
});