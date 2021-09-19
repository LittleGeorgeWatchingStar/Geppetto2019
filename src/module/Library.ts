import * as Backbone from 'backbone';
import {Module} from 'module/Module';
import {ServerID} from "../model/types";

/**
 * The Library is the collection of modules that are available for use.
 */
export class Library extends Backbone.Collection<Module> {

    get model() {
        return Module;
    }

    get url() {
        return '/api/v3/module/library/';
    }

    /**
     * Cache modules which have been accessed via moduleId lookup.
     */
    private moduleIdMap: { moduleId: Module };

    initialize(): void {
        this.comparator = this.defaultComparator;
        this.moduleIdMap = {} as { moduleId: Module };
    }

    public findByRevisionId(id: ServerID): Module | undefined {
        return this.find(m => m.getRevisionId().toString() === id.toString());
    }

    public findByModuleId(id: ServerID): Module | undefined {
        if (this.moduleIdMap[id]) {
            return this.moduleIdMap[id];
        }
        const result = this.find(m => m.moduleId.toString() === id.toString());
        if (result) {
            this.moduleIdMap[id] = result;
            return result;
        }
    }

    /**
     * Other modules that are in the same functional group as a given module,
     * but not the given module itself.
     */
    public filterByFunctionalGroup(module: Module): Module[] {
        return this.filter(m => {
            return module.moduleId !== m.moduleId
                && m.isFunctionalGroup(module.functionalGroup);
        });
    }

    /**
     * Only those modules that are visible to the given user.
     * TODO isn't this already handled by the backend?
     */
    public filterVisibleTo(user): Module[] {
        return this.filter(
            module => module.isVisibleToUser(user)
        );
    }

    /**
     * Modules whose title contains the substring `word`.
     */
    public filterBy(word: string): Module[] {
        if (!word) {
            return this.models.slice();
        }
        const pattern = word.toLowerCase();
        return this.filter(
            module => module.getTitle().toLowerCase().replace(/[\s)(-]+/g, '').indexOf(pattern) > -1);
    }

    /**
     * The default sort order of the library is by category title so that
     * the categories appear in alphabetical order.
     */
    get defaultComparator() {
        return module => module.categoryName + module.name;
    }

    /**
     * Changes the comparator so that any power modules added to the collection
     * will be put first.
     */
    public sortPowerModulesFirst() {
        this.comparator = module => {
            const prefix = module.isPowerModule ? 'a' : 'b';
            return prefix + module.categoryName + module.name;
        };
    }
}
