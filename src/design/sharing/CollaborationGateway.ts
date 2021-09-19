import {CollaborationResource, DesignShareEmailResource, UpdateCollaborationResource} from "./api";
import {ServerGateway} from "../../core/ServerGateway";
import {Collaboration} from "./Collaboration";
import {ServerID} from "../../model/types";

/**
 * Interface for typehinting.
 */
export interface CollaborationGateway {
    saveCollaborations(resource: DesignShareEmailResource, design_id: ServerID): JQuery.jqXHR<CollaborationResource[]>;

    sendEmail(resource: DesignShareEmailResource, design_id: ServerID): JQuery.jqXHR<CollaborationResource[]>;

    getCollaborations(design_id: ServerID): JQuery.jqXHR<Collaboration[]>;

    updateCollaborations(design_id: ServerID, resource: UpdateCollaborationResource): JQuery.jqXHR;

    getPermission(design_id: ServerID): JQuery.jqXHR;
}

class DefaultGateway extends ServerGateway implements CollaborationGateway {
    /**
     * Attempts to send emails to collaborators and save them.
     */
    public saveCollaborations(resource: DesignShareEmailResource,
                              design_id: ServerID): JQuery.jqXHR<CollaborationResource[]> {
        return this.post(`/api/v3/design/share/${design_id.toString()}/`, resource);
    }

    /**
     * Only sends emails, ie. to already-existing collaborators.
     */
    public sendEmail(resource: DesignShareEmailResource,
                     design_id: ServerID): JQuery.jqXHR<CollaborationResource[]> {
        return this.post(`/api/v3/design/share/email/${design_id.toString()}/`, resource);
    }

    public getCollaborations(design_id: ServerID): JQuery.jqXHR<Collaboration[]> {
        return this.get(`/api/v3/design/share/${design_id.toString()}/`)
            .then(results => results.map(
                result => new Collaboration(result)
            )) as JQuery.jqXHR<Collaboration[]>;
    }

    public updateCollaborations(design_id: ServerID, resource: UpdateCollaborationResource): JQuery.jqXHR {
        return this.patch(`/api/v3/design/share/${design_id.toString()}/`, resource);
    }

    public getPermission(design_id: ServerID): JQuery.jqXHR {
        return this.get(`api/v3/design/share/permission/${design_id.toString()}/`);
    }
}

export function getCollaborationGateway(): CollaborationGateway {
    return new DefaultGateway();
}
