import * as ReactDOM from "react-dom";
import * as React from "react";
import * as ReactTestUtils from 'react-dom/test-utils';
import {createConnection} from "../../../src/connection/Connection";
import {DesignRevision} from "../../../src/design/DesignRevision";
import {ConnectionPath} from "../../../src/connection/ConnectionPath";
import {DesignHelper, HelperTabs} from "../../../src/design/helper/DesignHelper";
import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {ModuleBuilder} from "../../module/ModuleBuilder";
import {ProvideBus} from "../../../src/bus/ProvideBus";
import {RequireBus} from "../../../src/bus/RequireBus";
import {Point} from "../../../src/utils/geometry";
import {Path} from "../../../src/path/Path";
import {BusGroup} from "../../../src/bus/BusGroup";
import {testSvgData} from "../../placedlogo/PlacedLogoBuilder";
import {busResource, groupResource} from "../../bus/TestBus";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";
import User from "../../../src/auth/User";
import {Workspace} from "../../../src/workspace/Workspace";
import {ModuleList} from "../../../src/design/helper/ModuleList";
import {PowerTree} from "../../../src/design/helper/PowerTree";
import {PriceView} from "../../../src/view/Price";
import {WorkspaceMode} from "../../../src/design/helper/WorkspaceMode";


/**
 * @return a design revision containing a pair of connected, non-overlapping modules.
 * We need a placed module with a require to bypass the 'no functionality' message in the design helper.
 */
export function createConnectedDesign(): DesignRevision {
    const designRev = new DesignRevisionBuilder().build();
    const m = new ModuleBuilder().build();
    const pm = designRev.addModule(m, {x: 0, y: 0});
    pm.addBusGroup(groupResource());
    const req = pm.addRequire(busResource());
    const pm2 = designRev.addModule(m, {x: m.getWidth(), y: m.getHeight()});
    pm2.addBusGroup(groupResource());
    const prov = pm2.addProvide(busResource());
    designRev.connectPair(req, prov);
    designRev.updateElectrical();
    return designRev;
}

describe("DesignHelper", function () {

    function makeHelper(design = createConnectedDesign()): HTMLElement {
        const container = document.createElement('div');
        const element = <DesignHelper moduleRecommendations={[]}
                                      design={design}
                                      libraryModules={[]}
                                      currentUser={new User()}
                                      workspace={new Workspace(true, true)}
                                      board={design.board}/>;
        ReactDOM.render(element, container);
        return container;
    }

    function makeModuleList(design = createConnectedDesign()): HTMLElement {
        const container = document.createElement('div');
        const element = <ModuleList moduleRecommendations={[]}
                                    design={design}
                                    libraryModules={[]}
                                    currentUser={new User()}
                                    workspace={new Workspace(true, true)}/>;
        ReactDOM.render(element, container);
        return container;
    }

    function makePriceChart(design = createConnectedDesign()): HTMLElement {
        const container = document.createElement('div');
        const element = <PriceView design={design}
                                   workspace={new Workspace(true, true)}/>;
        ReactDOM.render(element, container);
        return container;
    }

    function makePowerTree(design = createConnectedDesign()): HTMLElement {
        const container = document.createElement('div');
        const element = <PowerTree rootPowerProviders={design.rootPowerProviders}
                                   workspace={new Workspace(true, true)}/>;
        ReactDOM.render(element, container);
        return container;
    }

    function makeWorkspaceMode(): HTMLElement {
        const container = document.createElement('div');
        const element = <WorkspaceMode workspace={new Workspace(true, true)}/>;
        ReactDOM.render(element, container);
        return container;
    }

    function getErrorList(container: HTMLElement): string {
        return container.querySelector('.design-helper__error-list-container').innerHTML;
    }

    function getBoardStatus(container: HTMLElement): string {
        return container.querySelector('.design-helper-board-status').innerHTML;
    }

    function getModuleList(container: HTMLElement): string {
        return container.querySelector('.design-helper__module-list-container').innerHTML;
    }

    function getModuleListInModuleList(container: HTMLElement): string {
        return container.querySelector('.module-list__module-list-container').innerHTML;
    }

    function makePath(): ConnectionPath {
        const start = new Point(1, 1);
        const end = new Point(3, 1);
        const res = busResource({
            busgroup: new BusGroup({
                levels: ['3.3']
            }),
            placed_module: new PlacedModuleBuilder().build()
        });
        const connection = createConnection({
            require: new RequireBus(res),
            provide: new ProvideBus(res)
        });
        const path = new Path({
            spec: {width: 2, minLength: 0, maxLength: 4},
            start: start,
            end: end,
            nodes: [],
            keepouts: [],
            isComplete: true,
            collisions: [],
            collisionWithUuids: [],
            length: 1,
            isTooLong: false,
            blockingPathNodes: []
        });
        return new ConnectionPath(connection, path);
    }

    let container = null;

    afterEach(() => {
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
            container = null;
        }
    });

    describe("Error list view", function () {

        it("lists unconnected placed modules", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const m2 = new ModuleBuilder().withName('Pocky').build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = designRev.addModule(m1, {x: 0, y: 0});
            const pm2 = designRev.addModule(m2, {x: 0, y: 0});
            pm.addRequire(busResource());
            pm2.addRequire(busResource());
            container = makeHelper(designRev);
            const errorList = getErrorList(container);
            expect(errorList).toContain('Pejoy');
            expect(errorList).toContain('Pocky');
        });

        it("can be closed", function () {
            container = makeHelper();
            const closeButton = container.querySelectorAll('.design-helper-close-button');
            ReactTestUtils.Simulate.click(closeButton);
            expect(container.innerHTML).not.toContain('Pejoy');
        });

        it("board status will show if the board is not empty", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const m2 = new ModuleBuilder().withName('Pocky').build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = designRev.addModule(m1, {x: 0, y: 0});
            const pm2 = designRev.addModule(m2, {x: 0, y: 0});
            pm.addRequire(busResource());
            pm2.addRequire(busResource());
            container = makeHelper(designRev);
            expect(getBoardStatus(container)).toContain('Status');
        });

        it("shows if the placed module is overlapping", function () {
            const m1 = new ModuleBuilder().withName('Pepero').build();
            const designRev = createConnectedDesign();
            const pm = designRev.addModule(m1, {x: 0, y: 0});
            pm.setConnected(true);
            pm.setOverlaps(true);
            container = makeHelper(designRev);
            expect(getErrorList(container)).toContain('Pepero');
            expect(getBoardStatus(container)).toContain('overlapping');
        });

        it("shows a particular message if the placed module is off the board", function () {
            const m = new ModuleBuilder().withName('Pejoy').build();
            const designRev = createConnectedDesign();
            const boardPos = designRev.board.position;
            const pm = designRev.addModule(m, {x: boardPos.x - 5, y: boardPos.y - 5});
            pm.setConnected(true);
            container = makeHelper(designRev);
            expect(getErrorList(container)).toContain('is off the board');
            expect(getBoardStatus(container)).toContain('boundary');
        });

        it("does not show if the placed module is valid", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const designRev = createConnectedDesign();
            const pm = designRev.addModule(m1, {x: 0, y: 0});
            pm.setConnected(true);
            pm.setOverlaps(false);
            container = makeHelper(designRev);
            expect(getErrorList(container)).not.toContain('Pejoy');
            expect(getBoardStatus(container)).toContain('order');
        });

        it("shows path collisions", function () {
            const designRev = createConnectedDesign();
            const path = makePath();
            path.collisions.push({x: 0, y: 0});
            spyOnProperty(designRev, 'paths').and.returnValue([path]);
            container = makeHelper(designRev);
            expect(getErrorList(container)).toContain('is obstructed');
        });

        it("shows logo errors", function () {
            const designRev = createConnectedDesign();
            // Must have at least 1 pm to render something other than the default message
            const pm = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
            pm.setConnected(true);
            const logo = designRev.addLogo(testSvgData, {x: 0, y: 0});
            logo.setOverlaps(true);
            container = makeHelper(designRev);
            expect(getErrorList(container)).toContain('SVG image');
        });

        describe("Error list button", function () {

            it("shows a 'complete' icon when modules are valid", function () {
                const m1 = new ModuleBuilder().withName('Pejoy').build();
                const designRev = new DesignRevisionBuilder().build();
                const pm = designRev.addModule(m1, {x: 0, y: 0});
                pm.setConnected(true);
                pm.setOverlaps(false);
                container = makeHelper(designRev);
                const tabButton = container.querySelector('.header span');
                expect(tabButton.innerHTML).toContain('complete');
            });

            it("shows an 'error-count' icon when modules are invalid", function () {
                const m1 = new ModuleBuilder().withName('Pejoy').build();
                const designRev = new DesignRevisionBuilder().build();
                const pm = designRev.addModule(m1, {x: 0, y: 0});
                pm.setConnected(false);
                container = makeHelper(designRev);
                const tabButton = container.querySelector('.header span');
                expect(tabButton.innerHTML).toContain('error-count');
            });

            it("shows the correct number of errors", function () {
                const designRev = new DesignRevisionBuilder().build();
                const m = new ModuleBuilder().build();
                designRev.addModule(m, {x: 0, y: 0});
                const path = makePath();
                path.collisions.push({x: 0, y: 0});
                spyOnProperty(designRev, 'paths').and.returnValue([path]);
                const logo = designRev.addLogo(testSvgData, {x: 0, y: 0});
                logo.setOverlaps(true);
                container = makeHelper(designRev);
                const tabButton = container.querySelector('.header span');
                expect(tabButton.innerHTML).toContain('3');
            });
        });

        describe("Design suggestions", function () {
            it("shows if there are no errors", function () {
                const designRev = createConnectedDesign();
                container = makeHelper(designRev);
                expect(container.innerHTML).toContain('Optional Suggestions');
            });

            it("does not show if there are no components with requires", function () {
                const m1 = new ModuleBuilder().withName('Pejoy').build();
                const designRev = new DesignRevisionBuilder().build();
                const pm = designRev.addModule(m1, {x: 0, y: 0});
                pm.setConnected(true);
                pm.addProvide(busResource());
                container = makeHelper(designRev);
                expect(container.innerHTML).not.toContain('Optional Suggestions');
            });
        });
    });

    describe("Modules used list", function () {

        it("can list placed modules", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const m2 = new ModuleBuilder().withName('Pocky').build();
            const designRev = createConnectedDesign();
            designRev.addModule(m1, {x: 0, y: 0});
            designRev.addModule(m2, {x: 0, y: 0});
            container = makeModuleList(designRev);
            const openButton = container.querySelector('.module-list-open-button');
            ReactTestUtils.Simulate.click(openButton);
            const moduleList = getModuleListInModuleList(container);
            expect(moduleList).toContain('Pejoy');
            expect(moduleList).toContain('Pocky');
        });

        it("can select the module when you click its associated item", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const designRev = createConnectedDesign();
            const pm = designRev.addModule(m1, {x: 0, y: 0});
            container = makeModuleList(designRev);
            const openButton = container.querySelector('.module-list-open-button');
            ReactTestUtils.Simulate.click(openButton);
            const items = container.querySelectorAll('.module-list__module-list-container li');
            for (const item of items) {
                if (item.innerHTML.includes('Pejoy')) {
                    ReactTestUtils.Simulate.click(item);
                }
            }
            expect(pm.isSelected).toBe(true);
        });

        describe("Module list button", function () {

            it("can show the number of modules", function () {
                const m1 = new ModuleBuilder().withName('Pejoy').build();
                const m2 = new ModuleBuilder().withName('Pocky').build();
                const designRev = new DesignRevisionBuilder().build();
                designRev.addModule(m1, {x: 0, y: 0});
                designRev.addModule(m2, {x: 0, y: 0});
                container = makeModuleList(designRev);
                const openButton = container.querySelector('.module-list-open-button');
                ReactTestUtils.Simulate.click(openButton);
                const tabButton = container.querySelector('.header');
                expect(tabButton.innerHTML).toContain('2');
            });
        });
    });

    describe("Price view chart", function () {
        it("can show by clicking left side button", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const m2 = new ModuleBuilder().withName('Pocky').build();
            const designRev = new DesignRevisionBuilder().build();
            designRev.addModule(m1, {x: 0, y: 0});
            designRev.addModule(m2, {x: 0, y: 0});
            container = makePriceChart(designRev);
            const openButton = container.querySelector('.price-chart-open-button');
            ReactTestUtils.Simulate.click(openButton);
            expect(container.innerHTML).not.toBeNull();
        });
    });

    describe("Power tree chart", function () {
        it("can show by clicking left side button", function () {
            const m1 = new ModuleBuilder().withName('Pejoy').build();
            const designRev = new DesignRevisionBuilder().build();
            designRev.addModule(m1, {x: 0, y: 0});
            container = makePowerTree(designRev);
            const openButton = container.querySelector('.power-tree-open-button');
            ReactTestUtils.Simulate.click(openButton);
            expect(container.innerHTML).not.toBeNull();
        });
    });

    describe("Workspace Mode Widget", function () {
        describe("Connect Mode", function () {
            it("is active when first load", function () {
                container = makeWorkspaceMode();
                expect(container.querySelector('#connect-mode').className.indexOf('mode-toggle-on')).not.toEqual(-1);
            });

            it("is inactive when dimension mode has actived", function () {
                container = makeWorkspaceMode();
                const button = container.querySelector('#dimension-mode');
                ReactTestUtils.Simulate.click(button);
                expect(container.querySelector('#connect-mode').className.indexOf('mode-toggle-on')).toEqual(-1);
            });
        });

        describe("Dimension Mode", function () {
            it("is inactive when first load", function () {
                container = makeWorkspaceMode();
                expect(container.querySelector('#dimension-mode').className.indexOf('mode-toggle-on')).toEqual(-1);
            });

            it("is active when click", function () {
                container = makeWorkspaceMode();
                const button = container.querySelector('#dimension-mode');
                ReactTestUtils.Simulate.click(button);
                expect(container.querySelector('#dimension-mode').className.indexOf('mode-toggle-on')).not.toEqual(-1);
            });
        });

        describe("Select Mode", function () {
            it("is inactive when first load", function () {
                container = makeWorkspaceMode();
                expect(container.querySelector('#select-mode').className.indexOf('mode-toggle-on')).toEqual(-1);
            });

            it("is active when click", function () {
                container = makeWorkspaceMode();
                const button = container.querySelector('#select-mode');
                ReactTestUtils.Simulate.click(button);
                expect(container.querySelector('#select-mode').className.indexOf('mode-toggle-on')).not.toEqual(-1);
            });
        });
    });
});
