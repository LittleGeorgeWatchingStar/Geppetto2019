import {DesignRevision} from "../DesignRevision";
import {ProvideBus} from "../../bus/ProvideBus";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {Bus} from "../../bus/Bus";
import {ModuleRecommendationResource} from "./DesignRecommendationsGateway";
import {createMapFromList} from "../../module/helpers";
import {ServerID} from "../../model/types";

/**
 * In this file: optional design recommendations that replace string suggestions queried from the back-end,
 * so that the Design Helper can update suggestions as the user works on his design.
 * Some of these are meant to be removed when validations become data-driven.
 */

/**
 * A board corner radius below this threshold (in Geppetto units) is considered
 * possibly unintentional by the user.
 */
export const MIN_CORNER_RADIUS = 10;

export function filterUnconnectedConsolePorts(design: DesignRevision): ProvideBus[] {
    const isConsolePort = bus => bus.getPriorities().some(p => p.group.name.toLowerCase().includes('system console'));
    return findProvides(design, isConsolePort);
}

export function filterUnconnectedReset(design: DesignRevision): ProvideBus[] {
    const containsReset = str => str.toLowerCase().includes('reset');
    const isReset = bus => containsReset(bus.name) && bus.templates.some(t => containsReset(t.name));
    return findProvides(design, isReset);
}

function findProvides(design: DesignRevision,
                      condition: (bus: Bus) => boolean): ProvideBus[] {
    function isAlreadyRecommended(bus: Bus): boolean {
        return bus.placedModule.recommendedBuses.some(recommendation =>
            recommendation.provide_bus_ids.some(id => id === bus.id)
        );
    }
    const buses = [];
    for (const pm of design.getPlacedModules()) {
        for (const bus of pm.getProvides()) {
            if (bus.hasGraphChildren() || isAlreadyRecommended(bus)) {
                continue;
            }
            if (condition(bus)) {
                buses.push(bus);
            }
        }
    }
    return buses;
}

/**
 * True if:
 * 1) the PM has all unconnected requires,
 * 2) AND has at least one provide bus, all of which are unconnected.
 */
export function filterRedundantModules(design: DesignRevision): PlacedModule[] {
    return design.getPlacedModules().filter(pm =>
        pm.getRequires().every(bus => !bus.isConnected()) &&
        pm.getProvides().length > 0 && pm.getProvides().every(bus => !bus.hasGraphChildren())
    );
}

/**
 * Returns unfulfilled module recommendations.
 * TODO the module recommendations are really a global state of some sort
 */
export function filterModuleRecommendations(design: DesignRevision,
                                            moduleRecommendations: ModuleRecommendationResource[]): ModuleRecommendationResource[] {
    const pmMap = createMapFromList(design.getPlacedModules(), pm => pm.moduleId);
    const unfulfilled = (r: ModuleRecommendationResource) => r.modules.every(m => !pmMap[m.module_id]);
    return moduleRecommendations.filter(unfulfilled);
}

/**
 * True if 0 < corner radius < MIN
 */
export function isSuspiciousCornerRadius(design: DesignRevision): boolean {
    const cornerRadius = design.board.getCornerRadius();
    return cornerRadius > 0 && cornerRadius < MIN_CORNER_RADIUS;
}

/**
 * Warns users against connecting more than one regulator with the same
 * output to the same power provider.
 *
 * @return PlacedModules grouped by the same provider CID
 */
export function findDuplicatePower(design: DesignRevision): {[moduleCid: string]: PlacedModule[]} {

    function addToGroup(map: Object, group: ServerID, item: any) {
        if (!map[group]) {
            map[group] = [];
        }
        map[group].push(item);
    }

    // Same output in this case means the modules implement the same BusTemplate.
    const sameOutputMap = (function() {
        const modulesGroupedByOutput = {} as {[busTemplateId: number]: PlacedModule[]};
        for (const pm of design.getPlacedModules()) {
            if (!pm.module.isPowerModule) {
                continue;
            }
            for (const bus of pm.getProvides()) {
                if (!bus.isPower() || bus.implementsVlogicTemplate()) {
                    continue;
                }
                for (const template of bus.templates) {
                    if (template.power) {
                        addToGroup(modulesGroupedByOutput, template.id, pm);
                    }
                }
            }
        }
        return modulesGroupedByOutput;
    }());

    // Given modules with the same output, find those with the same power module provider.
    const sameInputMap = (function() {
        const modulesGroupedByInput = {};
        for (const templateId of Object.keys(sameOutputMap)) {
            if (sameOutputMap[templateId].length === 1) {
                continue;
            }
            for (const pm of sameOutputMap[templateId]) {
                for (const require of pm.getRequires()) {
                    const connectedProvide = require.getConnectedProvide();
                    if (connectedProvide && require.isPower() && !require.implementsVlogicTemplate()) {
                        const cid = connectedProvide.placedModule.cid;
                        addToGroup(modulesGroupedByInput, cid, pm);
                    }
                }
            }
        }
        return modulesGroupedByInput;
    }());

    for (const moduleCid of Object.keys(sameInputMap)) {
        if (sameInputMap[moduleCid].length === 1) {
            delete(sameInputMap[moduleCid]);
        }
    }
    return sameInputMap;
}
