import {AssignableNetGroup} from 'module/custom/AssignableNetGroup';
import {CustomerBus, CustomerBusType} from "../../../src/module/custom/CustomerBus";
import {Signal} from "../../../src/module/custom/Signal";
import {BusTemplate} from "../../../src/module/custom/BusTemplate";
import {AssignableNetResource} from "../../../src/module/custom/api";
import {AssignableNet} from "../../../src/module/custom/AssignableNet";

function makeTemplate(isPower=false): BusTemplate {
    return new BusTemplate({
        id: 4,
        name: 'GPIO',
        public_name: 'GPIO',
        signals: [{
            id: 4,
            name: "A Signal"
        }],
        power: isPower
    });
}

describe("AssignableNetGroup", function () {

    function makeGroup(nets?: AssignableNetResource[]): AssignableNetGroup {
        const data = {
            "bus_group": 3763,
            "bus_group_name": "16-Pin Female Header",
            "levels": [
                '3.3',
                '1.8'
            ],
            "nets": nets ? nets : getNets()
        };
        return new AssignableNetGroup(data);
    }

    function getNets(): AssignableNetResource[] {
        return [
            {value: "P1", max_milliwatts: 1000},
            {value: "P2", max_milliwatts: 1000},
            {value: "P3", max_milliwatts: 1000}
        ];
    }

    it("has the right ID", function () {
        let g = makeGroup();
        expect(g.getId()).toEqual(3763);
    });

    it("has a public name that contains its pin numbers", function () {
        const g = makeGroup();
        expect(g.getPublicName()).toContain(g.getNets()[0].pinNumber);
        expect(g.getPublicName()).toContain(g.getNets()[g.getNets().length - 1].pinNumber);
    });

    it("has the right levels", function () {
        expect(makeGroup().getLevels().length).toEqual(2);
    });

    it("has the right number of nets", function () {
        expect(makeGroup().getNets().length).toEqual(3);
    });

    it("creates AssignableNets correctly", function () {
        let g = makeGroup();
        let net = g.getNets()[0];
        expect(net.value).toEqual("P1");
    });

    it("has all levels selected by default", function () {
        let g = makeGroup();
        expect(g.selectedLevels).toEqual(['3.3', '1.8']);
    });

    describe("Auto assignment", function () {
        it("returns the first empty net", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            expect(group.findNextAssignableNet(bus).isAssigned).toBe(false);
        });

        it("does not return an assigned net", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            expect(group.findNextAssignableNet(bus).isAssigned).toBe(false);
        });

        it("does not return a GND net", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            group.getNets()[0].toggleGround(true);
            expect(group.findNextAssignableNet(bus).isGround).toBe(false);
        });

        it("returns falsy if there were no valid nets", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            group.getNets().forEach(net => net.toggleGround(true));
            expect(group.findNextAssignableNet(bus)).toBeFalsy();
        });

        it("prefers to return a net consecutive to another net with the same bus", function () {
            const group = makeGroup([
                {value: "P1", max_milliwatts: 1000}, // Assigned bus1
                {value: "P2", max_milliwatts: 1000},
                {value: "P3", max_milliwatts: 1000}, // Assigned bus2
                {value: "P4", max_milliwatts: 1000}, // This should be preferred if we're assigning a signal that belongs to bus2
                {value: "P5", max_milliwatts: 1000},
            ]);
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const bus2 = new CustomerBus('Test2', makeTemplate(), CustomerBusType.REQUIRE);
            const nets = group.getNets();
            nets[0].assign(bus, bus.getSignals()[0]);
            nets[2].assign(bus2, bus2.getSignals()[1]);
            expect(group.findNextAssignableNet(bus2).value).toContain("P4");
        });
    });

    describe("Error checking", function () {

        it("if the group doesn't have any assigned pins, the check returns true", function () {
            const group = makeGroup();
            expect(group.hasNoPinsAssigned()).toBe(true);
        });

        it("if the group has an assigned pin, the check returns false", function () {
            const group = makeGroup();
            const nets = group.getNets();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            nets[0].assign(bus, bus.getSignals()[0]);
            expect(group.hasNoPinsAssigned()).toBe(false);
        });

        it("can check that the power input on a power bus is unfulfilled", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(true), CustomerBusType.REQUIRE);
            group.getNets()[0].assign(bus, bus.getSignals()[0]);
            expect(group.findBusNeedsPower()).not.toBeUndefined();
        });

        it("if no voltage levels are selected, check returns true", function () {
            const group = makeGroup();
            group.getLevels().forEach(level => level.selected = false);
            expect(group.hasNoLevelSelected()).toBe(true);
        });

        it("if a voltage level is selected, check returns false", function () {
            const group = makeGroup();
            group.getLevels().forEach(level => level.selected = false);
            group.getLevels()[0].selected = true;
            expect(group.hasNoLevelSelected()).toBe(false);
        });
    });

    describe("Clear nets", function () {
        it("Clears all net assignments", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const bus2 = new CustomerBus('Test2', makeTemplate(), CustomerBusType.REQUIRE);
            const pin1 = group.getNets()[0];
            const pin2 = group.getNets()[1];
            pin1.assign(bus, bus.getSignals()[0]);
            pin2.assign(bus, bus2.getSignals()[0]);
            group.clearNets();
            expect(group.hasNoPinsAssigned()).toBe(true);
        });

        it("Clears GND pins", function () {
            const group = makeGroup();
            const pin = group.getNets()[0];
            pin.toggleGround(true);
            group.clearNets();
            expect(pin.isGround).toBe(false);
        });
    });

    describe("Clear nets of bus", function () {
        it("removes nets assigned to a certain bus", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const pin1 = group.getNets()[0];
            const pin2 = group.getNets()[1];
            pin1.assign(bus, bus.getSignals()[0]);
            pin2.assign(bus, bus.getSignals()[1]);
            group.removeAssignmentsFor(bus);
            expect(group.hasNoPinsAssigned()).toBe(true);
        });

        it("does not remove nets that aren't assigned to that bus", function () {
            const group = makeGroup();
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const bus2 = new CustomerBus('Test2', makeTemplate(), CustomerBusType.REQUIRE);
            const pin1 = group.getNets()[0];
            const pin2 = group.getNets()[1];
            pin1.assign(bus, bus.getSignals()[0]);
            pin2.assign(bus2, bus2.getSignals()[0]);
            group.removeAssignmentsFor(bus);
            expect(pin1.isAssigned).toBe(false);
            expect(pin2.isAssigned).toBe(true);
        });
    });
});

describe("AssignableNet", function () {
    describe("Swap an assigned net with an unassigned one", function () {
        it("Properly swaps the bus and signal", function () {
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const net = new AssignableNet({value: "P1", max_milliwatts: 1000});
            const net2 = new AssignableNet({value: "P2", max_milliwatts: 1000});
            const signal = bus.getSignals()[0];
            net.assign(bus, signal);
            net.swap(net2);
            expect(net2.bus).toEqual(bus);
            expect(net.bus).toBeNull();
            expect(net2.signal).toEqual(signal);
            expect(net.isAssigned).toBe(false);
        });

        it("swaps GND", function () {
            const net = new AssignableNet({value: "P1", max_milliwatts: 1000});
            const net2 = new AssignableNet({value: "P2", max_milliwatts: 1000});
            net.toggleGround(true);
            net.swap(net2);
            expect(net2.isGround).toBe(true);
            expect(net.isGround).toBe(false);
        });
    });

    describe("Swap two assigned nets", function () {
        it("properly swaps the bus and signal", function () {
            const net = new AssignableNet({value: "P1", max_milliwatts: 1000});
            const net2 = new AssignableNet({value: "P2", max_milliwatts: 1000});
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            const bus2 = new CustomerBus('Test2', makeTemplate(), CustomerBusType.REQUIRE);
            const signal = bus.getSignals()[0];
            const signal2 = bus2.getSignals()[0];
            net.assign(bus, signal);
            net2.assign(bus2, signal2);
            net.swap(net2);
            expect(net.bus).toEqual(bus2);
            expect(net.signal).toEqual(signal2);
            expect(net2.bus).toEqual(bus);
            expect(net2.signal).toEqual(signal);
        });

        it("swaps GND", function () {
            const net = new AssignableNet({value: "P1", max_milliwatts: 1000});
            const net2 = new AssignableNet({value: "P2", max_milliwatts: 1000});
            const bus = new CustomerBus('Test', makeTemplate(), CustomerBusType.REQUIRE);
            net.assign(bus, bus.getSignals()[0]);
            net2.toggleGround(true);
            net.swap(net2);
            expect(net2.isGround).toBe(false);
            expect(net.isGround).toBe(true);
        });
    });
});
