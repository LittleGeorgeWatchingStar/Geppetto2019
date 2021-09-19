import {
    filterModuleRecommendations,
    filterRedundantModules,
    filterUnconnectedConsolePorts,
    filterUnconnectedReset, findDuplicatePower
} from "../helper/DesignReview";
import {filterBusRecommendations} from "../helper/filterBusRecommendations";
import {ModuleRecommendationResource} from "../helper/DesignRecommendationsGateway";
import {DesignRevision} from "../DesignRevision";

export function generateDesignWarnings(design: DesignRevision,
                                       moduleRecommendationResources: ModuleRecommendationResource[]): string[] {

    const redundantModules = filterRedundantModules(design)
        .map(module => `${module.name} is not providing any functionality.`);

    const moduleRecommendations = filterModuleRecommendations(design, moduleRecommendationResources)
        .map(recommendation => recommendation.warning);

    const busRecommendations = filterBusRecommendations(design)
        .map(recommendation => recommendation.warning);

    const unconnectedReset = filterUnconnectedReset(design)
        .map(bus => `${bus.moduleName} has no reset button. Consider connecting a switch to ${bus.name}.`);

    const unconnectedConsolePort = filterUnconnectedConsolePorts(design)
        .map(bus => `${bus.name} on ${bus.moduleName} isn't connected, so you won't be able to view
            kernel debug messages. Consider connecting ${bus.name} to USB-UART.`);

    const duplicatePower = findDuplicatePower(design);
    const duplicatePowerWarnings = Object.keys(duplicatePower)
        .map(cid => `${duplicatePower[cid].map(power => power.name).join(', ')} have
                        the same output and are both connected to the same power source.
                        Consider replacing them for a single module with more capacity.`);

    return moduleRecommendations.concat(
        busRecommendations,
        unconnectedConsolePort,
        unconnectedReset,
        duplicatePowerWarnings,
        redundantModules
    );
}
