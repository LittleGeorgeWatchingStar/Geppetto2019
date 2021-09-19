import {AssignableNet} from "module/custom/AssignableNet";
import {AssignableNetGroupResource} from "./api";
import {CustomerBus} from "./CustomerBus";
import {arrayRangeExtraction} from "../../utils/arrayRangeExtraction";

export class VoltageLevel {
    level: any;
    selected: boolean;

    constructor(level) {
        this.level = level;
        this.selected = true;
    }

    toString() {
        return this.level;
    }

    equals(level) {
        return this.level === level;
    }
}


/**
 * A group of user-assignable nets that belong to the same voltage domain.
 */
export class AssignableNetGroup {
    readonly id: any;
    private readonly levels: VoltageLevel[];
    private readonly nets: AssignableNet[];

    constructor(data: AssignableNetGroupResource) {
        this.id = data.bus_group;
        this.levels = data.levels.map(level => new VoltageLevel(level));
        this.nets = data.nets.map(data => new AssignableNet(data));
        // Eg. PIN3 comes before PIN10.
        this.nets.sort((a, b) => a.value.localeCompare(b.value, undefined, {numeric: true}));
    }

    getId() {
        return this.id;
    }

    getPublicName(): string {
        const numbers = this.nets
            .filter(n => !isNaN(parseInt(n.pinNumber)))
            .map(n => parseInt(n.pinNumber));

        if (numbers.length === 1) {
            return `Pin ${numbers.join('')}`;
        }

        const rangeString = arrayRangeExtraction(numbers);
        if (rangeString) {
            return `Pins ${rangeString}`;
        }

        return 'Voltage Domain';
    }

    /**
     * Clear the Net assignments of this group.
     */
    clearNets(): void {
        this.nets.forEach(net => {
            net.unassign();
            net.toggleGround(false);
        });
    }

    getLevels(): VoltageLevel[] {
        return this.levels.slice(); // defensive copy
    }

    get selectedLevels(): string[] {
        return this.levels.filter(vl => vl.selected).map(vl => vl.level);
    }

    getNets(): AssignableNet[] {
        return this.nets.slice(); // defensive copy
    }

    /**
     * Return true if the Bus has been assigned to a Net in this group.
     */
    ownsBus(bus: CustomerBus): boolean {
        return this.filterNetsByBus(bus).length > 0;
    }

    /**
     * Max milliwatts on a Bus are dependent on the max milliwatts of the Net(s) that the Bus' signals
     * are assigned to. This is only applicable to Power Buses.
     * @return null if this Bus has not been assigned to any Nets.
     */
    calculateMaximumMilliwattsFor(bus: CustomerBus): number | null {
        let lowest = null;
        for (const net of this.filterNetsByBus(bus)) {
            if (lowest === null || net.maxMilliwatts < lowest) {
                lowest = net.maxMilliwatts;
            }
        }
        return lowest;
    }

    filterNetsByBus(bus: CustomerBus): AssignableNet[] {
        return this.nets.filter(net => net.isAssignedToBus(bus));
    }

    findAssignedBuses(): {[uuid: string]: CustomerBus} {
        const checked = {};
        this.nets.forEach(net => {
            if (net.bus) {
                checked[net.bus.uuid] = net.bus;
            }
        });
        return checked;
    }

    removeAssignmentsFor(bus: CustomerBus): void {
        this.nets.forEach(net => {
            if (net.isAssignedToBus(bus)) {
                net.unassign();
            }
        });
    }

    public isValid(): boolean {
        return !this.hasNoPinsAssigned() &&
            !this.findBusNeedsPower() &&
            !this.hasNoLevelSelected();
    }

    public get numOpenPins(): number {
        return this.nets.filter(net => !net.isAssigned && !net.isGround).length;
    }

    hasNoPinsAssigned(): boolean {
        return !this.nets.some(net => net.isAssigned);
    }

    findBusNeedsPower(): CustomerBus | undefined {
        for (const net of this.nets) {
            const bus = net.bus;
            if (bus && bus.isPower && bus.milliwatts === null) {
                return bus;
            }
        }
    }

    hasNoLevelSelected(): boolean {
        return this.selectedLevels.length === 0;
    }

    /**
     * Get the next viable open net to assign a signal, under the currently chosen bus if possible.
     *
     * P1 [Other Bus]                        P1 [unassigned] <- pick this one
     * P2 [Selected Bus]                     P2 [Selected Bus]
     * P3 [unassigned] <- pick this one      P3 [Selected Bus]
     * P4 [Selected Bus]                     P4 [Selected Bus]
     */
    public findNextAssignableNet(selectedBus: CustomerBus): AssignableNet | undefined {
        let beforeFirst: AssignableNet | undefined;
        let backup: AssignableNet | undefined;
        for (let i = 0; i < this.nets.length; ++i) {
            const net = this.nets[i];
            if (net.bus && net.bus.uuid === selectedBus.uuid) {
                const nextNet = this.nets[i + 1];
                if (nextNet && nextNet.isAutoAssignable) {
                    return nextNet;
                }
                if (!beforeFirst && i > 0) {
                    beforeFirst = this.nets[i - 1];
                }
            } else if (!backup && net.isAutoAssignable) {
                backup = net;
            }
        }
        if (beforeFirst && beforeFirst.isAutoAssignable) {
            return beforeFirst;
        }
        return backup;
    }
}
