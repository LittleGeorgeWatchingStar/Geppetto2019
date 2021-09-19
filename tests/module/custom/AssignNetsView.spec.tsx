import {AssignableNetGroup} from 'module/custom/AssignableNetGroup';
import {CustomModuleDialog,} from "../../../src/module/custom/view/CustomModuleDialog";
import {AssignNetsView} from "../../../src/module/custom/view/AssignNetsView";
import {createCustomerModuleCreate} from "../../../src/module/custom/CustomerModuleCreate";
import {AssignableNetGroupResource} from "../../../src/module/custom/api";
import {MultiTabDialogOptions} from "../../../src/view/MultiTabDialog";
import * as ReactTestUtils from "react-dom/test-utils";
import {ModuleBuilder} from "../ModuleBuilder";
import {CustomerBusType} from "../../../src/module/custom/CustomerBus";
import {
    getAssignNetsView,
    getDescribeModuleView,
    getMockBusTemplateGateway,
    getMockedCustomModule
} from "./fixtureshelpers";
import ReactDOM = require('react-dom');
import * as React from "react";


/**
 * Helper to perform the interactions that add an empty BusTemplate in the AssignNetsView dialog.
 */
function createTemplate(view, type = CustomerBusType.REQUIRE): void {
    if (type === CustomerBusType.REQUIRE) {
        ReactTestUtils.Simulate.click(view.querySelector("[data-test='createRequireButton']"));
    } else {
        ReactTestUtils.Simulate.click(view.querySelector("[data-test='createProvideButton']"));
    }
    ReactTestUtils.Simulate.click(view.querySelector("[data-test='selectBus']"));
}

/**
 * Helper to get the assignable nets DOM elements.
 */
function getPins(view): HTMLElement[] {
    return Array.from(view.querySelectorAll('[data-test="pin"]'));
}

/**
 * Helper to get bus signal DOM elements.
 */
function getBusSignals(view): HTMLButtonElement[] {
    return Array.from(view.querySelectorAll('.bus-signal')) as HTMLButtonElement[];
}

/**
 * Helper to determine if a signal element in AssignableSignalsPanel is disabled.
 * (The disabled attribute is not used because the element is <span>.
 * Though <button> accepts `disable`, it isn't a valid HTML5 draggable target in Firefox.)
 */
function isSignalDisabled(signal: HTMLElement): boolean {
    return signal.classList.contains('disabled-js');
}


describe("AssignNetsView", function () {

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

    describe("On create bus template", function () {

        it("selects that bus template", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            expect(view.querySelector(".bus-list-item.selected-js")).not.toBeNull();
        });

        it("renders signals in the signals bar", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            expect(Array.from(view.querySelectorAll(".assignable-signals li")).length).toBe(2);
        });

        it("if the number of buses is the maximum, disables the bus creation button", function () {
            const create = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(create), view);
            for (let i = 0; i < create.maxBuses; ++i) {
                createTemplate(view);
            }
            expect(view.querySelector("[data-test='createRequireButton']").disabled).toBe(true);
            expect(view.querySelector("[data-test='createProvideButton']").disabled).toBe(true);
        });
    });

    describe("Adding signal", function () {

        it("on click assigns the signal to a pin", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            expect(view.querySelector('[data-test="pin"]').textContent).not.toContain('Unassigned');
        });

        it("populates the next empty pin", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            const busSignals = getBusSignals(view);
            ReactTestUtils.Simulate.click(busSignals[0]);
            ReactTestUtils.Simulate.click(busSignals[1]);
            expect(getPins(view)[1].textContent).toContain('Tooty');
        });

        it("disables a signal if it has already been added", function () {
            // If it is amongst other signals that need to be added.
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            expect(view.querySelector('.bus-signal').classList).toContain('disabled-js');
        });

        it("deselects any currently selected pin", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view);
            const pins = getPins(view);
            ReactTestUtils.Simulate.click(pins[0]);
            ReactTestUtils.Simulate.click(view.querySelector('.bus-signal'));
            expect(pins[0].classList).not.toContain('selected-js');
        });

        it("assigns the signal to a currently selected pin if the pin is unassigned", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view);
            const pins = getPins(view);
            ReactTestUtils.Simulate.click(pins[pins.length - 1]);
            ReactTestUtils.Simulate.click(view.querySelector('.bus-signal'));
            expect(pins[pins.length - 1].textContent).not.toContain('unassigned');
        });

        it("does not assign the signal to a selected pin if the pin has been assigned", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view);
            const pins = getPins(view);
            const busSignals = getBusSignals(view);
            ReactTestUtils.Simulate.click(busSignals[0]); // Assign pin[0]
            ReactTestUtils.Simulate.click(pins[0]); // Select pin[0] again.
            ReactTestUtils.Simulate.click(busSignals[1]);
            // The auto assignment moves on to the next available pin.
            expect(pins[0].textContent).not.toContain(busSignals[1].textContent);
        });

        it("disables the recently-assigned signal in AssignableSignalsPanel", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view);
            const busSignals = getBusSignals(view);
            ReactTestUtils.Simulate.click(busSignals[0]);
            expect(isSignalDisabled(busSignals[0])).toBe(true);
        });
    });

    describe("Swap signal", function () {
        it("renders the net views correctly", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            const pins = getPins(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            ReactTestUtils.Simulate.click(pins[0]);
            ReactTestUtils.Simulate.click(pins[1]);
            expect(pins[1].textContent).toContain('Swooty');
            expect(pins[0].textContent).toContain('Unassigned');
        });
    });

    describe("Unassign signal", function () {
        it("removes just that signal", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            const pins = getPins(view);
            const busSignals = getBusSignals(view);
            ReactTestUtils.Simulate.click(busSignals[0]);
            ReactTestUtils.Simulate.click(busSignals[1]);
            ReactTestUtils.Simulate.click(pins[1].querySelector('.remove'));
            expect(pins[1].textContent).toContain('Unassigned');
            expect(pins[0].textContent).not.toContain('Unassigned');
        });

        it("restores the signal's availability in the signal panel", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            const pins = getPins(view);
            const busSignals = getBusSignals(view);
            ReactTestUtils.Simulate.click(busSignals[0]);
            ReactTestUtils.Simulate.click(pins[0].querySelector('.remove'));
            expect(busSignals[0].disabled).toBeFalsy();
        });
    });

    describe("Batch add signals", function () {
        it("can add remaining signals", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(view.querySelector('.add-all'));
            const pins = getPins(view);
            expect(pins[0].textContent).toContain('Swooty');
            expect(pins[1].textContent).toContain('Tooty');
        });
    });

    describe("Mandatory signals", function () {

        beforeEach(() => {
            const gateway = getMockBusTemplateGateway({
                signals: [
                    {
                        id: 6,
                        name: "Swooty",
                        mandatory: false
                    },
                    {
                        id: 7,
                        name: "Tooty",
                        mandatory: true
                    }
                ]
            });
            ReactDOM.render(getAssignNetsView(null, gateway), view);
            createTemplate(view);
        });

        it("If a mandatory signal is unassigned, the other signals in the AssignableSignalsPanel are disabled", function () {
            const signals = getBusSignals(view);
            expect(isSignalDisabled(signals[0])).toBe(false);
            expect(isSignalDisabled(signals[1])).toBe(true);
        });

        it("If mandatory signals have been assigned, the other signals in the AssignableSignalsPanel become enabled", function () {
            const signals = getBusSignals(view);
            ReactTestUtils.Simulate.click(signals[0]);
            expect(isSignalDisabled(signals[0])).toBe(true);
            expect(isSignalDisabled(signals[1])).toBe(false);
        });
    });

    describe("Rename bus", function () {

        function getErrorMessage() {
            return view.querySelector('[data-test="renameErrorMessage"]').textContent;
        }

        function triggerRename(newName: string, view) {
            ReactTestUtils.Simulate.click(view.querySelector('.rename'));
            const input = view.querySelector('.customer-bus-rename input');
            input.value = newName;
            ReactTestUtils.Simulate.change(input);
            ReactTestUtils.Simulate.submit(view.querySelector('[data-test="renameBusButton"]'));
        }

        it("can rename a require bus", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            triggerRename('new_name', view);
            expect(view.querySelector('.bus-name').textContent).toContain('new_name');
        });
        it("does not rename a bus if name contains invalid characters", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            triggerRename('new_name"', view); // Quotes are invalid characters.
            expect(view.querySelector('.bus-name').textContent).toContain('PWM');
            expect(getErrorMessage()).toContain('Bus name contains invalid characters.');
        });
        it("does not rename a bus if name is too short", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            triggerRename('n', view);
            expect(view.querySelector('.bus-name').textContent).toContain('PWM');
            expect(getErrorMessage()).toContain('Bus name must be 2 or more characters.');
        });
        it("does not rename a bus if name is too long", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            triggerRename(
                '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901',
                view);
            expect(view.querySelector('.bus-name').textContent).toContain('PWM');
            expect(getErrorMessage()).toContain('Bus name must be 100 or less characters.');
        });

        it("does not let require buses have the same name", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view, CustomerBusType.REQUIRE);
            createTemplate(view, CustomerBusType.REQUIRE);
            triggerRename(customerModule.requires[0].name, view);
            expect(view.querySelector('.bus-name').textContent).toContain('PWM');
            expect(getErrorMessage()).toContain('already in use');
        });

        it("does not let provide buses have the same name", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view, CustomerBusType.PROVIDE);
            createTemplate(view, CustomerBusType.PROVIDE);
            triggerRename(customerModule.provides[0].name, view);
            expect(view.querySelector('.bus-name').textContent).toContain('PWM');
            expect(getErrorMessage()).toContain('already in use');
        });

        it("lets require have same name as provide", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view, CustomerBusType.PROVIDE);
            createTemplate(view, CustomerBusType.REQUIRE);
            const name = customerModule.provides[0].name;
            triggerRename(name, view);
            expect(view.querySelector('.bus-name').textContent).toContain(name);
        });

        it("lets provide have same name as require", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view, CustomerBusType.REQUIRE);
            createTemplate(view, CustomerBusType.PROVIDE);
            const name = customerModule.requires[0].name;
            triggerRename(name, view);
            expect(view.querySelector('.bus-name').textContent).toContain(name);
        });
    });

    describe("Delete bus", function () {
        it("deletes the bus", function () {
            const customerModule = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(customerModule), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(view.querySelector('[data-test="deleteBusButton"]'));
            ReactTestUtils.Simulate.click(view.querySelector('[data-test="confirmButton"]'));
            expect(customerModule.getBuses().length).toEqual(0);
        });
    });

    describe("Power requirement", function () {

        function getPowerInput(view) {
            return view.querySelector('[data-test="powerInput"]');
        }

        it("displays a power input for power buses", function () {
            ReactDOM.render(getAssignNetsView(null, getMockBusTemplateGateway({power: true})), view);
            createTemplate(view);
            expect(getPowerInput(view)).not.toBeNull();
        });

        it("doesn't display a power input for data nets", function () {
            ReactDOM.render(getAssignNetsView(null, getMockBusTemplateGateway({power: false})), view);
            createTemplate(view);
            expect(getPowerInput(view)).toBeNull();
        });

        it("can be set", function () {
            const moduleCreate = createCustomerModuleCreate(getMockedCustomModule());
            ReactDOM.render(getAssignNetsView(moduleCreate, getMockBusTemplateGateway({power: true})), view);
            createTemplate(view);
            // The input is only available when the signal has been assigned.
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            const input = getPowerInput(view);
            input.value = 100;
            ReactTestUtils.Simulate.input(input);
            expect(moduleCreate.getBuses()[0].milliwatts).toEqual(100);
        });
    });

    describe("Next button", function () {

        function getNextButton(view) {
            return view.querySelector('.next');
        }

        it("is disabled by default", function () {
            ReactDOM.render(getAssignNetsView(), view);
            expect(getNextButton(view).disabled).toBeTruthy();
        });

        it("is enabled when the module has a signal assignment", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            expect(getNextButton(view).disabled).toBeFalsy();
        });

        it("is disabled if there is a bus with no assigned signals", function () {
            ReactDOM.render(getAssignNetsView(), view);
            createTemplate(view);
            expect(getNextButton(view).disabled).toBeTruthy();
        });

        it("is disabled if a power bus doesn't have milliwatts", function () {
            ReactDOM.render(getAssignNetsView(null, getMockBusTemplateGateway({power: true})), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            expect(getNextButton(view).disabled).toBeTruthy();
        });

        it("is enabled if a power bus has milliwatts", function () {
            ReactDOM.render(getAssignNetsView(null, getMockBusTemplateGateway({power: true})), view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            const input = view.querySelector('.power-input input');
            input.value = 1000;
            ReactTestUtils.Simulate.input(input);
            expect(getNextButton(view).disabled).toBeFalsy();
        });

        it("is disabled if a domain has no levels selected", function () {
            ReactDOM.render(getAssignNetsView(), view);
            Array.from(view.querySelectorAll('[data-test="allowedLevelToggle"]'))
                .forEach(toggle => ReactTestUtils.Simulate.change(toggle as HTMLInputElement));
            expect(getNextButton(view).disabled).toBeTruthy();
        });

        it("calls onClickNext when available and clicked", function () {
            let called = false;
            const assignNetsView = <AssignNetsView onClickNext={() => called = true}
                                                   customerModuleCreate={ createCustomerModuleCreate(getMockedCustomModule())}
                                                   busTemplateGateway={getMockBusTemplateGateway()}/>;
            ReactDOM.render(assignNetsView, view);
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            ReactTestUtils.Simulate.click(getNextButton(view));
            expect(called).toBe(true);
        });
    });

    describe("Pin point locations", function () {

        function makeNetGroup(netValue: string): AssignableNetGroup {
            return new AssignableNetGroup({
                bus_group: 3763,
                bus_group_name: 'Baz',
                levels: [1, 2, 4],
                nets: [
                    {value: netValue, max_milliwatts: 1000}
                ]
            } as AssignableNetGroupResource);
        }

        function getPinPoints(view): HTMLElement[] {
            return Array.from(view.querySelectorAll('[data-test^="pinPoint"]'));
        }

        function findPinPoint(pinNo: string): HTMLElement | undefined {
            return getPinPoints(view).find(pinPoint => pinPoint.textContent === pinNo);
        }

        it("can render", function () {
            ReactDOM.render(getAssignNetsView(), view);
            expect(getPinPoints(view).length).toBeGreaterThan(0);
        });

        describe("On mouseover net pin", function () {

            it("draws a line", function () {
                ReactDOM.render(getAssignNetsView(), view);
                const nets = getPins(view);
                ReactTestUtils.Simulate.mouseOver(nets[0]);
                expect(view.querySelector('.custom-module__line-canvas').childNodes.length).toBeGreaterThan(0);
            });

            it("adds an indication class to the correct pinpoint text", function () {
                const module = new ModuleBuilder().build();
                spyOn(module, 'getAssignableNets').and.returnValue([
                    makeNetGroup('PIN1')
                ]);
                spyOnProperty(module, 'pinpoints').and.returnValue([
                    {net_name: 'P1', position: {x: 15, y: 20}}
                ]);
                ReactDOM.render(getAssignNetsView(createCustomerModuleCreate(module)), view);
                const nets = getPins(view);
                ReactTestUtils.Simulate.mouseOver(nets[0]);
                expect(findPinPoint('1').querySelector('.blink')).not.toBeNull();
            });

            it("indicates the pinpoint as long as the pin number matches", function () {
                const module = new ModuleBuilder().build();
                spyOn(module, 'getAssignableNets').and.returnValue([
                    makeNetGroup('PIN1')
                ]);
                spyOnProperty(module, 'pinpoints').and.returnValue([
                    {net_name: 'P1', position: {x: 15, y: 20}}
                ]);
                ReactDOM.render(getAssignNetsView(createCustomerModuleCreate(module)), view);
                const nets = getPins(view);
                ReactTestUtils.Simulate.mouseOver(nets[0]);
                expect(findPinPoint('1').querySelector('.blink')).not.toBeNull();
            });

            it("gracefully fails to draw a line if there is no corresponding pin id", function () {
                const module = new ModuleBuilder().build();
                spyOn(module, 'getAssignableNets').and.returnValue([
                    makeNetGroup('PIN1')
                ]);
                spyOnProperty(module, 'pinpoints').and.returnValue([
                    {net_name: '11', position: {x: 15, y: 20}}
                ]);

                ReactDOM.render(getAssignNetsView(createCustomerModuleCreate(module)), view);
                const nets = getPins(view);
                ReactTestUtils.Simulate.mouseEnter(nets[0]);
                expect(view.querySelector('.module-svg-pin .blink')).toBeNull(); // TODO be more specific
            });
        });

        describe("Pin point", function () {
            it("on mouseover, draws a line", function () {
                ReactDOM.render(getAssignNetsView(), view);
                const pinPoints = getPinPoints(view);
                ReactTestUtils.Simulate.mouseOver(pinPoints[0]);
                expect(view.querySelector('.custom-module__line-canvas').childNodes.length).toBeGreaterThan(0);
            });

            describe("On click", function () {
                function clickPinPoint(pinPoint) {
                    // The event callback triggering requires left click.
                    ReactTestUtils.Simulate.click(pinPoint, {nativeEvent: {button: 0} as MouseEvent});
                }

                it("on click, selects the corresponding Net", function () {
                    ReactDOM.render(getAssignNetsView(), view);
                    const pinPoints = getPinPoints(view);
                    clickPinPoint(pinPoints[0]);
                    expect(view.querySelector('.selected-js')).not.toBeNull();
                });

                it("can swap Nets", function () {
                    ReactDOM.render(getAssignNetsView(), view);
                    createTemplate(view);
                    ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
                    const pinPoints = getPinPoints(view);
                    clickPinPoint(pinPoints[0]);
                    clickPinPoint(pinPoints[1]);
                    const nets = getPins(view);
                    expect(nets[1].textContent).not.toContain('Unassigned');
                    expect(nets[0].textContent).toContain('Unassigned');
                });
            });
        });
    });
});

describe("Multiple AssignableNetGroups", function () {

    let view = null;

    beforeEach(() => {
        view = document.createElement('div');
        ReactDOM.render(getMultiGroupView(), view);
    });

    afterEach(() => {
        if (view) {
            ReactDOM.unmountComponentAtNode(view);
            view = null;
        }
    });

    function getMultiGroupView(): JSX.Element {
        const module = new ModuleBuilder().build();
        spyOn(module, 'getAssignableNets').and.returnValue([
            new AssignableNetGroup({
                bus_group: 3763,
                bus_group_name: 'Baz',
                levels: [1, 2, 4],
                nets: [
                    {value: 'Baz_01', max_milliwatts: 1000},
                ]
            }),
            new AssignableNetGroup({
                bus_group: 3700,
                bus_group_name: 'Noob',
                levels: [1, 2, 4],
                nets: [
                    {value: 'NOob_01', max_milliwatts: 1000},
                ]
            })
        ]);
        return getAssignNetsView(createCustomerModuleCreate(module));
    }

    function getDomainNavButtons(view): HTMLButtonElement[] {
        return Array.from(view.querySelectorAll('.nav button')) as HTMLButtonElement[];
    }

    it("renders group navigation tabs", function () {
        expect(view.querySelector('.nav')).not.toBeNull();
    });

    it("renders nets in the first group", function () {
        expect(view.textContent).toContain('Baz_01');
    });

    it("can navigate to another group", function () {
        ReactTestUtils.Simulate.click(getDomainNavButtons(view)[1]);
        expect(view.textContent).toContain('NOob_01');
    });

    it("clicking an unassigned bus doesn't change the domain", function () {
        createTemplate(view);
        const navButtons = getDomainNavButtons(view);
        ReactTestUtils.Simulate.click(navButtons[1]);
        ReactTestUtils.Simulate.click(view.querySelector('[data-test="bus"]'));
        expect(navButtons[1].classList).toContain('active-js');
        expect(view.textContent).toContain('NOob_01');
    });

    it("clicking a bus navigates to the domain, if that domain has a net assigned to it", function () {
        createTemplate(view);
        ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
        const navButtons = getDomainNavButtons(view);
        ReactTestUtils.Simulate.click(navButtons[1]);
        ReactTestUtils.Simulate.click(view.querySelector('[data-test="bus"]'));
        expect(navButtons[0].classList).toContain('active-js');
        expect(view.textContent).toContain('Baz_01');
    });

    describe("AssignableSignalsPanel", function () {

        it("is enabled if none of the bus' signals are assigned", function () {
            createTemplate(view);
            expect(getBusSignals(view).every(signal => !isSignalDisabled(signal)));
        });

        it("is enabled if the bus' signals are assigned to the currently-viewed domain", function () {
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            expect(getBusSignals(view).every(signal => !isSignalDisabled(signal)));
        });

        it("is disabled if the selected bus' signal is assigned to a different domain than the one being viewed", function () {
            createTemplate(view);
            ReactTestUtils.Simulate.click(getBusSignals(view)[0]);
            const navButtons = getDomainNavButtons(view);
            ReactTestUtils.Simulate.click(navButtons[1]);
            expect(getBusSignals(view).every(isSignalDisabled));
        });
    });
});

