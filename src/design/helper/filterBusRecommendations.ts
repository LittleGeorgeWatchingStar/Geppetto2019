import {DesignRevision} from "../DesignRevision";
import {ProvideBus} from "../../bus/ProvideBus";
import {BusRecommendationResource} from "../../module/api";
import {ServerID} from "../../model/types";
import {createMapFromList} from "../../module/helpers";
import {PlacedModule} from "../../placedmodule/PlacedModule";

/**
 * For the provideBuses field, the ProvideBus type is used instead of ServerID because the current
 * power consumption is needed for querying compatible modules. Compare to:
 * @see BusRecommendationResource
 */
export interface BusRecommendation {
    provideBuses: ProvideBus[];
    warning: string;
    suggestedModuleIds: ServerID[];
    placedModule: PlacedModule;
}

export function filterBusRecommendations(design: DesignRevision): BusRecommendation[] {
    const unfulfilled = [];
    for (const pm of design.getPlacedModules()) {
        if (!pm.recommendedBuses || pm.recommendedBuses.length === 0) continue;
        const provideMap = createMapFromList(pm.getProvides(), provide => provide.id);
        const isConnected = id => {
            const provide = provideMap[id];
            return provide ? provide.hasGraphChildren() : false;
        }
        for (const recommendation of pm.recommendedBuses) {
            if (recommendation.provide_bus_ids.every(id => !isConnected(id))) {
                unfulfilled.push({
                    provideBuses: recommendation.provide_bus_ids.map(id => provideMap[id]),
                    warning: recommendation.warning,
                    suggestedModuleIds: recommendation.suggested_module_ids.slice(),
                    placedModule: pm
                });
            }
        }
    }
    return unfulfilled;
}
