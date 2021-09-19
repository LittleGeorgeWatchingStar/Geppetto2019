import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {Workspace} from "../../../src/workspace/Workspace";
import {DesignSuggestions} from "../../../src/design/helper/DesignSuggestions";
import * as ReactDOM from "react-dom";
import {ModuleBuilder} from "../../module/ModuleBuilder";
import {FitBoard} from "../../../src/view/actions";
import * as ReactTestUtils from "react-dom/test-utils";
import {busResource} from "../../bus/TestBus";
import * as React from "react";
import {createConnectedDesign} from "./DesignHelper.spec";
import {RecommendedBusesList} from "../../../src/design/helper/RecommendedBusesList";
import {BusRecommendation} from "../../../src/design/helper/filterBusRecommendations";
import {RecommendedModulesList} from "../../../src/design/helper/RecommendedModulesList";
import {ModuleResourceBuilder} from "../../module/ModuleResourceBuilder";
import {Module} from "../../../src/module/Module";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";

describe("DesignSuggestions", function () {

    function makeDesignSuggestions(design = new DesignRevisionBuilder().build(),
                                   moduleRecommendations = []): HTMLElement {
        const container = document.createElement('div');
        const element = <DesignSuggestions workspace={new Workspace(true, true)}
                                           moduleRecommendations={moduleRecommendations}
                                           libraryModules={[]}
                                           design={design}/>;
        ReactDOM.render(element, container);
        return container;
    }

    let container = null;

    afterEach(() => {
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
        }
    });

    describe("Board size optimization", function () {
        it("suggests that the board can be resized", function () {
            const m = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.resize(m.getWidth() * 2, m.getWidth() * 2);
            designRev.addModule(m, {x: 0, y: 0});
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).toContain('The board size can be optimized');
        });

        it("does not suggest board resize when the dimensions fit the modules", function () {
            const m = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            designRev.addModule(m, {x: 0, y: 0});
            new FitBoard(designRev).execute();
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain('The board size can be optimized');
        });

        it("fits the board when that option is clicked", function () {
            const m = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.resize(m.getWidth() * 2, m.getWidth() * 2);
            designRev.addModule(m, {x: 0, y: 0});
            container = makeDesignSuggestions(designRev);
            ReactTestUtils.Simulate.click(container.querySelector('.fit-board'));
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain('The board size can be optimized');
        });
    });

    describe("Corner radius suggestion", function () {
        it("appears when the radius seems suspect", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.setCornerRadius(5);
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).toContain('corner radius');
        });

        it("does not appear when the radius is 0", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.setCornerRadius(0);
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain('corner radius');
        });

        it("does not appear when the radius is 1mm or over", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.setCornerRadius(10);
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain('corner radius');
        });

        it("can set the radius to 0 when the option is clicked", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.board.setCornerRadius(5);
            container = makeDesignSuggestions(designRev);
            ReactTestUtils.Simulate.click(container.querySelector('.set-radius'));
            expect(designRev.board.getCornerRadius()).toEqual(0);
        });
    });

    describe("Redundant modules", function () {

        it("are listed", function () {
            const designRev = createConnectedDesign();
            const pm3 = designRev.addModule(
                new ModuleBuilder()
                    .withName('Pepero')
                    .build(),
                {x: 0, y: 0});
            pm3.addProvide(busResource());
            container = makeDesignSuggestions(designRev);
            expect(container.textContent).toContain("These components aren't providing any functionality");
            expect(container.textContent).toContain("Pepero");
        });

        it("can be removed by clicking the option", function () {
            const designRev = createConnectedDesign();
            const pm3 = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm3.addProvide(busResource());
            container = makeDesignSuggestions(designRev);
            ReactTestUtils.Simulate.click(container.querySelector('.clean-up'));
            expect(designRev.getPlacedModules().some(p => p.uuid === pm3.uuid)).toBe(false);
        });

        it("do not list modules with no requires or provides", function () {
            const designRev = createConnectedDesign();
            designRev.addModule(
                new ModuleBuilder()
                    .withName('Pepero')
                    .build(),
                {x: 0, y: 0});
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain("Pepero");
        });

        it("do not list modules that have been connected", function () {
            const designRev = createConnectedDesign();
            container = makeDesignSuggestions(designRev);
            expect(container.innerHTML).not.toContain("These components aren't providing any functionality");
        });

        it("selects the module when you click the name", function () {
            const designRev = createConnectedDesign();
            const pm = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.addProvide(busResource());
            container = makeDesignSuggestions(designRev);
            const name = container.querySelector('.unconnected-components li');
            ReactTestUtils.Simulate.click(name);
            expect(pm.isSelected).toBe(true);
        });
    });

    describe("DesignRecommendations", function () {

        it("displays recommendations for buses that aren't already connected", () => {
            const designRev = createConnectedDesign();
            const module = new ModuleBuilder()
                .withBusRecommendations([{
                    provide_bus_ids: [1],
                    suggested_module_ids: [],
                    warning: 'Ban inheritance! Ban JavaScript classes!'
                }]).build();
            designRev.addModule(module, {x: 0, y: 0}).addProvide(busResource({id: 1}));
            container = makeDesignSuggestions(designRev);
            expect(container.textContent).toContain('Ban inheritance! Ban JavaScript classes!');
        });

        it("does not display recommendations for buses that are already connected", () => {
            const designRev = createConnectedDesign();
            const module = new ModuleBuilder()
                .withBusRecommendations([{
                    provide_bus_ids: [1],
                    suggested_module_ids: [],
                    warning: 'Ban inheritance! Ban JavaScript classes!'
                }]).build();
            const pm = designRev.addModule(module, {x: 0, y: 0});
            const prov = pm.addProvide(busResource({id: 1}));
            const req = pm.addRequire(busResource());
            req.connect(prov);
            container = makeDesignSuggestions(designRev);
            expect(container.textContent).not.toContain('Ban inheritance! Ban JavaScript classes!');
        });

        it("displays recommendations to add a module not already on the board", () => {
            const designRev = createConnectedDesign();
            const recommendation = {
                modules: [new ModuleResourceBuilder().withModuleId(15).build()],
                warning: 'Ban inheritance! Ban JavaScript classes!'
            };
            container = makeDesignSuggestions(designRev, [recommendation]);
            expect(container.textContent).toContain('Ban inheritance! Ban JavaScript classes!');
        });

        it("does not display recommendations to add a module that is already on the board", () => {
            const resource = new ModuleResourceBuilder().withModuleId(15).build();
            const designRev = createConnectedDesign();
            designRev.addModule(new Module(resource), {x: 0, y: 0});
            const recommendation = {
                modules: [resource],
                warning: 'Ban inheritance! Ban JavaScript classes!'
            };
            container = makeDesignSuggestions(designRev, [recommendation]);
            expect(container.textContent).not.toContain('Ban inheritance! Ban JavaScript classes!');
        });

        it("does not display a recommendation to add modules if one member of the group is already on the board", () => {
            const resource = new ModuleResourceBuilder().withModuleId(15).build();
            const resource2 = new ModuleResourceBuilder().withModuleId(20).build();
            const designRev = createConnectedDesign();
            designRev.addModule(new Module(resource), {x: 0, y: 0});
            const recommendation = {
                modules: [resource, resource2],
                warning: 'Ban inheritance! Ban JavaScript classes!'
            };
            container = makeDesignSuggestions(designRev, [recommendation]);
            expect(container.textContent).not.toContain('Ban inheritance! Ban JavaScript classes!');
        });
    });
});

describe("RecommendedBusesList", () => {

    let container = null;

    beforeEach(() => {
        container = document.createElement('div');
    });

    function renderView(recommendations: BusRecommendation[],
                        libraryModules: Module[],
                        clickOption?): void {
        clickOption = clickOption ? clickOption : () => {};
        ReactDOM.render(<RecommendedBusesList workspace={new Workspace(true, true)}
                                              onClickOption={clickOption}
                                              libraryModules={libraryModules}
                                              busRecommendations={recommendations}/>, container);
    }

    afterEach(() => {
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
            container = null;
        }
    });

    it("renders the recommendation message", () => {
        const recommendations = [{
            provideBuses: [],
            warning: 'Here is a bus that is recommended.',
            suggestedModuleIds: [],
            placedModule: new PlacedModuleBuilder().build()
        }];
        renderView(recommendations, []);
        expect(container.textContent).toContain('Here is a bus that is recommended.');
    });

    it("renders the recommendation provides", () => {
        // TODO it probably shouldn't... this is a workaround for multiple provides,
        // which are currently not handled well.
        const fakeProvide = {getUsed: () => 5, id: 2, name: 'FAKE_PROVIDE'} as any;
        const recommendations = [{
            provideBuses: [fakeProvide],
            warning: '',
            suggestedModuleIds: [],
            placedModule: new PlacedModuleBuilder().build()
        }];
        renderView(recommendations, []);
        const viewOption = container.querySelector("[data-test='viewOptions']");
        expect(viewOption.textContent).toContain('FAKE_PROVIDE');
    });

    describe("Click to view options", () => {

        function clickViewOptions(): void {
            const option = container.querySelector("[data-test='viewOptions']");
            ReactTestUtils.Simulate.click(option);
        }

        it("triggers callback with the correct arguments", () => {
            const fakeProvide = {getUsed: () => 5, id: 2, name: 'PROVIDE'} as any;
            const recommendations = [{
                provideBuses: [fakeProvide],
                warning: 'Here is a bus that is recommended.',
                suggestedModuleIds: [1],
                placedModule: new PlacedModuleBuilder().build()
            }];
            const libraryModules = [new ModuleBuilder().withModuleId(1).build()];
            const clickOption = params => {
                expect(params).toEqual(jasmine.objectContaining({
                    recommended: libraryModules,
                    message: 'Here is a bus that is recommended.',
                    busToQuery: fakeProvide,
                    workspace: jasmine.any(Object)
                }));
            };
            renderView(recommendations, libraryModules, clickOption);
            clickViewOptions();
        });

        it("gracefully excludes suggested modules that were not found", () => {
            const fakeProvide = {getUsed: () => 5, id: 2, name: 'PROVIDE'} as any;
            const recommendations = [{
                provideBuses: [fakeProvide],
                warning: 'Here is a bus that is recommended.',
                suggestedModuleIds: [1, 2],
                placedModule: new PlacedModuleBuilder().build()
            }];
            const libraryModules = [new ModuleBuilder().withModuleId(1).build()];
            const clickOption = params => {
                expect(params).toEqual(jasmine.objectContaining({
                    recommended: libraryModules,
                    message: 'Here is a bus that is recommended.',
                    busToQuery: fakeProvide,
                    workspace: jasmine.any(Object)
                }));
            };
            renderView(recommendations, libraryModules, clickOption);
            clickViewOptions();
        });
    });
});

describe("RecommendedModulesList", () => {

    let container = null;

    beforeEach(() => {
        container = document.createElement('div');
    });

    function renderView(onClickOption?): void {
        const recommendations = [
            {
                modules: [new ModuleResourceBuilder().build()],
                warning: 'Consider adding mounting holes to your design.'
            },
        ];
        onClickOption = onClickOption ? onClickOption : params => {};
        ReactDOM.render(<RecommendedModulesList onClickOption={onClickOption}
                                                filteredRecommendations={recommendations}
                                                workspace={new Workspace(true, true)}/>, container);
    }

    it("renders the recommendation message", () => {
        renderView();
        expect(container.textContent).toContain('Consider adding mounting holes to your design.');
    });

    describe("Click to view options", () => {
        it("triggers callback with the correct arguments", () => {
            const clickOption = params => {
                expect(params).toEqual(jasmine.objectContaining({
                    recommended: jasmine.any(Array),
                    message: 'Consider adding mounting holes to your design.',
                    workspace: jasmine.any(Object)
                }));
            };
            renderView(clickOption);
            const option = container.querySelector("[data-test='viewOptions']");
            ReactTestUtils.Simulate.click(option);
        });
    });
});
