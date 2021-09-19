import {ServerID} from "../../../model/types";

export interface CadSource {
    id: ServerID,
    type: CadSourceType;
    parameters: { [key: string]: string };
    urls: {
        view: string;
        edit: string;
    };
}

export enum CadSourceType {
    EAGLE_SRC_REPO = 'eagle_src_repo',
    UPVERTER_PROJECT = 'upverter_project',
}
