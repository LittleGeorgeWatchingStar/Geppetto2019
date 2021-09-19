import * as ReactTestUtils from "react-dom/test-utils";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {ModuleBusPinMappingViewer} from "../../src/modulebuspinmappingviewer/ModuleBusPinMappingViewer";
import {Module} from "../../src/module/Module";
import testModuleResource from "./testModuleResource";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder"


function createModule(): Module {
    return new Module(testModuleResource)
}

describe('ModuleBusPinMappingViewer', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.body.innerHTML = '';
    });

    it('renders voltage domains', () => {
        const module = createModule();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);
        const domains = Array.from(container.querySelectorAll("[data-test='voltageDomain']"));
        expect(domains.length).toEqual(3);
    });

    it('renders nets', () => {
        const module = createModule();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

        expect(container.querySelectorAll('.net').length).toEqual(20);
        expect(container.textContent).toContain('P1');
        expect(container.textContent).toContain('P2');
        expect(container.textContent).toContain('P3');
        expect(container.textContent).toContain('P4');
        expect(container.textContent).toContain('P5');
        expect(container.textContent).toContain('P6');
        expect(container.textContent).toContain('P7');
        expect(container.textContent).toContain('P8');
        expect(container.textContent).toContain('P9');
        expect(container.textContent).toContain('P10');
        expect(container.textContent).toContain('P11');
        expect(container.textContent).toContain('P12');
        expect(container.textContent).toContain('P13');
        expect(container.textContent).toContain('P14');
        expect(container.textContent).toContain('P15');
        expect(container.textContent).toContain('P16');
        expect(container.textContent).toContain('P18');
        expect(container.textContent).toContain('P19');
    });

    it('renders buses', () => {
        // Buses with that implement VLOGIC template are not shown.
        const module = createModule();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

        const requiresEl = container.querySelector('.board-signals-container');
        const providesEl = container.querySelector('.external-signals-container');

        expect(requiresEl.querySelectorAll('.bus-list-item').length).toEqual(16);
        expect(requiresEl.textContent).toContain('3.3V');
        expect(requiresEl.textContent).toContain('5.0V');
        expect(requiresEl.textContent).toContain('SOME_BUS');
        expect(requiresEl.textContent).toContain('BUS_0');
        expect(requiresEl.textContent).toContain('BUS_1');
        expect(requiresEl.textContent).toContain('VCC_5.0_2');
        expect(requiresEl.textContent).toContain('VCC_5.0_3');
        expect(requiresEl.textContent).toContain('VCC_5.0_4');
        expect(requiresEl.textContent).toContain('VCC_5.0_5');
        expect(requiresEl.textContent).toContain('VCC_5.0_7');
        expect(requiresEl.textContent).toContain('VCC_5.0_8');
        expect(requiresEl.textContent).toContain('VCC_5.0_9');
        expect(requiresEl.textContent).toContain('VCC_5.0_10');
        expect(requiresEl.textContent).toContain('VCC_5.0_11');
        expect(requiresEl.textContent).toContain('VCC_5.0_12');
        expect(requiresEl.textContent).not.toContain('VLOGIC');

        expect(providesEl.querySelectorAll('.bus-list-item').length).toEqual(2);
        expect(providesEl.textContent).toContain('3.3V');
        expect(providesEl.textContent).toContain('VCC_5.0_6');
        expect(requiresEl.textContent).not.toContain('VLOGIC');
    });

    it('renders pin points', () => {
        const module = createModule();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

        const pinPointsEl = container.querySelector('.pin-points');
        expect(pinPointsEl.childNodes.length).toEqual(20);
        for (let i = 0; i < 20; i++) {
            expect(pinPointsEl.textContent).toContain(i.toString());
        }
    });

    describe("on mouseover net", () => {
        it('draws a line', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

            const netEl = container.querySelector('[data-test="net1"]');
            ReactTestUtils.Simulate.mouseOver(netEl);

            const lineCanvasEl = container.querySelector('.custom-module__line-canvas');
            expect(lineCanvasEl.childNodes.length).toEqual(1);
        });

        it('indicates pin text', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

            const netEl = container.querySelector('[data-test="net1"]');
            ReactTestUtils.Simulate.mouseOver(netEl);

            const pinLabelsEl = container.querySelectorAll('.pin-label.blink');
            expect(pinLabelsEl.length).toEqual(1);
            expect(pinLabelsEl[0].textContent).toEqual('1');
        });
    });

    describe("on mouseover pin", () => {
        it('draws a line', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

            const pinEl = container.querySelector('[data-test="pinPoint1"]');
            ReactTestUtils.Simulate.mouseOver(pinEl);

            const lineCanvasEl = container.querySelector('.custom-module__line-canvas');
            expect(lineCanvasEl.childNodes.length).toEqual(1);
        });

        it('highlights net', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);

            const pinEl = container.querySelector('[data-test="pinPoint1"]');
            ReactTestUtils.Simulate.mouseOver(pinEl);

            const netsEl = container.querySelectorAll('.net.highlight');
            expect(netsEl.length).toEqual(1);
            expect(netsEl[0].textContent).toContain('P1');
        });
    });

    describe("on click bus", () => {
        it('highlights pin text', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);
            const busEl = container.querySelector('[data-test="BUS_1"]');
            ReactTestUtils.Simulate.click(busEl);

            const pinsEl = container.querySelectorAll('.module-svg-pin.highlight');
            expect(pinsEl.length).toEqual(3);
            expect(pinsEl[0].textContent).toEqual('3');
            expect(pinsEl[1].textContent).toEqual('4');
            expect(pinsEl[2].textContent).toEqual('5');
        });

        it('highlights net', () => {
            const module = createModule();
            const placedModule = new PlacedModuleBuilder().withModule(module).build();
            ReactDOM.render(<ModuleBusPinMappingViewer module={module} rotation={placedModule.getRotation()}/>, container);
            const busEl = container.querySelector('[data-test="BUS_1"]');
            ReactTestUtils.Simulate.click(busEl);

            const netsEl = container.querySelectorAll('.net.highlight');
            expect(netsEl.length).toEqual(3);
            expect(netsEl[0].textContent).toContain('P3');
            expect(netsEl[1].textContent).toContain('P4');
            expect(netsEl[2].textContent).toContain('P5');
        });
    });
});
