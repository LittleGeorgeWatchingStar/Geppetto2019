import {Connection, createConnection} from "connection/Connection";
import * as _ from "underscore";
import {NeedsConnections} from "../core/NeedsConnections";
import {Level, ServerID} from "../model/types";
import {PlacedModule, ProviderOptions} from "../placedmodule/PlacedModule";
import {AddressSpace} from "./ReservableAddressSpace";
import {BusResource} from "./api";
import {Bus} from "./Bus";
import {BusPriority, isStopPriority} from "./BusPriority";
import {getRequireCapacity, RequireCapacity} from "./capacity";
import {ProvideBus} from "./ProvideBus";
import {ExplicitRequireNoConnection} from "../connection/ExplicitRequireNoConnection";

interface RequireBusNode {
    parent_nodes: ProvideBus[];
    children_nodes: ProvideBus[];
    visited: boolean;
}

/**
 * A bus that must be connected in order for its module to function.
 */
export class RequireBus extends Bus implements NeedsConnections {
    private manager: RequireCapacity;

    defaults() {
        return _.defaults({
            // power draw formula
            amount: 0,
            // The provide bus this bus is connected to
            selected: null,
            // maps placed modules to a list of matching provides
            options: {},
            bus_group: null,
            is_optional: false,
            explicit_require_no_connection: null,
        }, Bus.prototype.defaults());
    }

    initialize(attributes: BusResource, placedModule: PlacedModule) {
        super.initialize(attributes, placedModule);

        this.manager = getRequireCapacity(this);
        this.findDownstreamProvides();

        if (attributes.address) {
            this.setAddress(attributes.address);
        }

        return this;
    }

    /**
     * If this is a power regulator, it provides power to downstream
     * provide buses within this module. This method establishes those
     * connections and builds that part of the module's power graph.
     */
    private findDownstreamProvides() {
        if (this.isRegulator) {
            for (const provide of this.placedModule.powerProvides) {
                if (this.implementsVlogicTemplate() &&
                    !provide.implementsVlogicTemplate()) {
                    continue;
                }
                this.addGraphChild(provide);
                provide.addGraphParent(this);
            }
        }
    }

    private get graph(): RequireBusNode {
        return this.get('graph');
    }

    /**
     * @deprecated Use getConnectedProvide() instead
     */
    getGraphParents(): ProvideBus[] {
        return this.graph.parent_nodes;
    }

    /**
     * @deprecated Use setConnectedProvide() instead
     */
    addGraphParent(parent_node: ProvideBus): void {
        this.graph.parent_nodes.push(parent_node);
    }

    /**
     * @deprecated Use setConnectedProvide() instead
     */
    removeGraphParent(parent_node: ProvideBus): void {
        const parent_nodes = this.getGraphParents();
        const index = parent_nodes.indexOf(parent_node);

        if (index !== -1) {
            parent_nodes.splice(index, 1)
        }
    }

    getGraphChildren(): ProvideBus[] {
        return this.graph.children_nodes;
    }

    addGraphChild(child_node: ProvideBus): void {
        const children_nodes = this.getGraphChildren();
        if (children_nodes.indexOf(child_node) === -1) {
            children_nodes.push(child_node);
        }
    }

    /**
     * @return True if this is the topmost require bus in the power graph.
     */
    public get isPowerSource(): boolean {
        return (
            this.isPower()
            && (!this.hasUpstreamRequires())
        );
    }

    private hasUpstreamRequires(): boolean {
        return this.upstreamRequires.length > 0;
    }

    private get upstreamRequires(): RequireBus[] {
        let upstream = [];
        if (this.isConnected()) {
            const provide = this.getConnectedProvide();
            upstream = provide.getGraphParents();
            if (upstream.length === 0 && this.implementsVlogicTemplate()) {
                upstream = provide.placedModule.powerRequires;
            }
        }
        return upstream;
    }

    public setProvidePriority(provide: ProvideBus): void {
        const priorities = this.findMatchingPriorities(provide);
        const selectedPriority = this.selectPriority(priorities);
        if (null !== selectedPriority) {
            provide.setBusPriority(selectedPriority);
        }
    }

    /**
     * True if the provide has a higher priority than normal to this require.
     */
    public isHighPriority(provide: ProvideBus): boolean {
        const priorities = this.findMatchingPriorities(provide);
        const noPriority = 0;
        for (const priority of priorities) {
            if (!isStopPriority(priority) && priority.priority > noPriority) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find provide priorities that shares the same priority group as a
     * require's priority.
     */
    public findMatchingPriorities(provide: ProvideBus): BusPriority[] {
        const matchingPriorities = [];
        for (const requirePriority of this.getPriorities()) {
            for (const providePriority of provide.getPriorities()) {
                if (requirePriority.group.id === providePriority.group.id) {
                    matchingPriorities.push(providePriority);
                }
            }
        }
        return matchingPriorities;
    }

    /**
     * A priority pattern with a 'stop' emblem takes precedence. Otherwise,
     * we select the priority pattern with the highest priority.
     */
    private selectPriority(priorities: BusPriority[]): BusPriority | null {
        let selectedPriority = null;
        for (const priority of priorities) {
            if (isStopPriority(priority)) {
                return priority;
            } else if (!selectedPriority) {
                selectedPriority = priority;
            } else if (priority.priority > selectedPriority.priority) {
                selectedPriority = priority;
            }
        }
        return selectedPriority;
    }

    public recalculateDeterminedLevels(): void {
        if (!this.getBusGroup()) {
            return;
        }
        const exclusion = this.hasExclusions() ? this : null;
        this.getBusGroup().recalculateDeterminedLevels(exclusion);
    }

    /**
     * We are connecting a provide to this require bus
     */
    connect(provide: ProvideBus): Connection {
        const exclusions = this.getExclusions();

        provide.addGraphChild(this);
        this.addGraphParent(provide);
        provide.updateParentPowerRequirement();

        provide.reserveAddressSpace(this.getAddressSpace());

        if (exclusions.length) {
            exclusions.forEach(exclusion => {
                exclusion.disconnect();
                exclusion.unsetNoConnect();
            });
        }
        this.setConnectedProvide(provide);
        this.recalculateDeterminedLevels();

        return createConnection({
            require: this,
            provide: provide
        });
    }

    disconnect(): void {
        const provide = this.getConnectedProvide();
        const connection = this.getConnection();

        if (provide) {
            provide.removeGraphChild(this);
            this.removeGraphParent(provide);
            provide.updateParentPowerRequirement();

            provide.releaseAddressSpace(this.getAddressSpace());

            this.recalculateDeterminedLevels();
            provide.recalculateDeterminedLevels();
        }
        if (connection) {
            connection.disconnect();
        }

        this.setConnectedProvide(null);
    }

    /**
     * We are explicitly setting this require bus to be NC.
     */
    makeNoConnect(): ExplicitRequireNoConnection {
        console.assert(this.isOptional);
        const noConnection = new ExplicitRequireNoConnection({require: this});
        this.setNoConnection(noConnection);
        return this.getNoConnection();
    }

    unsetNoConnect(): void {
        const noConnection = this.getNoConnection();
        if (noConnection) {
            this.designRevision.removeNoConnection(noConnection);
        }
        this.setNoConnection(null);
    }

    autoConnectVlogicPower(): void {
        const placed_module = this.getPlacedModule();
        placed_module.autoConnectVlogicPower(this.getBusGroup());
    }

    /**
     * True if this bus can only be connected to a module that also
     * provides VLOGIC power.
     */
    needsVlogicPower(): boolean {
        return Boolean(this.getRequiredVlogicPowerBus());
    }

    public get powerDraw(): number {
        return this.manager.getPowerDraw();
    }

    public getPowerDraw(): number {
        return this.powerDraw;
    }

    initExclusions(): void {
        const exclusions = [];

        for (const exclusion_id of this.get('exclusions')) {
            const exclusion_bus = this.collection.get(exclusion_id as ServerID);
            exclusions.push(exclusion_bus);
        }

        this.setExclusions(exclusions);
    }

    /**
     * Other require buses with which this bus is mutually-exclusive.
     *
     * Only one of these buses can be connected.
     */
    getExclusions(): RequireBus[] {
        return this.get('exclusions');
    }

    public getInclusions(): RequireBus[] {
        return this.placedModule.getRequireInclusions(this);
    }

    public hasExclusions(): boolean {
        return this.getExclusions().length > 0;
    }

    setExclusions(exclusions: RequireBus[]) {
        this.set('exclusions', exclusions);
    }

    setConnectedProvide(provide: ProvideBus | null): void {
        this.set('selected', provide);
    }

    /**
     * True if this require bus can accept any of the given voltages level.
     */
    public canAcceptAnyLevel(levels: Level[]): boolean {
        const exclusion = this.hasExclusions() ? this : null;
        return this.getBusGroup().canAcceptAnyLevel(levels, exclusion);
    }

    /**
     * True if this is a variable-level bus and is not VLOGIC power.
     */
    isVariableNonVlogic(): boolean {
        return this.isVariableLevel() && (!this.implementsVlogicTemplate());
    }

    // STATUS
    public isConnected(): boolean {
        // Note: "selected" is the ProvideBus this RequireBus is connected to.
        return Boolean(this.get('selected'));
    }

    public isReady(): boolean {
        const options = this.getOptions();
        return !_.isEmpty(options);
    }

    /**
     * Is this RequireBus set to a no connect.
     */
    public isNoConnect(): boolean {
        return this.getNoConnection() != null;
    }

    /**
     * Note: return false if bus does not implement VLOGIC.
     */
    public isVlogicConnectionNotRequired(): boolean {
        return this.implementsVlogicTemplate() && this.getBusGroup().isVlogicRequireBusConnectionNotRequired;
    }


    // getters, setters
    getAddressSpace(): AddressSpace {
        return AddressSpace.fromDelimitedString(this.get('address'));
    }

    private setAddress(address: string) {
        this.set('address', address);
    }

    getOptions(): ProviderOptions {
        return this.get('options');
    }

    /**
     * A collection of placed modules to which this bus might be
     * able to connect. The modules are indexed by cid.
     */
    setOptions(options: ProviderOptions): void {
        this.set('options', options);
    }

    /**
     * The provide bus to which this require bus is connected, if any.
     */
    getConnectedProvide(): ProvideBus | null {
        return this.get('selected');
    }

    isConnectedToBus(provide: ProvideBus): boolean {
        return this.getConnectedProvide() === provide;
    }

    isConnectedToModule(placed_module: PlacedModule): boolean {
        const provide = this.getConnectedProvide();
        return provide && provide.getPlacedModule() === placed_module;
    }

    public get efficiency(): number {
        return this.get('efficiency');
    }

    public get isOptional(): boolean {
        return this.get('is_optional');
    }

    /**
     * If this is a regulator, it passes power down to the power
     * provides on this module.
     */
    private get isRegulator(): boolean {
        return this.isPower() && this.efficiency > 0;
    }

    getDescriptiveString(): string {
        return this.manager.toString();
    }

    /**
     * If this bus needs to be connected along with VLOGIC power,
     * this method returns that VLOGIC bus. Otherwise returns null.
     */
    getRequiredVlogicPowerBus(): RequireBus | null {
        if (!this.isVariableLevel()) {
            return null;  // vlogic power is not needed
        }
        return this.getBusGroup().getRequireVlogicPowerBus();
    }

    getConnection(): Connection | undefined {
        const connections = this.designRevision.connections;
        return connections.find(connection => {
            return this === connection.requireBus;
        });
    }

    setNoConnection(noConnection: ExplicitRequireNoConnection | null): void {
        if (this.isOptional) {
            this.set('explicit_require_no_connection', noConnection);
        }
    }

    getNoConnection(): ExplicitRequireNoConnection | null {
        return this.get('explicit_require_no_connection');
    }
}
