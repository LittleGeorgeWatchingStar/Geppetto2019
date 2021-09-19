import {ServerGateway} from "../../core/ServerGateway";
import {ModuleResource} from "../../module/api";

/**
 * Data returned by the server when requesting a module recommendation.
 */
export interface ModuleRecommendationResource {
    modules: ModuleResource[];
    warning: string;
}

class DesignRecommendationsGateway extends ServerGateway {

    /**
     * Modules that should be added to a design in general.
     */
    getModuleRecommendations(): JQuery.jqXHR<ModuleRecommendationResource[]> {
        return this.get('/api/v3/user-design-recommendations/modules/');
    }
}

let moduleRecommendations = null;

export function getModuleRecommendations(): PromiseLike<ModuleRecommendationResource[]> {
    if (!moduleRecommendations) {
        return new DesignRecommendationsGateway().getModuleRecommendations().then(
            recommendations => moduleRecommendations = recommendations
        );
    }
    return Promise.resolve(moduleRecommendations);
}
