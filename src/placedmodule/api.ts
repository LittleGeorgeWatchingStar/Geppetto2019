import {DesignRevision} from "../design/DesignRevision";
import {Module} from "../module/Module";
import {ServerID} from "../model/types";
import {BomChoiceResource} from "../module/BomOption/api";


/**
 * What a placed module looks like when exported by the server.
 */
export interface PlacedModuleResource  {
    id?: ServerID;
    uuid: string;
    module_id: ServerID;
    module_revision: ServerID;

    revision_no: number;
    module_name: string;

    x: number;
    y: number;
    rotation: number;
    custom_name: string;
    choices: BomChoiceResource[];

    /* Added by GWeb */
    module?: Module;
    design_revision?: DesignRevision;
}
