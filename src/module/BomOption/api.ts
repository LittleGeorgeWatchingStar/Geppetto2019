import {Money, ServerID, Url} from "../../model/types";

/**
 * What BoM option data looks like coming from the server as a property of a module.
 */
export interface BomOptionResource {
    id: ServerID;
    description: string;
    default_choice_label: string;
    has_different_model: string;
    choices: BomChoiceResource[];
}

export interface BomChoiceResource {
    id: ServerID;
    option: ServerID; // The ID of the BomOptionResource to which it belongs.
    description: string;
    model_file: Url;
    change_in_price: Money;
    changes: BomChange[];
    ortho_image_url: string;
}

export interface BomChange {
    id: ServerID;
    ref_des: string;
    change_to: string;
}
