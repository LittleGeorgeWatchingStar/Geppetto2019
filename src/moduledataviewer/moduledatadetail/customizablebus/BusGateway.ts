import {BusResource} from "../../../bus/api";
import {ServerID} from "../../../model/types";
import {ServerGateway} from "../../../core/ServerGateway";

export interface BusPatchData {
    id: ServerID;
    name?: string;
    power?: boolean;
    numConnections?: number;
    milliwatts?: number;
    nets?: NetData[];
    busGroup?: ServerID;
}

export interface NetData {
    netTemplate: ServerID;
    value: string;
}

export interface RequireBusPatchData extends BusPatchData {
    efficiency?: number;
}

export interface ProvideBusPatchData extends BusPatchData {
}

export interface BusGateway {
    insert: (moduleId: ServerID, data: BusPatchData) => JQuery.jqXHR<BusResource>;
    update: (data: BusPatchData) => JQuery.jqXHR<BusResource>;
}

class RequireBusGateway extends ServerGateway implements BusGateway {
    private urlPath = '/api/v3/module/require-buses/';
    private revUrlPath = '/api/v3/module/revisions/';

    public insert(moduleId: ServerID, data: RequireBusPatchData): JQuery.jqXHR<BusResource> {
        return this.post(`${this.revUrlPath}${moduleId}/require-buses/?returnDataType=GWeb`, data)

    }

    public update(data: RequireBusPatchData): JQuery.jqXHR<BusResource> {
        return this.patch(`${this.urlPath}${data.id}/?returnDataType=GWeb`, data)
    }
}

class ProvideBusGateway extends ServerGateway implements BusGateway {
    private urlPath = '/api/v3/module/provide-buses/';
    private revUrlPath = '/api/v3/module/revisions/';

    public insert(moduleId: ServerID, data: ProvideBusPatchData): JQuery.jqXHR<BusResource> {
        return this.post(`${this.revUrlPath}${moduleId}/provide-buses/?returnDataType=GWeb`, data)
    }

    public update(data: ProvideBusPatchData): JQuery.jqXHR<BusResource> {
        return this.patch(`${this.urlPath}${data.id}/?returnDataType=GWeb`, data)
    }
}

export function getRequireBusGateway(): BusGateway {
    return new RequireBusGateway();
}

export function getProvideBusGateway(): BusGateway {
    return new ProvideBusGateway();
}