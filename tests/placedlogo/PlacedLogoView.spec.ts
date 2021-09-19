import {Workspace} from "../../src/workspace/Workspace";
import {PlacedLogo} from "../../src/placedlogo/PlacedLogo";
import {PlacedLogoView} from "../../src/placedlogo/PlacedLogoView";
import * as $ from "jquery";
import eventDispatcher from "../../src/utils/events";
import {PLACED_LOGO_CLICK, PLACED_LOGO_SELECT} from "../../src/placedlogo/events";
import {PlacedLogoBuilder} from "./PlacedLogoBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";


function makeView(pl?: PlacedLogo): PlacedLogoView {
    createRequiredDomNodes();
    return new PlacedLogoView({
        model: pl ? pl : new PlacedLogoBuilder().build(),
        workspace: new Workspace(true, true),
        onMousewheel: event => {}
    });
}

/**
 * Testing focus events (document.activeElement) requires the module to be added to the document.
 */
function makeViewOnBoard(): PlacedLogoView {
    const placedLogo = makeView();
    placedLogo.$el.appendTo('#board');
    return placedLogo;
}

function createRequiredDomNodes() {
    // Create the target DOM node to which the view will attach.
    $('body').html(`<div id="design" class="test">
                       <div class="module-info" tabindex="0">Test</div>
                       <div id="board"></div>
                       <input type="text" id="search"/>
                       <div id="dialog" tabindex="0"></div>
                    </div>`);
}

describe("PlacedLogoView", function () {

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
            view = makeView();
            expect(view.el.tagName).toMatch('DIV');
        });
        it("has the expected DOM class", function () {
            view = makeView();
            expect(view.$el.hasClass('logo')).toBe(true);
        });
    });

    describe("z-index", function () {
        function getZIndex(view: PlacedLogoView): string {
            return view.$el.find('.logo-svg-container').css('zIndex');
        }

        it("defaults to something reasonable", function () {
            view = makeView();
            view.render();
            expect(getZIndex(view)).toMatch('');
        });

        it("can be set", function () {
            view = makeView();
            view.render();
            view.zIndex = 12;
            expect(getZIndex(view)).toMatch('12');
        });
    });

    describe("on click", function () {
        it("triggers click event on the logo svg", function () {
            let eventFired = false;
            view = makeView();
            view.render();
            eventDispatcher.subscribe(PLACED_LOGO_CLICK, () => eventFired = true);
            view.$el.find('.logo-svg-container').click();
            expect(eventFired).toBe(true);
        });
    });

    describe("on select", function () {
        it("selects the logo", function () {
            view = makeView();

            view.$el.find('.logo-svg-container').mousedown();
            expect(view.$el.hasClass('selected')).toBe(true);
        });

        it("doesn't deselect or select the same selected logo", function () {
            view = makeView();
            const module = view.$el.find('.logo-svg-container');
            let numSelections = 0;

            eventDispatcher.subscribe(PLACED_LOGO_SELECT, () => numSelections++);
            module.mousedown();
            module.mousedown();
            expect(view.$el.hasClass('selected')).toBe(true);
            expect(numSelections).toEqual(1);
        });

        it("deselects if you select another logo", function () {
            const designRev = new DesignRevisionBuilder().build();
            const logo = new PlacedLogoView({
                model: new PlacedLogoBuilder().withDesignRevision(designRev).build(),
                workspace: new Workspace(true, true),
                onMousewheel: event => {}
            });
            const other = new PlacedLogoView({
                model: new PlacedLogoBuilder().withDesignRevision(designRev).build(),
                workspace: new Workspace(true, true),
                onMousewheel: event => {}
            });
            logo.$('.logo-svg-container').mousedown();
            other.$('.logo-svg-container').mousedown();
            expect(logo.$el.hasClass('selected')).toBe(false);
            logo.remove();
            other.remove();
        });
    });

    describe("context menu", function () {
        it("renders items", function () {
            view = makeView();

            view.$el.find('.logo-svg-container').contextmenu();
            const numItems = $('.contextmenu').find('li').length;
            expect(numItems > 0).toBe(true);
        })
    });
});
