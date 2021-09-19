/**
 * What dimensions look like coming from the server.
 */
import {AnchorResource} from "./Anchor/api";

export interface DimensionServerResource {
    anchor1: AnchorResource;
    anchor2: AnchorResource;
    locked: boolean;
    hidden: boolean;
}

export interface DimensionResource extends DimensionServerResource {
    uuid: string;
}