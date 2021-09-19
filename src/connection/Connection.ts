import GeppettoModel from "model/GeppettoModel";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Point} from "../utils/geometry";
import {PathSpec} from "./PathSpec";
import {ConnectionPathResource, ConnectionResource} from "./api";
import {ConnectionPath} from "./ConnectionPath";

interface ConnectionAttributes {
    require: RequireBus;
    provide: ProvideBus;
}

/**
 * A connection between a provide bus and a require bus.
 */
export class Connection extends GeppettoModel {

    private require: RequireBus;
    private provide: ProvideBus;
    public path: ConnectionPath | null;
    // Used to Cache the path resource when a design rev is loaded from the
    // server, so that the design revision can initialize the path resources.
    private pathResource: ConnectionPathResource | undefined;

    constructor(attributes: ConnectionAttributes) {
        super(attributes);
        this.require = attributes.require;
        this.provide = attributes.provide;
    }

    public get requireBus(): RequireBus {
        return this.require;
    }

    public get provideBus(): ProvideBus {
        return this.provide;
    }

    /**
     * This only gets called as a response to the require bus disconnecting
     * @see RequireBus.disconnect()
     */
    public disconnect() {
        this.provide.disconnectRequire(this.require);
        this.require.designRevision.removeConnection(this);
    }

    public toJSON() {
        return {
            provider: this.provide.getPlacedModuleUuid(),
            provide_bus: this.provide.getId(),
            requirer: this.require.getPlacedModuleUuid(),
            require_bus: this.require.getId(),
            path: this.path ? this.path.toJSON() : null,
        };
    }

    public toResource(): ConnectionResource {
        return {
            id: this.id,
            provider_uuid: this.provide.getPlacedModuleUuid(),
            provide_bus: this.provide.getId(),
            provide_bus_name: this.provide.name,
            requirer_uuid: this.require.getPlacedModuleUuid(),
            require_bus: this.require.getId(),
            require_bus_name: this.require.name,
            path: this.path ? this.path.toResource() : null,
        };
    }

    public get requirer(): PlacedModule {
        return this.require.getPlacedModule();
    }

    /**
     * True if the given module is the requirer of this connection.
     */
    public isTo(requirer: PlacedModule): boolean {
        return this.requirer.equals(requirer);
    }

    public get powerDraw(): number {
        return this.require.getPowerDraw();
    }

    public get requirerOverhead(): number {
        return this.powerDraw - this.requirer.downstreamPowerDraw;
    }

    public get downstreamPowerConnections(): Connection[] {
        return this.requirer.downstreamPowerConnections;
    }

    /**
     * True if the given module is the provider of this connection.
     */
    public isFrom(provider: PlacedModule): boolean {
        return this.provider.equals(provider);
    }

    /**
     * True if this is a power (not data) connection.
     */
    public get isPower(): boolean {
        return this.provide.isPower();
    }

    /**
     * True if this is a VLOGIC connection.
     */
    public get isVlogic(): boolean {
        return this.provide.implementsVlogicTemplate();
    }

    public get provider(): PlacedModule {
        return this.provide.getPlacedModule();
    }

    public get requirerName(): string {
        return this.requirer.customName;
    }

    public get providerName(): string {
        return this.provider.name;
    }

    public setOverlaps(overlaps: boolean): void {
        this.requirer.setOverlaps(overlaps);
        this.provider.setOverlaps(overlaps);
    }

    /**
     * Return true if placed module is one of the two connections.
     */
    public includes(placedModule: PlacedModule): boolean {
        return this.requirer.cid === placedModule.cid
            || this.provider.cid === placedModule.cid;
    }

    public toString(): string {
        return `${this.provide.name} -> ${this.require.name}`;
    }

    public setResourcePath(resource: ConnectionPathResource) {
        this.pathResource = resource;
    }

    public getResourcePath(): ConnectionPathResource | undefined {
        return this.pathResource;
    }

    public requiresPathConstraint(): boolean {
        return this.pathSpec !== null &&
            this.startPoint !== null &&
            this.endPoint !== null;
    }

    public get pathSpec(): PathSpec | null {
        /* It doesn't matter which we use, provide vs require, because they
         * are the same bus template, and therefore the same spec. */
        return this.provide.pathSpec;
    }

    public get startPoint(): Point | null {
        return this.require.placedProximityPoint;
    }

    public get endPoint(): Point | null {
        return this.provide.placedProximityPoint;
    }

    public isValid(): boolean {
        if (this.requiresPathConstraint() &&
            (!this.path || !this.path.isValid)) {
            return false;
        }
        return true;
    }
}

export function createConnection(attributes: ConnectionAttributes): Connection
{
    return new Connection(attributes);
}
