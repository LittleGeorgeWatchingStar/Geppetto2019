import {CustomerBus} from "./CustomerBus";
import {Signal} from "./Signal";
import {AssignableNetResource} from "./api";
import {NetAssignmentData} from "./CustomerModuleGateway";
import {normalizePinName} from "../PinPoint";

/**
 * A user-assignable net used to make a custom module.
 */
export class AssignableNet {
    public readonly value: string;
    public readonly maxMilliwatts: any;
    public signal: Signal;
    private _bus: CustomerBus | null;
    public isGround: boolean;

    constructor(data: AssignableNetResource) {
        this.value = data.value;
        this.maxMilliwatts = data.max_milliwatts;
        this.signal = null;
        this._bus = null;
        this.isGround = false;
    }

    swap(other: AssignableNet): void {
        const oldSignal = this.signal;
        const oldBus = this.bus;
        const oldGnd = this.isGround;
        if (other.signal) {
            this.assign(other.bus, other.signal);
        } else {
            this.toggleGround(other.isGround);
        }
        if (oldSignal) {
            other.assign(oldBus, oldSignal);
        } else {
            other.toggleGround(oldGnd);
        }
    }

    public get pinNumber(): string {
        return normalizePinName(this.value);
    }

    get isAutoAssignable(): boolean {
        return !this.isAssigned && !this.isGround;
    }

    get isAssigned(): boolean {
        return null !== this.signal;
    }

    isAssignedToBus(bus: CustomerBus): boolean {
        return this.bus && this.bus.uuid === bus.uuid;
    }

    assign(bus: CustomerBus, signal: Signal | null): void {
        this.isGround = false;
        this._bus = bus;
        this.signal = signal;
    }

    unassign(): void {
        this.signal = null;
        this._bus = null;
    }

    get bus(): CustomerBus | null {
        return this._bus;
    }

    toggleGround(isGround: boolean): void {
        this.unassign();
        this.isGround = isGround;
    }

    get signalName(): string {
        if (this.signal) {
            return this.signal.getName();
        } else if (this.isGround) {
            return 'Ground';
        } else {
            return 'Unassigned';
        }
    }

    get isPower(): boolean {
        return this.signal ? this.signal.isPower : false;
    }

    toServer(): NetAssignmentData {
        return {
            signal: this.signal.getId(),
            value: this.value,
        };
    }

    get groundNetId(): string {
        return "Ground";
    }

    get groundNetName(): string {
        return "Ground";
    }
}
