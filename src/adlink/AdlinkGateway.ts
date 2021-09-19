import {ServerGateway} from "../core/ServerGateway";

export interface AdlinkGateway {
    track(): JQuery.jqXHR;
}

class DefaultGateway extends ServerGateway implements AdlinkGateway {
    public track(): JQuery.jqXHR {
        return this.post('/api/v3/adlink/user/track/');
    }
}

export function getAdlinkGateway(): AdlinkGateway {
    return new DefaultGateway();
}