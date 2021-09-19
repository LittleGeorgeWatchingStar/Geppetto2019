import {Library} from "../../src/module/Library";
import {Module} from "../../src/module/Module";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {Panel} from "../../src/view/librarypanel/Panel";
import User from "../../src/auth/User";
import eventDispatcher from 'utils/events';
import UserController from "../../src/auth/UserController";
import {WorkspaceModuleInfoBox} from "../../src/module/ModuleInfoBox";
import * as $ from "jquery";
import {ModuleTile} from "../../src/view/librarypanel/ModuleTile";
import {
    ACTION_EXECUTED,
    PLACED_MODULE_REMOVE,
    PLACED_MODULE_SELECT,
    PM_SUBSTITUTE_START
} from "../../src/placedmodule/events";
import {FootprintBuilder} from "../module/feature/FootprintBuilder";
import {MODULE_INIT_BUSES, MODULE_TILE_CLICK, PROVIDERS_LOADING} from "../../src/module/events";
import * as _ from "underscore";
import {RemoveModule} from "../../src/module/actions";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ServerID} from "../../src/model/types";
import {RequireBus} from "../../src/bus/RequireBus";
import {busResource} from "../bus/TestBus";
import ConnectionController from "../../src/connection/ConnectionController";
import {DesignRevision} from "../../src/design/DesignRevision";
import {triggerSelectRequire} from "../connection/ConnectionController.spec";
import {overrideDesignRevision} from "../design/TestDesign";
import {Workspace} from "workspace/Workspace";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import * as ReactTestUtils from 'react-dom/test-utils';
import * as ReactDOM from "react-dom";
import * as React from "react";

function getLibrary(): Library {
    const library = new Library();
    const module = new ModuleBuilder().build();
    library.add(module);
    return library;
}

let nextRevisionId = 100;

function makeModule(name: string, categoryName = "Processors"): Module {
    const category = {
        name: categoryName,
        id: 1 // Not often used to identify the category.
    };
    return new ModuleBuilder()
        .withName(name)
        .withRevisionId(nextRevisionId++)
        .withCategory(category)
        .build();
}

function makeUser(): void {
    const u = new User();
    UserController.init(u);
}

/**
 * The library search sets a delay on modules changed. Override the delay.
 */
function mockDebounce(): void {
    spyOn(_, 'debounce').and.callFake((searchCallback) => {
        return (params) => searchCallback(params);
    });
}

function getRequireBus(): RequireBus {
    const res = busResource({
        placed_module: new PlacedModuleBuilder().build()
    });
    return new RequireBus(res);
}

function getFunctionalGroupModule(group: ServerID): Module {
    const id = nextRevisionId++;
    return new ModuleBuilder()
        .withModuleId(id)
        .withRevisionId(id)
        .withFunctionalGroup(group)
        .withFunctionalGroupName('Accelerometer')
        .withCategory({
            id: 1,
            name: "Sensors"
        })
        .build();
}

function beginSubstitute(module: Module): void {
    eventDispatcher.publishEvent(PM_SUBSTITUTE_START, {
        model: new PlacedModuleBuilder().withModule(module).build()
    });
}

describe("Panel", function () {

    let panel: Panel | null = null;

    beforeEach(() => {
        makeUser();
        mockDebounce();
    });

    afterEach(() => {
        if (panel) {
            panel.remove();
            panel = null;
        }
    });

    function makePanel(library = new Library(), defaultCategory = ''): void {
        panel = new Panel(new Workspace(true, true));
        panel.onModulesLoaded(library, defaultCategory);
    }

    /**
     * Opening a default library category often has an animation before it finishes loading.
     * Use this to wait for the animation.
     */
    function openFirstCategory(): Promise<any> {
        ReactTestUtils.Simulate.click(panel.el.querySelector('.default-header'));
        return new Promise(resolve => {
            setTimeout(function () {
                resolve();
            });
        });
    }

    function triggerSearch(value: string): void {
        const input = panel.el.querySelector('input');
        input.value = value;
        ReactTestUtils.Simulate.change(input);
    }

    it("creates a ModuleInfoBox on module tile click", function (done) {
        const library = new Library([
            makeModule('Gumstix Module'),
        ]);
        const box = new WorkspaceModuleInfoBox(document.createElement('div'), new Workspace(true, true));
        $('body').empty().append(box.$el);
        makePanel(library);
        openFirstCategory().then(() => {
            ReactTestUtils.Simulate.click(panel.el.querySelector('.module-tile'));
            expect(box.$('.module-info').length).toBeGreaterThan(0);
            expect(box.$el.height()).toBeGreaterThan(0);
            done();
        });
    });

    it("applies draggable on module tiles when loaded", function () {
        makePanel();
        const draggable = panel.$('.module-tile').draggable('instance');
        expect(draggable).not.toBeUndefined();
    });

    describe("render", function () {
        it("shows all categories of the library modules", function () {
            const library = new Library([
                makeModule('a', 'Pocky'),
                makeModule('b', 'Pretz'),
                makeModule('c', 'Pejoy')
            ]);
            makePanel(library);
            expect(panel.$('h3').length).toEqual(4); // Including the logo category.
        });

        it("shows the Logo and Prints category", function () {
            makePanel();
            expect(panel.$('h3:contains("Logos and Prints")').length).toEqual(1);
        });

        it("only shows the default library", function () {
            makePanel();
            expect(panel.$('.default-library').css('display')).not.toEqual('none');
            expect(panel.$('.search-library').css('display')).toEqual('none');
            expect(panel.$('.filtered-library').css('display')).toEqual('none');
        });

        it("disables the search box when modules haven't loaded", function () {
            panel = new Panel(new Workspace(true, true));
            expect(panel.el.querySelector('.panel-search').disabled).toBe(true);
        });

        it("enables the search box when modules have loaded", function () {
            panel = new Panel(new Workspace(true, true));
            panel.onModulesLoaded(new Library(), '');
            expect(panel.el.querySelector('.panel-search').disabled).toBe(false);
        });
    });

    describe("Loading state", () => {

        beforeEach(() => {
            makePanel();
            eventDispatcher.publishEvent(PROVIDERS_LOADING);
        });

        it("while providers are loading, adds a loading CSS class", () => {
            expect(panel.$el.hasClass('loading-js')).toBe(true);
        });

        it("after loading providers, removes the loading CSS class", () => {
            panel.showMatches(new Library());
            expect(panel.$el.hasClass('loading-js')).toBe(false);
        });

        it("after canceling a filter, removes the loading CSS class", () => {
            panel.cancelFilter();
            expect(panel.$el.hasClass('loading-js')).toBe(false);
        });
    });

    describe("Default library", function () {

        it("shows shelves if the default opened category is invalid", function () {
            const library = new Library([
                makeModule('a', 'Pocky')
            ]);
            makePanel(library, "How can mirrors be real if our eyes aren't real");
            expect(panel.$('.category-shelves').css('display')).not.toEqual('none');
            expect(panel.$('h3').length).toEqual(2); // Including the logo category.
        });

        describe("Default opened category", function () {
            it("renders", function () {
                const library = new Library([
                    makeModule('a', 'Pocky'),
                    makeModule('b', 'Pretz')
                ]);
                makePanel(library, 'Pocky');
                expect(panel.$('.default-library .module-tile').length).toEqual(1);
                expect(panel.$('.default-library').html()).toContain('Pocky');
            });

            it("renders category breadcrumbs", function () {
                const library = new Library([
                    makeModule('a', 'Pocky'),
                    makeModule('b', 'Pretz')
                ]);
                makePanel(library, 'Pocky');
                expect(panel.$('.panel-breadcrumbs').html()).toContain('Pocky');
            });

            it("applies navigation events to its breadcrumbs", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky'),
                    makeModule('b', 'Pretz')
                ]);
                makePanel(library, 'Pocky');
                const previousPanel = panel.el.innerHTML;
                // Exit the category shelf:
                ReactTestUtils.Simulate.click(panel.el.querySelector('.panel-breadcrumbs button'));
                // Wait for the animation:
                setTimeout(() => {
                    expect(previousPanel).not.toEqual(panel.el.innerHTML);
                    done();
                }, 200);
            });

            it("shows the back arrow", function () {
                const library = new Library([
                    makeModule('a', 'Pocky'),
                    makeModule('b', 'Pretz')
                ]);
                makePanel(library, 'Pocky');
                expect(panel.$('.panel-back').css('display')).not.toEqual('none');
            });
        });

        describe("Click category", function () {
            it("shows the category modules", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    expect(panel.$('.default-library .module-tile').length).toEqual(1);
                    done();
                });
            });

            it("places the module container into position", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    expect(panel.$('.category-modules').hasClass('slide-in-js')).toBe(true);
                    done();
                });
            });
        });

        describe("Exit category", function () {
            it("can be triggered by clicking the category header", function () {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library, 'Pocky'); // Open the "Pocky" category by default
                ReactTestUtils.Simulate.click(panel.el.querySelector('.category-header')); // Close shelf
                expect(panel.el.querySelector('.category-modules').innerHTML).toBe('');
            });

            it("shows the correct content in the category shelves", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.category-header'));
                    expect(panel.$('.default-header').length).toEqual(2); // Including the logo category.
                    done();
                });
            });

            it("hides the 'back' button", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.category-header'));
                    expect(panel.el.querySelector('.panel-back')).toBeNull();
                    done();
                });
            });

            it("places the module container into position", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.category-header'));
                    expect(panel.$('.category-modules').hasClass('slide-out-js')).toBe(true);
                    done();
                });
            });
        });

        describe("Category shelf reload", function () {
            it("does not destroy the breadcrumb click handlers", function (done) {
                const library = new Library([
                    makeModule('a', 'Pocky')
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    panel.showMatches(new Library()); // Open the filtered library
                    panel.cancelFilter();
                    // Exit the category shelf:
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.panel-breadcrumbs button'));
                    expect(panel.el.querySelector('.category-modules').innerHTML).toBe('');
                    done();
                });
            });
        });

        describe("on modules changed", function () {
            it("reloads modules, discarding the previous list of categories", function () {
                const moduleA = makeModule('a', 'Pocky');
                const library = new Library([
                    moduleA,
                    makeModule('b', 'Pejoy')
                ]);
                makePanel(library);
                library.remove(moduleA.id);
                expect(panel.$('.default-header').length).toEqual(2); // Including the logo category.
            });

            it("hides the back button upon returning to the default categories", function () {
                const moduleA = makeModule('a', 'Pocky');
                const library = new Library([
                    moduleA,
                    makeModule('b', 'Pejoy')
                ]);
                makePanel(library);
                library.remove(moduleA.id);
                expect(panel.el.querySelector('.panel-back')).toBeNull();
            });
        });

        describe("Functional group shelf", function () {

            it("files modules with the same functional group under a container", function (done) {
                const library = new Library([
                    getFunctionalGroupModule(1),
                    getFunctionalGroupModule(1),
                    getFunctionalGroupModule(1),
                ]);
                makePanel(library);
                openFirstCategory().then(() => {
                    const numTiles = panel.$('.default-library .module-tile').length;
                    const numFunctionalGroupShelves = panel.$('.functional-group').length;
                    expect(numTiles).toEqual(0);
                    expect(numFunctionalGroupShelves).toEqual(1);
                    done();
                });
            });

            describe("On click", function () {

                it("opens", function (done) {
                    const library = new Library([
                        getFunctionalGroupModule(1)
                    ]);
                    makePanel(library);
                    openFirstCategory().then(() => {
                        ReactTestUtils.Simulate.click(panel.el.querySelector('.functional-group'));
                        const numTiles = panel.$('.default-library .module-tile').length;
                        expect(numTiles).toEqual(1);
                        done();
                    });
                });

                it("updates the navigation", function (done) {
                    const module = getFunctionalGroupModule(1);
                    const library = new Library([
                        module
                    ]);
                    makePanel(library);
                    openFirstCategory().then(() => {
                        ReactTestUtils.Simulate.click(panel.el.querySelector('.functional-group'));
                        expect(panel.$('.panel-navigation').html()).toContain(module.functionalGroupName);
                        done();
                    });
                });
            });

            describe("Navigation breadcrumbs", function () {
                it("displays the current place as an unclickable element", function () {
                    const library = new Library([
                        getFunctionalGroupModule(1)
                    ]);
                    makePanel(library);
                    const lastBreadcrumb = panel.$('.panel-breadcrumbs').children().last();
                    expect(lastBreadcrumb.prop('tagName')).not.toEqual('BUTTON');
                });

                it("displays the previous place as a clickable button", function (done) {
                    const library = new Library([
                        getFunctionalGroupModule(1)
                    ]);
                    makePanel(library);
                    openFirstCategory().then(() => {
                        const lastBreadcrumb = panel.$('.panel-breadcrumbs').children().first();
                        expect(lastBreadcrumb.prop('tagName')).toEqual('BUTTON');
                        done();
                    });
                });

                it("renders correctly while in a functional group", function () {
                    const module = getFunctionalGroupModule(1);
                    const library = new Library([module]);
                    makePanel(library, module.categoryName);
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.functional-group'));
                    // All categories > Sensors > Accelerometers
                    const breadcrumbs = panel.$('.panel-breadcrumbs').children();
                    expect(breadcrumbs.length).toEqual(3);
                    expect(breadcrumbs[1].innerHTML).toContain(module.categoryName);
                    expect(breadcrumbs[2].innerHTML).toContain(module.functionalGroupName);
                });

                it("can be used to traverse to a category", function () {
                    const module = getFunctionalGroupModule(1);
                    const library = new Library([module]);
                    makePanel(library, module.categoryName);
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.functional-group'));
                    // All categories > Sensors > Accelerometers: Click Sensors
                    const prevContent = panel.el.innerHTML;
                    ReactTestUtils.Simulate.click(panel.el.querySelectorAll('.panel-breadcrumbs button')[1]);
                    expect(prevContent).not.toEqual(panel.el.innerHTML);
                });

                it("renders correctly when traversing to a category", function () {
                    const module = getFunctionalGroupModule(1);
                    const library = new Library([module]);
                    makePanel(library, module.categoryName);
                    ReactTestUtils.Simulate.click(panel.el.querySelector('.functional-group'));
                    // All categories > Sensors > Accelerometers
                    ReactTestUtils.Simulate.click(panel.el.querySelectorAll('.panel-breadcrumbs button')[1]);
                    const breadcrumbs = panel.$('.panel-breadcrumbs').children();
                    expect(breadcrumbs.length).toEqual(2);
                    expect(breadcrumbs[1].innerHTML).toContain(module.categoryName);
                });
            });
        });
    });

    describe("search filter", function () {

        it('does not hide the search container', function () {
            makePanel();
            triggerSearch('baa');
            const searchBox = panel.$('.search-container');
            expect(searchBox.css('display')).not.toEqual('none');
        });

        it("correctly displays matching modules in the library when performing an input search", function () {
            const library = new Library([
                makeModule('aab'),
                makeModule('baa'),
            ]);
            makePanel(library);
            triggerSearch('baa');
            expect(panel.$('.search-library').css('display')).not.toEqual('none');
            expect(panel.$('.default-library').css('display')).toEqual('none');
            expect(panel.el.querySelectorAll('.search-library .module-tile').length).toEqual(1);
        });

        describe("Clear button", function () {
            it("renders in search mode", function () {
                makePanel();
                triggerSearch('baa');
                expect(panel.el.querySelector('.clear')).not.toBeNull();
            });

            it("does not render when not in search mode", function () {
                makePanel();
                triggerSearch('baa');
                triggerSearch('b');
                expect(panel.el.querySelector('.clear')).toBeNull();
            });

            it("clears the search on click", function () {
                const library = new Library([
                    makeModule('aab'),
                    makeModule('baa'),
                ]);
                makePanel(library);
                triggerSearch('baa');
                ReactTestUtils.Simulate.click(panel.el.querySelector('.clear'));
                const isSearchLibraryVisible = panel.$('.search-library').css('display') !== 'none';
                const isDefaultLibraryVisible = panel.$('.default-library').css('display') !== 'none';
                expect(isSearchLibraryVisible).toBe(false);
                expect(isDefaultLibraryVisible).toBe(true);
                expect(panel.el.querySelector('input').value).toBe('');
                expect(panel.el.querySelectorAll('.search-library .module-tile').length).toEqual(0);
            });
        });

        it("displays only one of the same module tile at once", function () {
            const library = new Library([
                makeModule('aaac'),
                makeModule('aaab'),
            ]);
            makePanel(library);
            triggerSearch('aaa');
            triggerSearch('aaa');
            expect(panel.$('.search-library .module-tile').length).toEqual(2);
        });

        it("remembers opened shelf after search is cleared", function (done) {
            const modules = [
                new ModuleBuilder()
                    .withName('mod1')
                    .withCategory({id: 1, name: 'cate1'})
                    .withRevisionId(nextRevisionId++)
                    .build(),
                new ModuleBuilder()
                    .withName('mod2')
                    .withCategory({id: 2, name: 'cate2'})
                    .withRevisionId(nextRevisionId++)
                    .build()
            ];
            const library = new Library(modules);
            makePanel(library);
            openFirstCategory().then(() => {
                triggerSearch('mod1');
                triggerSearch('');
                expect(panel.$('.default-library .module-tile').html()).toContain('mod1');
                done();
            });
        });

        it("returns to the default library after search is cleared", function () {
            makePanel();
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            triggerSearch('mod1');
            triggerSearch('');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
        });

        it("clears the search library when input is cleared", function () {
            const library = new Library([
                makeModule('a'),
                makeModule('baa'),
                makeModule('c')
            ]);
            makePanel(library);
            triggerSearch('baa');
            expect(panel.$('.search-library .module-tile').length).toEqual(1);
            triggerSearch('');
            expect(panel.$('.search-library .module-tile').length).toEqual(0);
        });

        it("restores the correct shelf ordering on exit search", function () {
            const library = new Library([
                new ModuleBuilder()
                    .withName('mod1')
                    .withCategory({id: 1, name: 'cate1'})
                    .withRevisionId(nextRevisionId++)
                    .build(),
                new ModuleBuilder()
                    .withName('mod2')
                    .withCategory({id: 2, name: 'cate2'})
                    .withRevisionId(nextRevisionId++)
                    .build()
            ]);
            makePanel(library);
            triggerSearch('mod2');
            triggerSearch('');
            const firstCategoryName = panel.$('.default-library h3').first().html();
            expect(firstCategoryName).toContain('cate1');
        });

        it("properly retains events on module tiles after searching", function () {
            const library = new Library([
                makeModule('baa')
            ]);
            makePanel(library);
            let eventFired = false;
            eventDispatcher.subscribe(MODULE_TILE_CLICK, () => eventFired = true);
            triggerSearch('baa');
            const tile = panel.el.querySelector('.module-tile');
            ReactTestUtils.Simulate.click(tile);
            expect(eventFired).toBe(true);
            const draggable = $(tile).draggable('instance');
            expect(draggable).not.toBeUndefined();
        });
    });

    describe("filtering by require bus select", function () {
        it("doesn't file modules under functional group shelves", function () {
            const functionalGroupModules = [
                getFunctionalGroupModule(1),
                getFunctionalGroupModule(1)
            ];
            const library = new Library(functionalGroupModules);
            makePanel(library);
            panel.showMatches(library);
            expect(panel.$('.filtered-library .module-tile').length).toEqual(functionalGroupModules.length);
        });

        it("its members' draggable helper is retained when filtering", function () {
            const library = new Library([
                getFunctionalGroupModule(1)
            ]);
            makePanel(library);
            panel.showMatches(library);
            panel.showMatches(library);
            const helper = panel.$(".filtered-library .module-tile").draggable('option', 'helper');
            expect(helper).not.toEqual('original');
        });

        it("its members' click events are retained when filtering", function () {
            const library = new Library([
                getFunctionalGroupModule(1)
            ]);
            makePanel(library);
            panel.showMatches(library);
            panel.showMatches(library);
            let eventFired = false;
            eventDispatcher.subscribe(MODULE_TILE_CLICK, () => eventFired = true);
            const tile = panel.el.querySelector('.filtered-library .module-tile');
            ReactTestUtils.Simulate.click(tile);
            expect(eventFired).toBe(true);
        });

        it('hides the search input container', function () {
            makePanel();
            panel.showMatches(getLibrary());
            const searchBox = panel.$('.search-container');
            expect(searchBox.is(':visible')).toBe(false);
        });

        it('updates the navigation header', function () {
            makePanel();
            const requireBus = getRequireBus();
            ConnectionController.setRequireToConnect(requireBus);
            panel.showMatches(getLibrary());
            expect(panel.$('.panel-navigation').html()).toContain(`Modules compatible with ${requireBus.name}`);
        });

        it('shows only the filtered library', function () {
            makePanel();
            panel.showMatches(getLibrary());
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
            expect($filteredLibrary.css('display')).not.toEqual('none');
        });

        it('shows the default library after being canceled', function () {
            makePanel();
            panel.showMatches(getLibrary());
            panel.cancelFilter();
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
        });

        it('shows the search library after being canceled, if there was an active search', function () {
            makePanel();
            panel.showMatches(getLibrary());
            triggerSearch('mod1');
            panel.cancelFilter();
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).toEqual('none');
            expect($searchLibrary.css('display')).not.toEqual('none');
            expect($filteredLibrary.css('display')).toEqual('none');
        });

        it('shows the default library after auto connect', function () {
            makePanel();
            panel.showMatches(getLibrary());
            eventDispatcher.publish(MODULE_INIT_BUSES); // Cancel the require selection
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
            expect($filteredLibrary.css('display')).toEqual('none');
        });

        it('shows the search library modules after being canceled, if there was an active search', function () {
            const library = new Library([
                makeModule('aab'),
                makeModule('baa'),
            ]);
            makePanel(library);
            panel.showMatches(library);
            triggerSearch('aab');
            panel.cancelFilter();
            expect(panel.$('.search-library .module-tile').length).toEqual(1);
        });

        it('exits on placed module remove', function () {
            eventDispatcher.unsubscribe(PLACED_MODULE_REMOVE);
            eventDispatcher.unsubscribe(ACTION_EXECUTED);
            makePanel();
            panel.showMatches(getLibrary());
            new RemoveModule(new PlacedModuleBuilder().build()).execute();

            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
            expect($filteredLibrary.css('display')).toEqual('none');
        });

        it('exits on workspace click', function () {
            makePanel();
            const workspaceView = new WorkspaceView({
                model: new Workspace(true, true),
                panel: panel
            } as WorkspaceViewOptions);
            panel.showMatches(getLibrary());
            workspaceView.$('#design').trigger('click');
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
            expect($filteredLibrary.css('display')).toEqual('none');
            workspaceView.remove();
        });

        it('exits on clicking the x in the library header', function () {
            const requireBus = getRequireBus();
            ConnectionController.setRequireToConnect(requireBus);
            makePanel();
            panel.showMatches(getLibrary());
            ReactTestUtils.Simulate.click(panel.el.querySelector('.cancel'));
            const $library = panel.$('.default-library');
            const $searchLibrary = panel.$('.search-library');
            const $filteredLibrary = panel.$('.filtered-library');
            expect($library.css('display')).not.toEqual('none');
            expect($searchLibrary.css('display')).toEqual('none');
            expect($filteredLibrary.css('display')).toEqual('none');
        });

        it('retains the module tile click events', function () {
            const library = new Library([
                makeModule('aab'),
                makeModule('baa'),
            ]);
            makePanel(library);
            panel.showMatches(library);
            panel.showMatches(library);
            let eventFired = false;
            eventDispatcher.subscribe(MODULE_TILE_CLICK, () => eventFired = true);
            ReactTestUtils.Simulate.click(panel.el.querySelector('.filtered-library .module-tile'));
            expect(eventFired).toBe(true);
        });

        it("correctly filters matching modules", function () {
            const moduleA = makeModule('a');
            const library = new Library([
                moduleA,
                makeModule('b'),
                makeModule('c')
            ]);
            const matching = new Library([
                moduleA
            ]);
            makePanel(library);
            panel.showMatches(matching);
            expect(panel.$('.filtered-library .module-tile').length).toEqual(1);
        });

        it("reapplies draggable on module tiles when filtering", function () {
            const moduleA = makeModule('a');
            const library = new Library([
                moduleA,
                makeModule('b'),
            ]);
            makePanel(library);
            const matching = new Library([
                moduleA
            ]);
            panel.showMatches(matching);
            const draggable = panel.$('.filtered-library .module-tile').draggable('instance');
            expect(draggable).not.toBeUndefined();
        });

        it("properly reloads module categories after filtering", function () {
            const moduleA = makeModule('a');
            const library = new Library([
                moduleA,
                makeModule('b'),
            ]);
            makePanel(library);
            const matching = new Library([
                moduleA
            ]);
            panel.showMatches(matching);
            eventDispatcher.publish(PLACED_MODULE_SELECT); // Triggers show categories
            expect(panel.$('.default-library h3').length).toEqual(2);
        });

        it("cancels any existing module substitution", function () {
            const module = getFunctionalGroupModule(1);
            const library = new Library([
                getFunctionalGroupModule(1),
                module
            ]);
            makePanel(library);
            const designRev = overrideDesignRevision();
            const workspaceView = new WorkspaceView({
                panel: panel,
                model: new Workspace(true, true)
            } as WorkspaceViewOptions);
            beginSubstitute(module);
            triggerSelectRequire();
            expect(designRev.moduleToReplace).toBeNull();
            workspaceView.remove();
        });
    });

    describe("Filter module library by substitution", function () {

        let workspaceView = null;

        afterEach(() => {
            if (workspaceView) {
                workspaceView.remove();
                workspaceView = null;
            }
        });

        function createFixtures(panel: Panel): DesignRevision {
            workspaceView = new WorkspaceView({
                panel: panel,
                model: new Workspace(true, true)
            } as WorkspaceViewOptions);
            return overrideDesignRevision();
        }

        it("shows", function () {
            const module = getFunctionalGroupModule(1);
            const library = new Library([
                getFunctionalGroupModule(1),
                module
            ]);
            makePanel(library);
            createFixtures(panel);
            beginSubstitute(module);
            expect(panel.$('.filtered-library').css('display')).not.toEqual('none');
            expect(panel.$('.default-library').css('display')).toEqual('none');
            expect(panel.$('.search-library').css('display')).toEqual('none');
        });

        it("cancels any existing require-to-connect", function () {
            triggerSelectRequire();
            const module = getFunctionalGroupModule(1);
            const library = new Library([
                getFunctionalGroupModule(1),
                module
            ]);
            makePanel(library);
            createFixtures(panel);
            beginSubstitute(module);
            expect(ConnectionController.getRequireToConnect()).toBeNull();
        });

        describe("render", function () {
            it("shows the correct number of module tiles", function () {
                const module = getFunctionalGroupModule(1);
                const library = new Library([
                    getFunctionalGroupModule(1),
                    getFunctionalGroupModule(1),
                    module
                ]);
                makePanel(library);
                createFixtures(panel);
                beginSubstitute(module);
                expect(panel.$('.filtered-library .module-tile').length).toEqual(2);
            });

            it("does not show the module being substituted", function () {
                const module = getFunctionalGroupModule(1);
                const other = getFunctionalGroupModule(1);
                const library = new Library([
                    module,
                    other
                ]);
                makePanel(library);
                createFixtures(panel);
                beginSubstitute(module);
                const libraryView = panel.$('.filtered-library');
                expect(libraryView.find(`[data-module-id='${module.revisionId}']`).length).toEqual(0);
                expect(libraryView.find(`[data-module-id='${other.revisionId}']`).length).toEqual(1);
            });

            it("displays category shelves for modules", function () {
                const module = getFunctionalGroupModule(1);
                const library = new Library([
                    getFunctionalGroupModule(1),
                    getFunctionalGroupModule(1),
                    module
                ]);
                makePanel(library);
                createFixtures(panel);
                beginSubstitute(module);
                expect(panel.$('.filtered-library h3').length).toEqual(1);
            });

            it("changes the navigation header to show the module being substituted", function () {
                const module = getFunctionalGroupModule(1);
                const library = new Library([
                    getFunctionalGroupModule(1),
                    getFunctionalGroupModule(1),
                    module
                ]);
                makePanel(library);
                createFixtures(panel);
                beginSubstitute(module);
                expect(panel.$('.panel-navigation').html()).toContain(`Drag and drop a replacement for ${module.name}`);
            });
        });

        describe("Cancels", function () {
            it("when you click away", function () {
                const module = getFunctionalGroupModule(1);
                const library = new Library([
                    getFunctionalGroupModule(1),
                    module
                ]);
                makePanel(library);
                const designRev = createFixtures(panel);
                beginSubstitute(module);
                workspaceView.$('.interaction-helper').trigger('click');
                expect(panel.$('.filtered-library').css('display')).toEqual('none');
                expect(designRev.moduleToReplace).toBeNull();
            });

            it("when you click the cancel button in the navigation", function () {
                const module = getFunctionalGroupModule(1);
                const library = new Library([
                    getFunctionalGroupModule(1),
                    module
                ]);
                makePanel(library);
                const designRev = createFixtures(panel);
                beginSubstitute(module);
                ReactTestUtils.Simulate.click(panel.el.querySelector('.cancel'));
                expect(panel.$('.filtered-library').css('display')).toEqual('none');
                expect(panel.$('.default-library').css('display')).not.toEqual('none');
                expect(designRev.moduleToReplace).toBeNull();
            });
        });
    });

    describe("ModuleTile", function () {
        it("displays feature lines in the SVG", function () {
            const feature = new FootprintBuilder()
                .rectangle(20, 20)
                .build();
            const module = new ModuleBuilder().withFeatures(feature).build();
            const div = document.createElement("div");
            ReactDOM.render(<ModuleTile module={module}
                                        workspace={new Workspace(true, true)}
                                        onDragStart={() => {
                                        }}
                                        onDragStop={() => {
                                        }}
            />, div);
            const numFeaturesShown = div.querySelectorAll('line').length;
            expect(numFeaturesShown).toBeGreaterThan(0);
        });

        it("publishes MODULE_TILE_CLICK when clicked", function () {
            let eventFired = false;
            const module = makeModule('abc');
            const div = document.createElement("div");
            ReactDOM.render(<ModuleTile module={module}
                                        workspace={new Workspace(true, true)}
                                        onDragStart={() => {
                                        }}
                                        onDragStop={() => {
                                        }}
            />, div);
            eventDispatcher.subscribe(MODULE_TILE_CLICK, () => eventFired = true);
            ReactTestUtils.Simulate.click(div.querySelector('.module-tile'));
            expect(eventFired).toBe(true);
        });

        describe("Context menu", function () {
            it("contains 'Add to board' item", function () {
                const module = makeModule('abc');
                const div = document.createElement("div");
                ReactDOM.render(<ModuleTile module={module}
                                            workspace={new Workspace(true, true)}
                                            onDragStart={() => {
                                            }}
                                            onDragStop={() => {
                                            }}
                />, div);
                ReactTestUtils.Simulate.contextMenu(div.querySelector('.module-tile'));
                expect($('.contextmenu').html()).toContain('Add to board');
            });
            it("contains 'Info' item", function () {
                const module = makeModule('abc');
                const div = document.createElement("div");
                ReactDOM.render(<ModuleTile module={module}
                                            workspace={new Workspace(true, true)}
                                            onDragStart={() => {
                                            }}
                                            onDragStop={() => {
                                            }}
                />, div);
                ReactTestUtils.Simulate.contextMenu(div.querySelector('.module-tile'));
                expect($('.contextmenu').html()).toContain('Info');
            });
        });
    });
});
