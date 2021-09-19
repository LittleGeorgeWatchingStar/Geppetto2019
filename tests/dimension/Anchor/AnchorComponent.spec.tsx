import * as React from "react";
import * as ReactTestUtils from 'react-dom/test-utils';
import {ModuleAnchorBuilder} from "./ModuleAnchorBuilder";
import {AnchorComponent} from "../../../src/dimension/Anchor/AnchorComponent";
import {Workspace} from "../../../src/workspace/Workspace";
import {
    DimensionController,
    DimensionDirection
} from "../../../src/dimension/DimensionController";
import * as ReactDOM from "react-dom";
import {AnchorExtensionsController} from "../../../src/dimension/Anchor/AnchorExtension/AnchorExtensionsController";
import {Anchor} from "../../../src/dimension/Anchor/Anchor";

describe("AnchorComponent", () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
    });

    describe('visible', () => {
        it('is visible when dimensioning', () => {
            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            expect(anchorEl.style.display).not.toEqual('none');
        });
        it('is not visible when not dimensioning', () => {
            const workspace = new Workspace(true, true);
            workspace.toggleConnecting();
            const anchor = new ModuleAnchorBuilder().build();
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            expect(anchorEl.style.display).toEqual('none');
        });
        it('is visible when the dimension controller direction is BOTH', () => {
            spyOnProperty(DimensionController.getInstance(), 'dimensionDirection').and.returnValue(DimensionDirection.NONE);

            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            expect(anchorEl.style.display).not.toEqual('none');
        });
        it('is visible when the dimension controller direction matches its orientation', () => {
            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            spyOnProperty(DimensionController.getInstance(), 'dimensionDirection').and.returnValue(anchor.direction);
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            expect(anchorEl.style.display).not.toEqual('none');
        });
        it('is not visible when the dimension direction doesn\'t match its orientation', () => {
            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            spyOnProperty(DimensionController.getInstance(), 'dimensionDirection').and.returnValue(DimensionDirection.HORIZONTAL);
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            expect(anchorEl.style.display).toEqual('none');
        });
    });

    describe('extension', () => {
        it('calls AnchorExtensions.addExtension on mouse over', () => {
            const addExtensionSpy = spyOn(AnchorExtensionsController.getInstance(), 'addExtension');

            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            ReactTestUtils.Simulate.mouseOver(anchorEl);

            expect(addExtensionSpy).toHaveBeenCalledTimes(1);
            expect(addExtensionSpy).toHaveBeenCalledWith(anchor);
        });
        it('calls AnchorExtensions.removeExtension on mouse leave', () => {
            const addExtensionSpy = spyOn(AnchorExtensionsController.getInstance(), 'addExtension')
                .and.callFake((anchor: Anchor) => {
                    return {
                        uuid: 'uuid',
                        anchor: anchor,
                    };
                });

            const removeExtensionSpy = spyOn(AnchorExtensionsController.getInstance(), 'removeExtension');

            const workspace = new Workspace(true, true);
            workspace.toggleDimensioning();
            const anchor = new ModuleAnchorBuilder().build();
            ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

            const anchorEl = container.querySelector('.anchor');
            ReactTestUtils.Simulate.mouseOver(anchorEl);
            ReactTestUtils.Simulate.mouseOut(anchorEl);

            expect(removeExtensionSpy).toHaveBeenCalledTimes(1);
            expect(removeExtensionSpy).toHaveBeenCalledWith({
                uuid: 'uuid',
                anchor: anchor,
            });
        });
    });

    it('calls DimensioController.onAnchorClick', () => {
        const onClickAnchorSpy = spyOn(DimensionController.getInstance(), 'onClickDimensionAnchor');

        const workspace = new Workspace(true, true);
        workspace.toggleDimensioning();
        const anchor = new ModuleAnchorBuilder().build();
        ReactDOM.render(<AnchorComponent workspace={workspace} anchor={anchor}/>, container);

        const anchorEl = container.querySelector('.anchor');
        // Not a react click.
        // ReactTestUtils.Simulate.click(anchorEl);
        $(anchorEl).trigger('click');

        expect(onClickAnchorSpy).toHaveBeenCalledTimes(1);
        expect(onClickAnchorSpy).toHaveBeenCalledWith(anchor);
    });

});