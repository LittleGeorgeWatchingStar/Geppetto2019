import {ServerID} from "../../../model/types";
import {BusGroupResource} from "../../../bus/api";
import {ServerGateway} from "../../../core/ServerGateway";

export interface VoltageDomainData {
    title: string;
    levels: string[];
}

export interface VoltageDomainGateway {
    insert: (moduleId: ServerID, data: VoltageDomainData) => JQuery.jqXHR<BusGroupResource>;
}

class Gateway extends ServerGateway implements VoltageDomainGateway {
    private urlPath = '/api/v3/module/bus-groups/';
    private revUrlPath = '/api/v3/module/revisions/';

    public insert(moduleId: ServerID, data: VoltageDomainData) {
        return this.post(`${this.revUrlPath}${moduleId}/bus-groups/`, data);
    }
}

export function getVoltageDomainGateway(): VoltageDomainGateway {
    return new Gateway();
}