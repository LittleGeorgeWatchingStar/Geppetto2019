import {RequireBus} from "./RequireBus";
import {ProvideBus} from "./ProvideBus";
import {Bus} from "./Bus";

/**
 * A capacity calculator for a provide bus.
 */
export interface ProvideCapacity {
    getRemaining(): number;
    calculateUsed(): void;
    getUsed(): number;
    hasCapacityForMultiple(requireBuses: RequireBus[]): boolean;
    hasEnoughCapacityFor(require: RequireBus | null): boolean;
    hasEnoughTotalCapacityFor(require: RequireBus | null): boolean;
    toString(): string;
}

/**
 * A capacity calculator for a require bus.
 */
export interface RequireCapacity {
    getPowerDraw(): number;
    toString(): string;
}

/**
 * @return A capacity calculator for the given provide bus.
 */
export function getProvideCapacity(bus: ProvideBus): ProvideCapacity {
    return bus.isPower()
        ? new PowerProvideCapacity(bus)
        : new DataProvideCapacity(bus);
}

/**
 * @return A capacity calculator for the given require bus.
 */
export function getRequireCapacity(bus: RequireBus): RequireCapacity {
    return bus.isPower()
        ? new PowerRequireCapacity(bus)
        : new DataRequireCapacity(bus);
}

abstract class Capacity<T extends Bus> {
    protected bus: T;
    protected capacity: number;
    protected required: number;
    protected used: number;

    constructor(bus: T) {
        this.bus = bus;
        this.capacity = this.required = this.getInitialCapacity(bus);
        this.used = 0;
    }

    protected abstract getInitialCapacity(bus: T): number;

    public getRemaining() {
        return this.capacity - this.used;
    }
}

class DataProvideCapacity
    extends Capacity<ProvideBus>
    implements ProvideCapacity {

    protected getInitialCapacity(bus: ProvideBus): number {
        return bus.getNumConnections();
    }

    public hasCapacityForMultiple(requireBuses: RequireBus[]): boolean {
        const totalNeeded = requireBuses
            .map(require => require.getNumConnections())
            .reduce((total, num) => total + num);
        return this.getRemaining() >= totalNeeded;
    }

    public hasEnoughCapacityFor(require_bus: RequireBus | null) {
        return require_bus
            ? this.getRemaining() >= require_bus.getNumConnections()
            : this.getRemaining() >= 0;
    }

    public hasEnoughTotalCapacityFor(requireBus: RequireBus | null): boolean {
        return requireBus
            ? this.capacity >= requireBus.getNumConnections()
            : true;
    }

    public toString() {
        return this.getRemaining() + "/" + this.capacity;
    }

    public getUsed() {
        return this.used;
    }

    public calculateUsed() {
        let used = 0;
        for (const require of this.bus.getGraphChildren()) {
            used += require.getNumConnections();
        }
        this.used = Math.ceil(used);
    }
}


class DataRequireCapacity
    extends Capacity<RequireBus>
    implements RequireCapacity {

    protected getInitialCapacity(bus: RequireBus): number {
        return bus.getNumConnections();
    }

    public toString(): string {
        return this.required.toFixed();
    }

    public getPowerDraw() {
        return 0;
    }
}


class PowerProvideCapacity
    extends Capacity<ProvideBus>
    implements ProvideCapacity {

    protected getInitialCapacity(bus: ProvideBus): number {
        return this.bus.getMilliwatts();
    }

    public hasCapacityForMultiple(requireBuses: RequireBus[]): boolean {
        const totalNeeded = requireBuses
            .map(require => require.getPowerDraw())
            .reduce((total, num) => total + num);
        return this.treeHasCapacity(this.bus, totalNeeded);
    }

    public hasEnoughCapacityFor(require_bus: RequireBus | null): boolean {
        return require_bus
            ? this.treeHasCapacity(this.bus, require_bus.getPowerDraw())
            : this.getRemaining() >= 0;
    }

    public hasEnoughTotalCapacityFor(requireBus: RequireBus | null): boolean {
        return requireBus
            ? this.capacity >= requireBus.getPowerDraw()
            : true;
    }

    /**
     * Checks if the tree above (and including) the provide bus has the
     * power to accommodate the new connection
     */
    private treeHasCapacity(provide_bus: ProvideBus, power_draw: number): boolean {
        if (provide_bus.getRemaining() < power_draw) {
            return false;
        }

        let has_capacity = true;
        for (const require_bus of provide_bus.getGraphParents()) {
            const efficiency = require_bus.efficiency;
            if (efficiency > 0) {
                for (const parent_provide_bus of require_bus.getGraphParents()) {
                    const updated_power_draw = Math.ceil(power_draw / efficiency);
                    if (!this.treeHasCapacity(parent_provide_bus, updated_power_draw)) {
                        has_capacity = false;
                    }
                }
            }
        }

        return has_capacity;
    }

    public toString(): string {
        return this.getRemaining() + "/" + this.capacity + "mW";
    }

    public getUsed(): number {
        return this.used;
    }

    public calculateUsed(): void {
        let used = 0;
        this.bus.getGraphChildren().forEach(require => {
            used += require.getPowerDraw();
        });
        this.used = used;
    }
}

class PowerRequireCapacity
    extends Capacity<RequireBus>
    implements RequireCapacity {

    protected getInitialCapacity(bus: RequireBus): number {
        return this.bus.getMilliwatts();
    }

    public toString(): string {
        return this.required + "mW";
    }

    public getPowerDraw(): number {
        this.calculatePowerDraw();
        return this.required;
    }

    private calculatePowerDraw(): void {
        const efficiency = this.bus.efficiency;
        if (efficiency > 0) {
            let draw = this.bus.getMilliwatts();
            for (const provide of this.bus.getGraphChildren()) {
                draw += provide.getUsed() / efficiency;
            }
            this.required = Math.ceil(draw);
        }
    }
}
