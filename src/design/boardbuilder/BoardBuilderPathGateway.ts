import {ServerGateway} from "../../core/ServerGateway";

export interface BoardBuilderConfigGateway {
    getConfigurationForPath(path: string): JQuery.jqXHR<BoardBuilderConfig>;
}

class BoardBuilderProfileGateway extends ServerGateway implements BoardBuilderConfigGateway{
    getConfigurationForPath(path: string): JQuery.jqXHR<BoardBuilderConfig> {
        return this.get(`/api/v3/marketing/boardbuilder/${path}/`);
    }
}

/**
 * What the result of a board builder path query looks like.
 */
export interface BoardBuilderConfig {

    /**
     * List of modules not to be included in the suggestions.
     */
    excluded_module_ids: string[];

    /**
     * Defines a subset of modules in the BoardBuilder. Note: BoardBuilderCategoryData != Category.
     */
    categories: BoardBuilderCategoryData[]
}

/**
 * Represents a subset of Modules in the Board Builder. The Modules that appear in the category
 * are determined by the Module Categories and Functional Groups selected by the administrator.
 */
export interface BoardBuilderCategoryData {
    position: number;
    name: string;

    /**
     * The following lists contain IDs.
     */
    module_categories: string[];
    functional_groups: string[];
    suggested_modules: string[];
    preselected_modules: string[];

    is_locked: boolean;
}

export function getBoardBuilderProfileGateway(): BoardBuilderProfileGateway {
    return new BoardBuilderProfileGateway();
}
