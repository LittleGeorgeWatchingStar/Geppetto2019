import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import {busResource, groupResource} from "../bus/TestBus";
import * as ReactDOM from "react-dom";
import {BusList} from "../../src/module/BusList";
import * as React from "react";
import * as ReactTestUtils from "react-dom/test-utils";

describe("BusList", function () {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.clear();
    });

    it("can list the require buses of a module", function () {
        const pm = new PlacedModuleBuilder().build();
        pm.addBusGroup(groupResource());
        pm.addRequire(busResource({name: "Pejoy"}));
        ReactDOM.render(<BusList placedModule={pm}/>, container);
        expect(container.innerHTML).toContain("Require Buses");
        expect(container.innerHTML).toContain("Pejoy");
    });

    it("can list the provide buses of a module", function () {
        const pm = new PlacedModuleBuilder().build();
        pm.addBusGroup(groupResource());
        pm.addProvide(busResource({name: "Pejoy"}));
        ReactDOM.render(<BusList placedModule={pm}/>, container);
        expect(container.innerHTML).toContain("Provide Buses");
        expect(container.innerHTML).toContain("Pejoy");
    });

    it("doesn't show a 'Requires' header if there are no requires", function () {
        const pm = new PlacedModuleBuilder().build();
        pm.addBusGroup(groupResource());
        pm.addProvide(busResource({name: "Pejoy"}));
        ReactDOM.render(<BusList placedModule={pm}/>, container);
        expect(container.innerHTML).not.toContain("Require Buses");
    });

    it("doesn't show a 'Provides' header if there are no provides", function () {
        const pm = new PlacedModuleBuilder().build();
        pm.addBusGroup(groupResource());
        pm.addRequire(busResource({name: "Pejoy"}));
        ReactDOM.render(<BusList placedModule={pm}/>, container);
        expect(container.innerHTML).not.toContain("Provide Buses");
    });

    it("shows a require's consumption", function () {
        const pm = new PlacedModuleBuilder().build();
        pm.addBusGroup(groupResource());
        const req = pm.addRequire(busResource({name: "Pejoy"}));
        ReactDOM.render(<BusList placedModule={pm}/>, container);
        expect(container.innerHTML).toContain(req.powerDraw.toString());
    });

    describe("Search", function () {
        it("can filter modules containing the input query", function () {
            const pm = new PlacedModuleBuilder().build();
            pm.addBusGroup(groupResource());
            pm.addRequire(busResource({name: "Pejoy"}));
            pm.addProvide(busResource({name: "Pepero"}));
            ReactDOM.render(<BusList placedModule={pm}/>, container);
            const input = container.querySelector('input');
            input.value = 'Pepero';
            ReactTestUtils.Simulate.change(input);
            expect(container.innerHTML).toContain("Pepero");
            expect(container.innerHTML).not.toContain("Pejoy");
        });
    });
});
