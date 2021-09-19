import {ServerID} from "../model/types";
import {FeatureFlag} from "./FeatureFlag";

export interface UserResource {
    id: ServerID;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    groups: AuthGroup[];
    feature_flags: FeatureFlag[];
}

export interface AuthGroup {
    id: ServerID;
    name: string;
}
