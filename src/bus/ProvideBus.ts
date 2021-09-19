import {AddressSpace, ReservableAddressSpace} from "bus/ReservableAddressSpace";
import * as _ from "underscore";
import {ServerID} from "../model/types";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {BusResource} from "./api";
import {Bus} from "./Bus";
import {BusPriority, containsStopPriority} from "./BusPriority";
import {getProvideCapacity, ProvideCapacity} from "./capacity";
import {RequireBus} from "./RequireBus";
import ConnectionController from "../connection/ConnectionController";

interface ProvideBusNode {
    parent_nodes: RequireBus[];
    children_nodes: RequireBus[];
    visited: boolean;
}

/**
 * A bus that a module makes available to satisfy other modules' require
 * buses.
 */
export class ProvideBus extends Bus {
    private manager: ProvideCapacity;

    defaults() {
        return _.defaults({
            addresses: [],
            // whether we can provide for the currently connecting require bus
            option: false,
            // priority relative to the currently connecting require bus,
            // has keys ['provide', 'priority', 'type']
            prioritized_connection: null,
            // how much more capacity we have remaining for any further
            // connections
            remaining: 0,
            // How much of our capacity is being used by connected require buses
            used: 0
        }, Bus.prototype.defaults());
    }

    initialize(attributes: BusResource, placedModule: PlacedModule) {
        super.initialize(attributes, placedModule);
        this.set('addresses', new ReservableAddressSpace(attributes.address));

        this.manager = getProvideCapacity(this);
        return this;
    }

    /**
     * :-( True if this bus connected to the currently-selected require.
     */
    isCurrentlyConnected(): boolean {
        const require = ConnectionController.getRequireToConnect();
        return null != require && require.isConnectedToBus(this);
    }

    /**
     * Recursively adds this and all downstream provide buses to the list.
     */
    public flatten(list: ProvideBus[]): void {
        if (list.indexOf(this) === -1) {
            list.push(this);
            this.getGraphChildren().forEach(function (child) {
                child.getGraphChildren().forEach(function (grandchild) {
                    grandchild.flatten(list);
                });
            });
        }
    }

    private get graph(): ProvideBusNode {
        return this.get('graph');
    }

    getGraphParents(): RequireBus[] {
        return this.graph.parent_nodes;
    }

    addGraphParent(parent_node: RequireBus): void {
        this.graph.parent_nodes.push(parent_node);
    }

    hasGraphChildren(): boolean {
        return this.graph.children_nodes.length > 0;
    }

    getGraphChildren(): RequireBus[] {
        return this.graph.children_nodes;
    }

    addGraphChild(child_node: RequireBus): void {
        const children_nodes = this.getGraphChildren();
        if (children_nodes.indexOf(child_node) === -1) {
            children_nodes.push(child_node);
        }
    }

    removeGraphChild(child_node: RequireBus): void {
        const children_nodes = this.getGraphChildren();
        const index = children_nodes.indexOf(child_node);

        if (index !== -1) {
            children_nodes.splice(index, 1)
        }
    }

    busTemplatesMatch(requireBus: RequireBus): boolean {
        for (const provideTemplate of this.templates) {
            for (const requireTemplate of requireBus.templates) {
                if (provideTemplate.id === requireTemplate.id) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * True if this provide bus is compatible with the given require bus.
     *
     * This doesn't necessarily mean they can be connected -- issues of
     * available capacity and priority patterns still remain. If they can't be connected,
     * the user should be able to see why (e.g., via tooltips).
     */
    public isMatch(requireBus: RequireBus): boolean {
        return this.isCompatibleWith(requireBus)
            && this.canProvideVlogicPower(requireBus);
    }

    /**
     * Helper method to isMatch()
     */
    private isCompatibleWith(requireBus: RequireBus): boolean {
        return this.busTemplatesMatch(requireBus)
            && requireBus.canAcceptAnyLevel(this.getDeterminedLevels());
    }

    /**
     * True if this provide bus can provide whatever vlogic power
     * is required by `requireBus`.
     */
    private canProvideVlogicPower(requireBus: RequireBus): boolean {
        // get require vlogic bus that is in the same group as require bus
        const require_vlogic_bus = requireBus.getRequiredVlogicPowerBus();
        if (!require_vlogic_bus) {
            return true;  // vlogic power is not needed
        }
        if (require_vlogic_bus.isConnected()) {
            return true;  // vlogic power already provided by someone else
        }

        // get provide vlogic power bus that is in the same group as provide bus
        const provide_vlogic_bus = this.getBusGroup().getProvideVlogicPowerBus();

        return provide_vlogic_bus
            && provide_vlogic_bus.isCompatibleWith(require_vlogic_bus);
    }

    /**
     * True if the data address is available.
     */
    isAddressSpaceAvailable(addressSpace: AddressSpace): boolean {
        return this.addresses.isAvailable(addressSpace);
    }

    private get addresses(): ReservableAddressSpace {
        return this.get('addresses');
    }

    /**
     * Marks the given address as used.
     *
     * This is called when connecting this provide bus to a require bus.
     *
     * @param addressSpace An address space that is being used by a connected
     * require bus.
     */
    reserveAddressSpace(addressSpace: AddressSpace): void {
        this.addresses.reserve(addressSpace);
    }

    /**
     * Marks the given address as available.
     *
     * This is called when disconnecting this provide bus from a require bus.
     *
     * @param addressSpace - an address space that is being released
     */
    releaseAddressSpace(addressSpace: AddressSpace): void {
        this.addresses.release(addressSpace);
    }

    /**
     * Indicates whether this bus is excluded due to net multiplexing.
     *
     * If true, it means that this bus shares a net with another bus, so
     * that only one of them can be connected, and that the other one
     * is already connected.
     */
    isExcluded(): boolean {
        return null !== this.excludedBy;
    }

    /**
     * If this bus cannot be used due to a bus exclusion, this returns
     * the other bus that is causing this one to be excluded.
     */
    public get excludedBy(): ProvideBus | null {
        const placedModule = this.getPlacedModule();
        if (!placedModule) {
            return null;
        }
        for (const id of this.exclusions) {
            const provide = placedModule.getProvideById(id);
            if (provide && provide.hasGraphChildren()) {
                return provide;
            }
        }
        return null;
    }

    private get exclusions(): ServerID[] {
        return this.get('exclusions');
    }

    getRemaining() {
        return this.manager.getRemaining();
    }

    calculateUsed() {
        this.manager.calculateUsed();
    }

    getUsed(): number {
        return this.used;
    }

    /**
     * The capacity (either num connections or milliwatts) of this bus
     * that has been used.
     */
    public get used(): number {
        return this.manager.getUsed();
    }

    disconnectRequire(require: RequireBus): void {
        this.removeGraphChild(require);
    }

    resetConnecting() {
        this.setBusPriority(null);
    }

    disconnect() {
        this.designRevision.connections
            .filter(connection => this === connection.provideBus)
            .forEach(connection => {
                connection.requireBus.disconnect();
            });
    }

    isConnected() {
        return this.designRevision.connections
            .some(connection => this === connection.provideBus);
    }

    updateParentPowerRequirement() {
        this.calculateUsed();
        for (const require of this.getGraphParents()) {
            require.getPowerDraw();
        }
    }

    /**
     * True if this provide is a match to the require, *ignoring power/connection capacity*.
     */
    isCompatibleTo(require: RequireBus): boolean {
        return this.isMatch(require) &&
            !this.hasMatchingStopPriority(require) &&
            !this.isExcluded();
    }

    /**
     * True if this provide is a match to the require and has enough capacity.
     */
    canBeConnectedTo(require: RequireBus): boolean {
        return this.isCompatibleTo(require) &&
            this.hasEnoughCapacityFor(require);
    }

    hasCapacityForMultiple(requireBuses: RequireBus[]): boolean {
        return this.manager.hasCapacityForMultiple(requireBuses);
    }

    hasEnoughCapacityFor(require_bus: RequireBus | null): boolean {
        return this.manager.hasEnoughCapacityFor(require_bus);
    }

    hasEnoughTotalCapacityFor(requireBus: RequireBus | null): boolean {
        return this.manager.hasEnoughTotalCapacityFor(requireBus);
    }

    getDescriptiveString(): string {
        return this.manager.toString();
    }

    public getPriority(): number {
        const conn = this.getBusPriority();
        return conn ? conn.priority : 0;
    }

    public getBusPriority(): BusPriority | null {
        return this.get('prioritized_connection');
    }

    public setBusPriority(priority: BusPriority): void {
        this.set('prioritized_connection', priority);
    }

    /**
     * True if this bus has a priority with a 'stop' emblem that shares
     * the same priority group as a require's priority.
     */
    public hasMatchingStopPriority(require: RequireBus): boolean {
        return containsStopPriority(require.findMatchingPriorities(this));
    }

    /**
     * A "stop" priority is the opposite of a typical bus priority: rather
     * than indicating that this bus should be preferred, it indicates
     * that this bus is not compatible.
     */
    public hasStopPriority(): boolean {
        return containsStopPriority([this.getBusPriority()]);
    }

    public getPriorityMessage(): string {
        return this.getBusPriority()
            ? this.getBusPriority().message : '';
    }
}
