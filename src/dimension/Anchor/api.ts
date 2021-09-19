import {ServerID} from "../../model/types";
import {FeatureResource} from "../../module/feature/api";

export interface AnchorResource {
    type: string;

    module?: ServerID;
    module_uuid?: string;
    feature?: FeatureResource;

    logo?: ServerID;
    logo_uuid?: string;
    edge?: string;
}