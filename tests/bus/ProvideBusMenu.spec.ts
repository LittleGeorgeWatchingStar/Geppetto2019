import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import {Workspace} from "../../src/workspace/Workspace";
import {busResource} from "./TestBus";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {RequireBus} from "../../src/bus/RequireBus";
import ConnectionController from "../../src/connection/ConnectionController";
import * as ReactTestUtils from 'react-dom/test-utils';
import {ProvideBusMenuView} from "../../src/bus/ProvideBusMenu";

function getMockedModule(): PlacedModule {
    return new PlacedModuleBuilder().build();
}

function getPlacedModuleView(placedModule: PlacedModule) {
    return new PlacedModuleView({
        model: placedModule,
        workspace: new Workspace(true, true),
        onMousewheel: () => {}
    });
}

function getViewWithProvides(numProvides: number,
                             placedModule: PlacedModule = getMockedModule()): PlacedModuleView {
    const provides = [];
    for (let i = 0; i < numProvides; i++) {
        const provide = placedModule.addProvide(busResource());
        provides.push(provide);
    }
    const view = getPlacedModuleView(placedModule);
    placedModule.set('options', provides); // Trigger provide menu render
    return view;
}

function getRequire(): RequireBus {
    const placedModule = new PlacedModuleBuilder().build();
    return placedModule.addRequire(busResource());
}

let pmView = null;

describe("ProvideBusMenu", function () {

    afterEach(() => {
        if (pmView) {
            // Detach listenTo events.
            pmView.remove();
            pmView = null;
            document.clear();
        }
    });

    function scroll(menu: HTMLElement, direction: -1 | 1) {
        ReactTestUtils.Simulate.wheel(menu.querySelector('.provide .menu'), {deltaY: direction});
    }

    function scrollDown(menu: HTMLElement) {
        scroll(menu, 1);
    }

    function scrollUp(menu: HTMLElement) {
        scroll(menu, -1);
    }

    function getProvideBuses(pmView: PlacedModuleView): HTMLLIElement[] {
        return Array.from(pmView.el.querySelectorAll('[data-test="provide-bus"]'));
    }

    it("renders", function () {
        pmView = getViewWithProvides(3);
        const numProvides = Array.from(pmView.el.querySelectorAll('[data-test="provide-bus"]')).length;
        expect(numProvides).toEqual(3);
    });

    it("puts the bus currently connected to the selected require at the top of the menu", function () {
        const placedModule = getMockedModule();
        const provides = [];
        for (let i = 0; i < 3; i++) {
            const provide = placedModule.addProvide(busResource({name: i.toString()}));
            provides.push(provide);
        }
        const lastProvide = provides[2];
        const require = getRequire();
        require.setConnectedProvide(lastProvide);
        ConnectionController.setRequireToConnect(require);

        pmView = getPlacedModuleView(placedModule);
        placedModule.set('options', provides); // Trigger provide menu render
        const firstProvideName = pmView.el.querySelector('.bus-name');
        expect(firstProvideName.textContent).toEqual(lastProvide.name);
    });

    it("paginates menus that are too large", function () {
        pmView = getViewWithProvides(13);
        expect(getProvideBuses(pmView).length).toEqual(ProvideBusMenuView.PAGINATE);
    });

    it("can be navigated forward by scrolling down", function () {
        const numBuses = 13;
        pmView = getViewWithProvides(numBuses);
        scrollDown(pmView.el);
        expect(getProvideBuses(pmView).length).toEqual(numBuses - ProvideBusMenuView.PAGINATE);
    });

    it("can be navigated backward by scrolling up", function () {
        const numBuses = 13;
        pmView = getViewWithProvides(numBuses);
        scrollDown(pmView.el);
        scrollUp(pmView.el);
        expect(getProvideBuses(pmView).length).toEqual(ProvideBusMenuView.PAGINATE);
    });

    describe("single page options", function () {
        it("have no visual difference when scrolled", function () {
            pmView = getViewWithProvides(3);
            const busList = pmView.el.querySelector('.provide .menu').innerHTML;
            scrollDown(pmView.el);
            expect(pmView.el.querySelector('.provide .menu').innerHTML).toEqual(busList);
        });
    });

    describe("control widgets", function () {
        it("get added once for menus larger than one page", function () {
            pmView = getViewWithProvides(13);
            const nextControlExists = pmView.el.querySelector('.next') !== null;
            const prevControlExists =  pmView.el.querySelector('.prev') !== null;
            expect(nextControlExists && prevControlExists).toBe(true);
        });

        it("do not get added for menus that are only one page", function () {
            pmView = getViewWithProvides(3);
            const nextControlExists = pmView.el.querySelector('.next') !== null;
            const prevControlExists =  pmView.el.querySelector('.prev') !== null;
            expect(nextControlExists && prevControlExists).toBe(false);
        });

        it("can go to the next page by clicking next", function () {
            const numBuses = 13;
            pmView = getViewWithProvides(numBuses);
            ReactTestUtils.Simulate.click(pmView.el.querySelector('.next'));
            expect(getProvideBuses(pmView).length).toEqual(numBuses - ProvideBusMenuView.PAGINATE);
        });

        it("can go to the previous page by clicking prev", function () {
            const numBuses = 13;
            pmView = getViewWithProvides(numBuses);
            ReactTestUtils.Simulate.click(pmView.el.querySelector('.next'));
            ReactTestUtils.Simulate.click(pmView.el.querySelector('.prev'));
            expect(getProvideBuses(pmView).length).toEqual(ProvideBusMenuView.PAGINATE);
        });

        it("displays the current page on hover", function () {
            pmView = getViewWithProvides(13);
            ReactTestUtils.Simulate.mouseOver(pmView.el.querySelector('.provide .menu'));
            ReactTestUtils.Simulate.click(pmView.el.querySelector('.next'));
            expect(pmView.el.querySelector('.current-page-label').textContent).toEqual("Page 2 of 2");
        });

        it('blanks out the previous arrow control on the first page', function () {
            pmView = getViewWithProvides(13);
            const prevControl = pmView.el.querySelector('.prev');
            expect(prevControl.classList).toContain('disabled-js');
        });

        it('blanks out the forward arrow control when we have reached the last page', function () {
            pmView = getViewWithProvides(13);
            const control = pmView.el.querySelector('.next');
            ReactTestUtils.Simulate.click(control);
            expect(control.classList).toContain('disabled-js');
        });

        it('restores the forward arrow control when we are not on the last page', function () {
            pmView = getViewWithProvides(13); // Two pages
            const control = pmView.el.querySelector('.next');
            ReactTestUtils.Simulate.click(control);
            ReactTestUtils.Simulate.click(pmView.el.querySelector('.prev'));
            expect(control.classList).not.toContain('disabled-js');
        });
    });

    describe("on mouse over", function () {
        it("fades out other provide menus", function (done) {
            pmView = getViewWithProvides(1);
            const otherPmView = getViewWithProvides(1);
            pmView.$('.provide-bus-menu-container').mouseenter();
            // Account for fade out delay
            setTimeout(() => {
                const displayMode = otherPmView.el.querySelector('.provide-bus-menu-container').style.display;
                expect(displayMode).toEqual('none');
                otherPmView.remove();
                done();
            }, 150);
        });
    });

    describe("on mouse out", function () {
        it("restores other provide menus", function (done) {
            pmView = getViewWithProvides(1);
            const otherPmView = getViewWithProvides(1);
            pmView.$('.provide-bus-menu-container').mouseenter();
            // Account for fade out delay
            setTimeout(() => {
                pmView.$('.provide-bus-menu-container').mouseleave();
                const displayMode = otherPmView.el.querySelector('.provide-bus-menu-container').style.display;
                expect(displayMode).not.toEqual('none');
                otherPmView.remove();
                done();
            }, 150);
        });
    });
});
