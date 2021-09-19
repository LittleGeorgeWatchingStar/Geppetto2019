import {ServerGateway} from "../../core/ServerGateway";
import {BusTemplate} from "./BusTemplate";

export interface BusTemplateGateway {
    getBusTemplates(): JQuery.jqXHR<BusTemplate[]>;
}

class DefaultGateway extends ServerGateway implements BusTemplateGateway {
    public getBusTemplates(): JQuery.jqXHR<BusTemplate[]> {
        return this.get('/api/v3/module/assignable-bustemplates/')
            .then(results => results.map(result => new BusTemplate(result))) as JQuery.jqXHR<BusTemplate[]>;
    }
}

class ExpandedGateway extends ServerGateway implements BusTemplateGateway {
    public getBusTemplates(): JQuery.jqXHR<BusTemplate[]> {
        return this.get('/api/v3/module/bustemplates/')
            .then(results => results.map(result => new BusTemplate(result))) as JQuery.jqXHR<BusTemplate[]>;
    }
}

export function getBusTemplateGateway(): BusTemplateGateway {
    return new DefaultGateway();
}

export function getExpandedBusTemplateGateway(): BusTemplateGateway {
    return new ExpandedGateway();
}
