import {SELECTED_REQUIRE_CONNECTION, SelectExclusionSetEvent, SelectRequireEvent} from "../bus/events";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {Action, executeAction, ReversibleAction} from "../core/action";
import {DesignRevision} from "../design/DesignRevision";
import {Library} from "../module/Library";
import ConnectionController from "./ConnectionController";
import {CONNECTION_COMPLETE, ConnectionCompleteEvent, ON_OPTIONS_SET, ProvideOptionsSetEvent} from "./events";
import errorHandler from "../controller/ErrorHandler";
import {ConnectionResource, ExplicitRequireNoConnectionResource} from "./api";
import {ServerID} from "../model/types";
import {PlacedModuleResource} from "../placedmodule/api";
import {RequireFilterResource} from "../bus/api";
import {LoadProvidesEvent, PROVIDERS_LOADED, PROVIDERS_LOADING} from "../module/events";
import eventDispatcher from 'utils/events';
import events from "utils/events";

/**
 * When the user clicks on a require bus in order to connect it.
 */
export class StartConnection implements Action {

    constructor(private readonly requireBus: RequireBus) {
    }

    private get designRev(): DesignRevision {
        return this.requireBus.designRevision;
    }

    execute(): void {
        this.designRev.resetConnectingModules();
        this.setOptions();
        this.loadProviders();
    }

    private loadProviders(): void {
        eventDispatcher.publishEvent(PROVIDERS_LOADING);
        // modules that can provide for `this.requireBus`
        const providers = new Library();
        const query_params: RequireFilterResource = {
            require: this.requireBus.id,
            amount: this.requireBus.getPowerDraw()
        };

        if (this.requireBus.needsVlogicPower()) {
            // TODO: send milliwatts required instead of boolean?
            query_params.needs_vlogic_provide = true;
        }
        if (this.requireBus.isPower()) {
            providers.sortPowerModulesFirst();
        }
        providers.fetch({
            data: query_params
        })
            .done(() => {
                // The require to connect could have changed after this loads.
                if (this.requireBus === ConnectionController.getRequireToConnect()) {
                    // TODO not a clean way to refer to a particular Panel from here.
                    eventDispatcher.publishEvent(PROVIDERS_LOADED, {
                        library: providers
                    } as LoadProvidesEvent);
                }
            })
            .fail(errorHandler.onFail);
    }

    /**
     * Inform all placed modules about which provide buses this bus can
     * connect to. This will be used for displaying the provide bus menus.
     */
    private setOptions(): void {
        const options = this.requireBus.getOptions();
        for (const pm_uuid in options) {
            const provides = options[pm_uuid];
            for (const provideBus of provides) {
                this.requireBus.setProvidePriority(provideBus);
            }
            const pm = this.designRev.getPlacedModuleByUuid(pm_uuid);
            pm.setOptions(provides);
        }

        events.publish(ON_OPTIONS_SET, {
            placedModuleIds: Object.keys(options),
            hasTooManyOptions: this.isTooManyOptions(options),
            requireName: this.requireBus.name,
        } as ProvideOptionsSetEvent);

        //let PlacedMouleView check if the selected bus is connected, in order to change the selection colour
        events.publish(SELECTED_REQUIRE_CONNECTION, this.requireBus.isConnected());
    }

    private isTooManyOptions(options: {[uuid: string]: ProvideBus[]}): boolean {
        const pmUuids = Object.keys(options);
        if (pmUuids.length === 0) {
            return false;
        }
        const numProvides = pmUuids.map(uuid => options[uuid].length).reduce((a, c) => a + c);
        // Though this figure was chosen somewhat arbitrarily, the idea is that "too many" is sufficiently uncommon.
        return pmUuids.length >= 5 && numProvides >= Math.ceil(pmUuids.length * 1.5);
    }
}

/**
 * Complete a connection or disconnection between a require bus and provide bus.
 */
export class FinishConnection implements ReversibleAction {
    private readonly designRevision: DesignRevision;

    /** Data used to find the provide bus*/
    private newProvidePmResource: PlacedModuleResource;
    private newProvideBusId: ServerID;

    /** Data used to find the require bus*/
    private requirePmResource: PlacedModuleResource;
    private requireBusId: ServerID;

    private readonly provideBusName: string;
    private readonly requireBusName: string;

    private oldConnectionResources: ConnectionResource[] = [];
    private oldNoConnectionResources: ExplicitRequireNoConnectionResource[] = [];

    private isDisconnect: boolean;

    constructor(newProvideBus: ProvideBus, requireBus: RequireBus) {
        this.designRevision =  newProvideBus.designRevision;

        this.newProvidePmResource = newProvideBus.getPlacedModule().toResource();
        this.newProvideBusId = newProvideBus.getId();

        this.requirePmResource = requireBus.getPlacedModule().toResource();
        this.requireBusId = requireBus.getId();
        this.provideBusName = newProvideBus.name;
        this.requireBusName = requireBus.name;
    }

    static addToStack(provideBus: ProvideBus, requireBus: RequireBus): void {
        executeAction(new FinishConnection(provideBus, requireBus));
    }

    public get log(): string {
        if (this.isDisconnect) {
            return `Disconnect ${this.requireBusName} from ${this.provideBusName}`;
        }
        return `Connect ${this.requireBusName} to ${this.provideBusName}`;
    }

    /**
     * The new provide bus to connect.
     */
    private get newProvideBus(): ProvideBus {
        return this.designRevision
            .getPlacedModuleByUuid(this.newProvidePmResource.uuid)
            .getProvideById(this.newProvideBusId);
    }

    /**
     * The require bus to connect.
     */
    private findRequireBus(): RequireBus | undefined {
        return this.designRevision
            .getPlacedModuleByUuid(this.requirePmResource.uuid)
            .getRequireById(this.requireBusId);
    }

    execute(): void {
        this.oldConnectionResources = [];
        this.oldNoConnectionResources = [];

        const requireBus = this.findRequireBus();
        const oldConnection = requireBus.getConnection();
        if (oldConnection) {
            this.oldConnectionResources.push(oldConnection.toResource());
        }
        const oldNoConnection = requireBus.getNoConnection();
        if (oldNoConnection) {
            this.oldNoConnectionResources.push(oldNoConnection.toResource());
        }

        requireBus.getExclusions().forEach(exclusion => {
            const exclusionConnection = exclusion.getConnection();
            if (exclusionConnection) {
                this.oldConnectionResources.push(exclusionConnection.toResource());
            }
            const exclusionNoConnection = exclusion.getNoConnection();
            if (exclusionNoConnection) {
                this.oldNoConnectionResources.push(exclusionNoConnection.toResource());
            }
        });

        // The previously connected provide bus.
        const oldProvideBus = requireBus.getConnectedProvide();

        requireBus.disconnect();
        requireBus.unsetNoConnect();

        if (oldProvideBus !== this.newProvideBus) {
            // We're establishing a new connection.
            // DesignRevision.addConnectionFromBuses() -> RequireBus.connect()
            // will disconnect and unset NC for all exclusions.
            this.designRevision.addConnectionFromBuses(requireBus, this.newProvideBus);
        } else {
            this.isDisconnect = true;
        }
        this.finish(requireBus);
    }

    reverse(): void {
        const requireBus = this.findRequireBus();
        if (requireBus) {
            requireBus.disconnect();
            requireBus.unsetNoConnect();
        }
        if (this.oldConnectionResources.length) {
            this.designRevision.addConnectionsFromResources(this.oldConnectionResources);
        } else {
            this.designRevision.computePathIntersections();
        }
        if (this.oldNoConnectionResources.length) {
            this.designRevision.addNoConnectionsFromResources(this.oldNoConnectionResources);
        }
        this.finish(requireBus);
    }

    private finish(requireBus: RequireBus): void {
        requireBus.autoConnectVlogicPower();
        this.designRevision.recomputeFromConnections();
        events.publishEvent(CONNECTION_COMPLETE, {
            require: requireBus
        } as ConnectionCompleteEvent);
    }
}

export class AddNoConnection implements ReversibleAction {
    private readonly requirerResource: PlacedModuleResource;
    private readonly requireBusIds: ServerID[];
    private readonly designRevision: DesignRevision;

    private noConnectionResources: ExplicitRequireNoConnectionResource[] = [];

    private oldConnectionResources: ConnectionResource[] = [];
    private oldNoConnectionResources: ExplicitRequireNoConnectionResource[] = [];

    private isUnset: boolean = false;


    public static fromSelectRequireEvent(event: SelectRequireEvent): AddNoConnection {
        return new AddNoConnection([event.model]);
    }

    public static fromSelectExclusionSetEvent(event: SelectExclusionSetEvent): AddNoConnection {
        return new AddNoConnection(event.model.models);
    }

    constructor(private requireBuses: RequireBus[]) {
        console.assert(requireBuses.length > 0);
        const requirer = this.requireBuses[0].getPlacedModule();

        this.requirerResource = requirer.toResource();
        this.designRevision =  requirer.designRevision;
        this.requireBusIds = requireBuses.map(bus => {
            console.assert(bus.getPlacedModule() === requirer);
            return bus.getId();
        });
    }

    private findRequireBus(id: ServerID): RequireBus | undefined {
        return this.designRevision
            .getPlacedModuleByUuid(this.requirerResource.uuid)
            .getRequireById(id);
    }

    public get log(): string {
        const noConnectionResources = this.isUnset ? this.oldNoConnectionResources: this.noConnectionResources;

        const requiresStrArr = noConnectionResources.map(resource => resource.require_bus_name);
        let requiresStr = '';
        if (requiresStrArr.length === 1) {
            requiresStr = requiresStrArr[0];
        } else if (requiresStrArr.length === 2) {
            requiresStr = requiresStrArr.join(', and ');
        } else if (requiresStrArr.length > 2) {
            requiresStr = requiresStrArr.slice(0, -1).join(', ') + ', and ' + requiresStrArr.slice(-1);
        }
        return this.isUnset ? `Unset NC for ${requiresStr}` : `Set NC for ${requiresStr}`;
    }

    execute(): void {
        const requireBusIds = this.requireBusIds;
        this.oldConnectionResources = [];
        this.noConnectionResources = [];
        requireBusIds.forEach(requireBusId => {
            const requireBus = this.findRequireBus(requireBusId);
            const oldConnection = requireBus.getConnection();
            if (oldConnection) {
                this.oldConnectionResources.push(oldConnection.toResource());
            }
            const oldNoConnection = requireBus.getNoConnection();
            if (oldNoConnection) {
                this.oldNoConnectionResources.push(oldNoConnection.toResource());
            }

            requireBus.disconnect();
            requireBus.unsetNoConnect();

            if (!oldNoConnection) {
                const noConnection = this.designRevision.addNoConnection(requireBus);
                this.noConnectionResources.push(noConnection.toResource());
            } else {
                this.isUnset = true;
            }
        });
        this.finish();
    }

    private finish() {
        const requireBusIds = this.requireBusIds;
        requireBusIds.forEach(requireBusId => {
            const requireBus = this.findRequireBus(requireBusId);
            if (requireBus) {
                requireBus.autoConnectVlogicPower();
            }
        });
        this.designRevision.recomputeFromConnections();
        ConnectionController.clearRequireToConnect();
    }

    reverse(): void {
        const requireBusIds = this.requireBusIds;
        requireBusIds.forEach(requireBusId => {
            const requireBus = this.findRequireBus(requireBusId);
            requireBus.unsetNoConnect();
        });
        if (this.oldConnectionResources.length) {
            this.designRevision.addConnectionsFromResources(this.oldConnectionResources);
        }
        if (this.oldNoConnectionResources.length) {
            this.designRevision.addNoConnectionsFromResources(this.oldNoConnectionResources);
        }
        this.finish();
    }
}
