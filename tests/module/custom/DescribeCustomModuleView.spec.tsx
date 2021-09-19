import {createCustomerModuleCreate} from "../../../src/module/custom/CustomerModuleCreate";
import {BusTemplate} from "../../../src/module/custom/BusTemplate";
import {CustomerBusType} from "../../../src/module/custom/CustomerBus";
import {getDescribeModuleView, getMockedCustomModule} from "./fixtureshelpers";
import * as React from "react";
import * as ReactTestUtils from "react-dom/test-utils";
import {DescribeCustomModule} from "../../../src/module/custom/view/DescribeCustomModuleView";
import ReactDOM = require("react-dom");


describe("DescribeCustomModuleView", function () {

    let view = null;

    beforeEach(() => {
        view = document.createElement('div');
    });

    afterEach(() => {
        if (view) {
            ReactDOM.unmountComponentAtNode(view);
            document.clear();
            view = null;
        }
    });

    describe("Click Create Module", function () {
        /**
         * Prevent real ajax requests from being sent.
         */
        beforeEach(function () {
            jasmine.Ajax.install();
        });
        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it("returns an error if there is no module name", function () {
            ReactDOM.render(getDescribeModuleView(), view);
            ReactTestUtils.Simulate.click(view.querySelector('[data-test="submitButton"]'));
            expect(view.querySelector('.error').textContent).toContain('Your module must have a name.');
        });

        it("returns an error if there have been no buses defined", function () {
            // Not that the user should be accessing this tab if that's the case.
            ReactDOM.render(getDescribeModuleView(), view);
            const nameInput = view.querySelector('[data-test="customModuleName"]');
            nameInput.value = 'A Module So Cold and Sweet';
            ReactTestUtils.Simulate.input(nameInput);
            ReactTestUtils.Simulate.click(view.querySelector('[data-test="submitButton"]'));
            expect(view.querySelector('.error').textContent).toContain('Your module must have at least one bus defined.');
        });

        it("calls onClickBack when back is clicked", function () {
            let called = false;
            const viewComponent = <DescribeCustomModule onSave={() => {}}
                                                        customerModuleCreate={createCustomerModuleCreate(getMockedCustomModule())}
                                                        onClickBack={() => called = true}/>;
            ReactDOM.render(viewComponent, view);
            ReactTestUtils.Simulate.click(view.querySelector('[data-test="backButton"]'));
            expect(called).toBe(true);
        });

        describe("Save to server", function () {

            it("outputs the right JSON", function () {
                const module = getMockedCustomModule();
                const customerModule = createCustomerModuleCreate(module);
                const nets = module.getAssignableNets()[0].getNets();
                const template = new BusTemplate({
                    id: 4,
                    name: 'GPIO',
                    public_name: 'GPIO',
                    signals: [{
                        id: 4,
                        name: "A Signal"
                    }]
                });
                const require = customerModule.createBus(template, CustomerBusType.REQUIRE);
                for (const net of nets) {
                    net.assign(require, require.getSignals()[0]);
                }
                ReactDOM.render(getDescribeModuleView(customerModule), view);
                const nameInput = view.querySelector('[data-test="customModuleName"]');
                const descriptionInput = view.querySelector('[data-test="customModuleDescription"]');
                nameInput.value = 'Module Name';
                descriptionInput.value = 'So cold and so sweet';
                ReactTestUtils.Simulate.input(nameInput);
                ReactTestUtils.Simulate.input(descriptionInput);
                ReactTestUtils.Simulate.click(view.querySelector('[data-test="submitButton"]'));

                const requestData = jasmine.Ajax.requests.mostRecent().data();
                expect(requestData).toEqual({
                    templateRevision: module.getRevisionId(),
                    name: 'Module Name',
                    description: 'So cold and so sweet',
                    requires: [{
                        name: require.name,
                        busGroup: 3763,
                        nets: nets.map(net => net.toServer()),
                        levels: [1, 2, 4],
                        milliwatts: null,
                    }],
                    provides: [],
                    groundNets: [],
                } as any);
            });
        });
    });
});
