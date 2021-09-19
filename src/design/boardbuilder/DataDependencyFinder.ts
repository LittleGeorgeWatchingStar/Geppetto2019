import {BusResource, RequireFilterResource} from "../../bus/api";
import {Module} from "../../module/Module";
import {ModuleGateway} from "../../module/ModuleGateway";
import {ServerID} from "../../model/types";
import {DesignRevision} from "../DesignRevision";


/**
 * The return value of DataDependencyFinder.getCompatibility.
 */
export interface CompatibilityResults {
    compatible: { [requirerName: string]: Module[] }; // Require module name : providers
    incompatible: string[]; // Incompatible module names
}

/**
 * Given a list of modules, try to find their dependencies and providers that can fulfill them.
 *
 * 1) Fetch detailed module to get its requirements
 * 2) Fetch providers for those requirements
 * 3) Check if the reqs are already provided by existing modules
 *      a) Yes: provider is unnecessary
 *      b) No:
 *          1. If we have a COM, pick a non-COM provider:
 *             If there are no non-COM results, or the chosen provider has requirements
 *             that can't be fulfilled, then the original module is considered incompatible.
 *          2. If we don't have a COM, pick a COM provider. TODO can result in multiple COMs which is invalid
 */
export class DataDependencyFinder {

    /**
     * If we have discovered providers for a require before, cache the providers.
     */
    public readonly providerCache: { [requireId: number]: Module[] };

    private moduleGateway: ModuleGateway;

    constructor(moduleGateway: ModuleGateway,
                private readonly designRevision: DesignRevision) {
        this.moduleGateway = moduleGateway;
        this.providerCache = {};
    }

    /**
     * Given a list of modules, find providers that can cover their requirements.
     * @return 1) Module names mapped to their providers.
     *         2) Incompatible modules as per step 3b.
     */
    public async getCompatibility(modules: Module[]): Promise<CompatibilityResults> {
        const detailed = await this.fetchModuleDetails(modules);
        const placed = this.designRevision.getPlacedModules().map(pm => pm.module);
        const existingModules = detailed.concat(placed);

        const providesNeeded = {} as { requireId: Module[] };
        const incompatible = [];
        const COMorProcessorExists = existingModules.some(module => module.isCOMorProcessor);

        const sortByProvidesNeeded = (module: Module) => {
            const providesToAdd = {} as { requireId: Module[] };
            for (const req of module.requires) {
                if (req.power || this.isAlreadyProvided(req, module, existingModules)) {
                    continue;
                }
                const validProviders = this.getValidProviders(req, COMorProcessorExists);
                if (validProviders.length === 0) {
                    incompatible.push(module.name);
                    return;
                }
                providesToAdd[req.id] = validProviders;
            }
            Object.assign(providesNeeded, providesToAdd);
        };

        for (const module of detailed) {
            sortByProvidesNeeded(module);
        }

        if (Object.keys(providesNeeded).length === 0) {
            return {
                compatible: {},
                incompatible: incompatible
            } as CompatibilityResults;
        }

        const counter = new ProviderCounter(providesNeeded);
        const requirerMap: { [requirerName: string]: Module[] } = counter.getProvidesForModules(detailed);
        await this.fetch(this.serialize(requirerMap)); // Providers of providers

        for (const requirerName in requirerMap) {
            for (const provide of requirerMap[requirerName]) {
                const requires = provide.requires.filter(req => !req.power);
                const isIncompatible = !requires.every(req => this.isAlreadyProvided(req, provide, existingModules));
                if (isIncompatible) {
                    incompatible.push(requirerName);
                    delete(requirerMap[requirerName]);
                    break;
                }
            }
        }
        return {
            compatible: requirerMap,
            incompatible: incompatible
        } as CompatibilityResults;
    }

    private getValidProviders(req: BusResource, COMorProcessorExists: boolean) {
        const providers = this.providerCache[req.id];
        return providers.filter(provider => {
            if (COMorProcessorExists) {
                return !provider.isCOMorProcessor && this.isValidResult(provider);
            }
            return this.isValidResult(provider);
        });
    }

    private isValidResult(module: Module): boolean {
        return !module.isNC && !module.isDummyPower && module.isStable() && !module.isRestricted();
    }

    private isAlreadyProvided(require: BusResource,
                              requireParent: Module,
                              excluded: Module[]): boolean {
        const providers = this.providerCache[require.id];
        return providers.some(provider =>
            excluded.some(exclusive => exclusive.getId() === provider.getId()) &&
            provider.getId() !== requireParent.getId()
        );
    }

    private serialize(map: { [requirerName: string]: Module[] }): Module[] {
        let serialized = [];
        for (const key in map) {
            serialized = serialized.concat(map[key]);
        }
        return serialized;
    }

    /**
     * @param modules: Summary or detailed modules.
     */
    public async fetch(modules: Module[]): Promise<void> {
        const detailedModules = await this.fetchModuleDetails(modules);
        const requires = this.getDataRequires(detailedModules);
        return this.fetchProviders(requires) as Promise<void>;
    }

    /**
     * Fetch module details from the server, given a list of summary modules.
     * If there was nothing to update, return a Promise that resolves immediately.
     */
    public fetchModuleDetails(modules: Module[]): JQuery.jqXHR<Module[]> | Promise<Module[]> {
        const fetchNeeded = [];
        for (const module of modules) {
            if (module.isSummary && fetchNeeded.indexOf(module.getId) === -1) {
                fetchNeeded.push(module.getId());
            }
        }
        if (fetchNeeded.length === 0) {
            return Promise.resolve(modules);
        }
        return this.moduleGateway.getDetailedModules(fetchNeeded).then(detailedModules => {
            const detailMap = {};
            for (const module of detailedModules) {
                detailMap[module.getId()] = module;
            }
            for (const module of modules) {
                if (module.isSummary) {
                    module.set(detailMap[module.getId()].attributes);
                }
            }
            return modules;
        }) as JQuery.jqXHR<Module[]>;
    }

    /**
     * Fetch providers for requires, skipping duplicates or those that have already been cached.
     */
    private fetchProviders(requires: BusResource[]): JQuery.jqXHR<void> | Promise<void> {
        const fetchNeeded = [];
        for (const require of requires) {
            if (!this.providerCache[require.id]) {
                fetchNeeded.push({require: require.id} as RequireFilterResource);
            }
        }
        if (fetchNeeded.length === 0) {
            return Promise.resolve();
        }
        return this.moduleGateway.getProviders(fetchNeeded).then(summaryMap => {
            for (const key in summaryMap) {
                this.providerCache[key] = summaryMap[key];
            }
        }) as JQuery.jqXHR<void>;
    }

    /**
     * @param modules: Module[] to extract data requires from.
     */
    private getDataRequires(modules: Module[]): BusResource[] {
        const requires = [];
        for (const module of modules) {
            for (const require of module.requires) {
                if (!require.power) {
                    requires.push(require);
                }
            }
        }
        return requires;
    }
}


/**
 * Given a set of requires, try to find fewer unique providers that can fulfill them.
 */
class ProviderCounter {

    /**
     * Tally how many requires can be fulfilled by a provider.
     */
    private readonly entries: { [providerId: number]: ProviderEntry };

    /**
     * Requires mapped to a tallied set of providers.
     */
    public readonly requireMap: { [requireId: number]: ProviderEntry[] };

    constructor(providerMap: { requireId: Module[] }) {
        this.entries = {};
        this.requireMap = {};
        for (const id in providerMap) {
            this.requireMap[id] = this.count(providerMap[id]);
        }
    }

    /**
     * Map a module's name to unique providers that can fulfill its requirements.
     * @param modules: Detailed modules.
     *
     *        [M]                    [M] Module
     *       /  \                    [R] Requirement
     *    [R]   [R]    ->  M:[P,P]   [P] Provider
     *   / \    / \
     * [P][P] [P][P]
     */
    public getProvidesForModules(modules: Module[]): { [requirerName: string]: Module[] } {
        const providerMap = {} as { [requirerName: string]: Module[] };
        for (const module of modules) {
            const results = this.matchRequiresToProvides(module);
            if (results.length > 0) {
                providerMap[module.name] = results;
            }
        }
        return providerMap;
    }

    /**
     * Find the best matching providers that can fulfill a given Module's requirements.
     * @return: providers
     */
    private matchRequiresToProvides(requirer: Module): Module[] {
        const bestMatches: Module[] = [];
        for (const require of requirer.requires) {
            const bestMatch = this.matchProvider(require.id);
            if (bestMatch && bestMatches.indexOf(bestMatch) === -1) {
                bestMatches.push(bestMatch);
            }
        }
        return bestMatches;
    }

    private matchProvider(requireId: ServerID): Module | null {
        if (!this.requireMap[requireId]) {
            return null;
        }
        let bestMatch: ProviderEntry = null;
        const isBetterMatch = (providerEntry) => {
            return !bestMatch ||
                providerEntry.numRequires > bestMatch.numRequires ||
                this.isRpiViable(providerEntry);
        };
        for (const providerEntry of this.requireMap[requireId]) {
            if (isBetterMatch(providerEntry)) {
                bestMatch = providerEntry;
            }
        }
        return bestMatch ? bestMatch.provider : null;
    }

    /**
     * Minor bias toward Raspberry Pi Compute Connector.
     */
    private isRpiViable(providerEntry: ProviderEntry): boolean {
        const isRpi = providerEntry.provider.id === 2525;
        return isRpi && providerEntry.numRequires >= providerEntry.numRequires;
    }

    private count(providers: Module[]): ProviderEntry[] {
        const updatedCounters = [];
        for (const provider of providers) {
            if (!this.entries[provider.getId()]) {
                this.entries[provider.getId()] = new ProviderEntry(provider);
            } else {
                this.entries[provider.getId()].increment();
            }
            updatedCounters.push(this.entries[provider.getId()]);
        }
        return updatedCounters;
    }
}


/**
 * Holds a record of a providing Module being counted in ProviderCounter.
 */
class ProviderEntry {
    public numRequires: number;

    constructor(public readonly provider: Module) {
        this.numRequires = 1;
    }

    public increment(): void {
        ++this.numRequires;
    }
}