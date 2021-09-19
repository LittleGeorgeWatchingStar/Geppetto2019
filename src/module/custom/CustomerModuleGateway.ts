import {ServerGateway} from "../../core/ServerGateway";
import {Module} from "../Module";
import {ServerID} from "../../model/types";
import {Design} from "../../design/Design";

export interface CustomerModuleCreateData {
    templateRevision: ServerID;
    name: string;
    description: string;
    requires: CustomerBusData[];
    provides: CustomerBusData[];
    groundNets: string[];
}

export interface CustomerBusData {
    name: string;
    busGroup: ServerID;
    nets: NetAssignmentData[],
    levels: string[];
    milliwatts: number,
}

export interface NetAssignmentData {
    signal: ServerID;
    value: string;
}

export interface CustomerModuleGateway {
    create(data: CustomerModuleCreateData): JQuery.jqXHR<Module>;
    deleteCustomizedModule(id: ServerID): JQuery.jqXHR<Design>;
}

class Gateway extends ServerGateway implements CustomerModuleGateway {
    public create(data: CustomerModuleCreateData): JQuery.jqXHR<Module> {
        return this.post('/api/v3/module/customermodules/', data)
            .then(data => new Module(data)) as JQuery.jqXHR<Module>;
    }

    public deleteCustomizedModule(id: ServerID): JQuery.jqXHR {
        return this.delete(`/api/v3/module/modules/${id}/`);
    }
}

export function getCustomerModuleGateway(): CustomerModuleGateway {
    return new Gateway();
}
