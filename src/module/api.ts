import {FeatureResource} from "./feature/api";
import {ServerID, Url} from "../model/types";
import {Category} from "./Category";
import {Vector2D} from "../utils/geometry";
import {BomOptionResource} from "./BomOption/api";

/**
 * The module data struct exported by the server API.
 */
export interface ModuleResource {
    is_summary: boolean;
    module_id: ServerID;
    revision_id: ServerID;
    revision_no: number;
    name: string;
    summary: string;
    description: string;
    category: Category;
    functional_group: ServerID | undefined;
    functional_group_name: string | undefined;
    features: FeatureResource[];
    marketing: MarketingFeature[];
    price: number;
    dev: boolean;
    stable: boolean;
    enabled: boolean;
    expired: boolean;
    pin_points: PinPointResource[];
    bom_options: BomOptionResource[];
    created: string;
    launch: string | undefined;
    is_customer_module: boolean;

    /** "Detailed" Module only field: */
    recommended_buses: BusRecommendationResource[];
}

/**
 * Server data for a recommendation that certain provide buses be connected.
 */
export interface BusRecommendationResource {
    /**
     * The IDs of the provide buses on the module that should be fulfilled.
     * Fulfilling any one of the provides will satisfy the recommendation.
     * TODO maybe an extra check to see if the user picked one of the suggested modules?
     */
    provide_bus_ids: ServerID[];
    suggested_module_ids: ServerID[];
    warning: string;
}

export interface MarketingFeature {
    name: string;
    value: string;
    description: string;
    image_uri: Url;
}


/**
 * Display and label the location of a module's pin.
 */
export interface PinPointResource {
    id: string;
    net_name: string;
    position: Vector2D;
}
