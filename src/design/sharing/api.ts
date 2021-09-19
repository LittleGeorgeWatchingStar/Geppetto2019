import {ServerID} from "../../model/types";

export interface CollaborationResource {
    collaboration_name: string,
    collaboration_email: string,
    permission: string,
    date: string
}

export interface DesignShareEmailResource {
    message: string,
    collaborations: CollaborationResource[]
}

export interface UpdateCollaborationResource {
    collaborations: CollaborationResource[]
}