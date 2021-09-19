import {Module} from "../../module/Module";
import {BoardBuilderCategoryData} from "./BoardBuilderPathGateway";

export interface BoardBuilderCategory {
    name: string;
    position: number;
    isLocked: boolean;
    includedModules: Module[];
    suggestedModules: Module[];
    preselectedModules: Module[];
}

/**
 * Organize modules by BoardBuilder Category. The server BoardBuilderCategory data contains a list of IDs,
 * which are mapped to the actual Module objects here.
 */
export function makeBoardBuilderCategoryFromData(category: BoardBuilderCategoryData,
                                                 modules: Module[]): BoardBuilderCategory {
    const moduleCategoryIds = makeMap(category.module_categories);
    const functionalGroupIds = makeMap(category.functional_groups);
    const suggestedModuleIds = makeMap(category.suggested_modules);
    const preselectedModuleIds = makeMap(category.preselected_modules);

    // Include all modules is there are no module categories and no functional groups.
    const includeAllModules = !category.functional_groups.length && !category.module_categories.length;

    return {
        name: category.name,
        position: category.position,
        isLocked: category.is_locked,
        includedModules: modules.filter(module => {
            if (includeAllModules) {
                return true;
            }
            const fg = module.functionalGroup != null ? module.functionalGroup.toString() : null;
            return moduleCategoryIds[module.category.id.toString()] || functionalGroupIds[fg]
        }),
        suggestedModules: modules.filter(module => suggestedModuleIds[module.moduleId.toString()]),
        preselectedModules: modules.filter(module => preselectedModuleIds[module.moduleId.toString()])
    } as BoardBuilderCategory;
}

function makeMap(list: string[]) {
    const map = {};
    list.forEach(item => map[item] = true);
    return map;
}
