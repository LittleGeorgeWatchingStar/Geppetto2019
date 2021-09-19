import {ServerGateway} from "../core/ServerGateway";
import {ServerID} from "../model/types";
import {Design} from "./Design";
import {FetchDesignParams} from "./api";

export interface DesignGateway {
    getDesigns(params?: FetchDesignParams): JQuery.jqXHR<Design[]>;
    getDesign(id: ServerID): JQuery.jqXHR<Design>;
    deleteDesign(id: ServerID): JQuery.jqXHR<Design>;
}

class DefaultGateway extends ServerGateway implements DesignGateway {
    public getDesigns(params?: FetchDesignParams): JQuery.jqXHR<Design[]> {
        return this.get(`/api/v3/design/design/`, params)
            .then(results => results.map(result => new Design(result))) as JQuery.jqXHR<Design[]>;
    }

    public getDesign(id: ServerID): JQuery.jqXHR<Design> {
        return this.get(`/api/v3/design/design/${id}/`)
            .then(data => new Design(data)) as JQuery.jqXHR<Design>;
    }

    public deleteDesign(id: ServerID): JQuery.jqXHR {
        return this.delete(`/api/v3/design/design/${id}/`);
    }
}

export function getDesignGateway(): DesignGateway {
    return new DefaultGateway();
}
