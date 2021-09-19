import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactTestUtils from "react-dom/test-utils";
import {DimensionComponent} from "../../src/dimension/DimensionComponent";
import {overrideDesignRevision} from "../design/TestDesign";
import {Dimension} from "../../src/dimension/Dimension";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {selectContextItem} from "../view/ContextMenu.spec";
import {DesignRevision} from "../../src/design/DesignRevision";

function makeDimension(designRev: DesignRevision = overrideDesignRevision()): Dimension {
    const dimensionable1 = new PlacedModuleBuilder()
        .withDesignRevision(designRev)
        .withPosition(0, 0)
        .build();
    const dimensionable2 = new PlacedModuleBuilder()
        .withDesignRevision(designRev)
        .withPosition(10, 0)
        .build();

    const feature1 = dimensionable1.getAnchorByEdge('left');
    const feature2 = dimensionable2.getAnchorByEdge('left');

    const attributes = {
        anchor1: feature1,
        anchor2: feature2,
        hidden: false,
        locked: false
    };

    return designRev.addDimensionFromAttributes(attributes);
}

describe("DimensionComponent", () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = `<div class="design"><div class="dimensions"></div><div id="board"></div></div>`;
        container = document.body.querySelector('.dimensions');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
    });

    describe('render', () => {
        it('is visible when workspace is dimensioning', () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                            workspaceScale={1}
                                            boardWidth={1}
                                            boardHeight={1}
                                            level={0}
                                            dimension={dim}/>,
                container);

            const dimEl = container.querySelector('.dimension');
            expect(dimEl.style.display).not.toEqual('none');
        });
        it('is not visible when workspace not is dimensioning', () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={false}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            const dimEl = container.querySelector('.dimension');
            expect(dimEl.style.display).toEqual('none');
        });
    });

    describe("context menu", () => {
        it("Renders on right click", () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            const dimEl = container.querySelector('.dimension');
            ReactTestUtils.Simulate.contextMenu(dimEl);

            const contextMenus = document.body.querySelectorAll('.contextmenu');
            expect(contextMenus.length).toEqual(1);

            const contextMenu = contextMenus[0];
            const menuItems = contextMenu.querySelectorAll('li');
            expect(menuItems.length).toBeGreaterThan(0);
        });
    });

    describe("locking/unlocking", () => {
        it("can toggle dimension lock", () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            expect(dim.isLocked()).toEqual(false);

            const dimEl = container.querySelector('.dimension');
            ReactTestUtils.Simulate.contextMenu(dimEl);
            selectContextItem('Lock');

            expect(dim.isLocked()).toEqual(true);
        });
        it("can re-render if it becomes implicitly locked", () => {
            const designRev = overrideDesignRevision();
            const dimensionable = new PlacedModuleBuilder().build();
            const dim1 = designRev.addDimensionFromAttributes({
                anchor1: dimensionable.getAnchorByEdge('left'),
                anchor2: designRev.board.getAnchorByEdge('left'),
                hidden: false,
                locked: false
            });
            const dim2 = designRev.addDimensionFromAttributes({
                anchor1: dimensionable.getAnchorByEdge('right'),
                anchor2: designRev.board.getAnchorByEdge('left'),
                hidden: false,
                locked: false
            });

            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim1}/>,
                container);

            expect(container.querySelector('.implicitly-locked')).toBeNull();

            dim2.toggleLocked();
            expect(container.querySelector('.implicitly-locked')).not.toBeNull();
        });
    });

    describe("changing dimension", () => {
        it("can change dimension", () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            expect(dim.absLength).not.toEqual(200);

            const measurementInput = container.querySelector('.measurement input');
            measurementInput.value = '20.0';
            // Needs both react's change event and the native browser change event.
            ReactTestUtils.Simulate.change(measurementInput);
            measurementInput.dispatchEvent(new Event('change'));

            expect(dim.absLength).toEqual(200);
        });
        it("can change dimension with 0.1 precision", () => {
            const dim = makeDimension();
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            expect(dim.absLength).toEqual(10);

            const measurementInput = container.querySelector('.measurement input');
            measurementInput.value = '1.1';
            // Needs both react's change event and the native browser change event.
            ReactTestUtils.Simulate.change(measurementInput);
            measurementInput.dispatchEvent(new Event('change'));

            expect(dim.absLength).toEqual(11);
        });
        it("can remove dimension", () => {
            const designRevision = overrideDesignRevision();
            const dim = makeDimension(designRevision);
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dim}/>,
                container);

            expect(designRevision.dimensions.length).toEqual(1);

            const dimEl = container.querySelector('.dimension');
            ReactTestUtils.Simulate.contextMenu(dimEl);
            selectContextItem('Delete');

            expect(designRevision.dimensions.length).toEqual(0);
        });
    });
});