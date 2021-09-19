import {Module} from "./Module";

/**
 * Organize modules by category name.
 */
export function categorizeModules(modules: Module[]): { [moduleCategory: string]: Module[] } {
    const categories = {};
    for (const module of modules) {
        if (!categories[module.categoryName]) {
            categories[module.categoryName] = [];
        }
        categories[module.categoryName].push(module);
    }
    return categories;
}

/**
 * Find if there's a difference in two lists of modules.
 */
export function compareModuleLists(a: Module[], b: Module[]): boolean {
    return a.length !== b.length || a.every((m, i) => m.id === b[i].id);
}

/**
 * Convert a list of items to a key: value map, where the
 * key is a property of the item (eg. an ID), and value is the item.
 */
export function createMapFromList<T>(list: T[],
                                     getKey: (item: T) => string | number): {[key: string]: T} | {[key: number]: T} {
    const map = {};
    list.forEach(item => map[getKey(item)] = item);
    return map;
}
