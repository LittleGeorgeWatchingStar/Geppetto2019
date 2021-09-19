import {PlacedModule} from "../../placedmodule/PlacedModule";
import {SerializedConnection} from "./SerializedConnection";
import {BusMapper} from "../BusMapper";
import {ReconnectionLogger} from "../ConnectionMapper";

/**
 * Establishes connections from an array of serialized connections.
 */
export class SerializedConnector {

    private placedModule: PlacedModule;
    private serializedConnections: SerializedConnection[];
    private busMapper: BusMapper;
    private logger: ReconnectionLogger;

    constructor(pm: PlacedModule,
                serializedData: SerializedConnection[],
                logger: ReconnectionLogger = null) {
        this.placedModule = pm;
        this.serializedConnections = serializedData;
        this.busMapper = new BusMapper();
        this.logger = logger;
    }

    /**
     * Connect placedModule's connections from serializedConnections.
     */
    public connect(): void {
        this.placedModule.disconnect();
        for (const connection of this.serializedConnections) {
            // If placed_module is the provider
            if (this.placedModule.name === connection.from) {
                this.connectToMatchingRequirer(connection);
                // If placed_module is the requirer
            } else if (this.placedModule.name === connection.to) {
                this.connectToMatchingProvider(connection);
            }
        }
        const designRev = this.placedModule.designRevision;
        designRev.recomputeFromConnections();
    }

    private connectToMatchingRequirer(connection: SerializedConnection): void {
        const provideBus = this.placedModule.findProvide(p => p.name === connection.provide);
        if (!provideBus) {
            return;
        }
        let requireBus;
        for (const requirer of this.findPlacedModules(connection.to)) {
            requireBus = this.busMapper.matchRequire(requirer, connection.require, provideBus);
            if (requireBus) {
                this.placedModule.designRevision.connectPair(requireBus, provideBus);
                break;
            }
        }
        const original = `${connection.require} on ${connection.to}`;
        // Utilizing RequireBus.toString():
        this.addLogEntry(original, requireBus, provideBus.name);
    }

    private connectToMatchingProvider(connection: SerializedConnection): void {
        const requireBus = this.placedModule.findRequire(r => r.name === connection.require);
        if (!requireBus) {
            return;
        }
        let provideBus;
        for (const provider of this.findPlacedModules(connection.from)) {
            provideBus = this.busMapper.matchProvide(provider, connection.provide, requireBus);
            if (provideBus) {
                this.placedModule.designRevision.connectPair(requireBus, provideBus);
                break;
            }
        }
        const original = `${connection.provide} on ${connection.from}`;
        // Utilizing ProvideBus.toString():
        this.addLogEntry(original, provideBus, requireBus.name);
    }

    /**
     * Find other placed modules by name.
     */
    private findPlacedModules(name: string): PlacedModule[] {
        return this.placedModule.designRevision.getPlacedModules()
            .filter(pm => pm !== this.placedModule && pm.name === name);
    }

    private addLogEntry(placedModuleBus: string, otherBus: string | null, target: string): void {
        if (this.logger) {
            this.logger.addEntry(placedModuleBus, otherBus, target);
        }
    }
}