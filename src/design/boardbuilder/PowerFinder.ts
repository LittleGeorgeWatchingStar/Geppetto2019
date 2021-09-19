import {DesignRevision} from "../DesignRevision";
import {ModuleGateway} from "../../module/ModuleGateway";
import {BusResource, RequireFilterResource} from "../../bus/api";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {Module} from "../../module/Module";
import {PlacementAnalyzer} from "../placementanalyzer/PlacementAnalyzer";
import {RequireBus} from "../../bus/RequireBus";
import {ServerID} from "../../model/types";
import {Library} from "../../module/Library";
import {app} from "../../app";
import ModuleController from "../../module/ModuleController";
import {RemoveModules} from "../../module/actions";
import * as Config from "Config";


/**
 * The return value of PowerFinder.
 */
export interface PowerFinderResults {
    powerModules: { level: Module[] };
    connectors: Module[];
}

/**
 * The power tree of a design takes roughly a shape like:
 *             [M]
 *              |
 *    [M]  [M] [P]
 *      \ / | /
 * [M]  [P][P]
 *  \    \ /
 *  [Connector]
 *
 *  [M]: Module   [P]: Power module   [Connector]: Power connector
 *
 * Find adequate power sources given a set of modules [M].
 * 1) Prefer fewer unique power modules [P].
 * 2) Only 1 power connector is allowed.
 */
export class PowerFinder {

    /**
     * Combinations of level consumption from the board's placed modules.
     */
    private levelConsumption: { level: number }[];

    /**
     * { '3.3': Module[],
     *   '1.8': Module[] }, ...
     *  Where Module[] is a list of intersecting providers for requires that fall under that level.
     */
    private levelProviders: { level: Module[] };

    /**
     * For converting summary modules to detailed modules.
     */
    private detailedPowerMap: { providerId: Module };

    private providerMap: { requireId: Module[] };

    private _error: string | undefined;

    constructor(private readonly designRev: DesignRevision,
                private readonly moduleGateway: ModuleGateway,
                private readonly library: Library) {
    }

    public async findPower(): Promise<PowerFinderResults | undefined> {
        const eligible = this.eligible;
        const reqResources = eligible.resources;
        if (reqResources.length === 0) {
            this._error = "Your board currently has no power requirements.";
            return;
        }
        this.providerMap = await this.makeProviderMap(reqResources);
        this.calculateLevelMaps(this.providerMap, eligible.requires);
        await this.makeModuleLookupMap();
        const filterSuccess = this.filterPowerByCapacity();
        if (!filterSuccess) {
            this._error = "Sorry, your board's power requirements exceed the capability of this feature.";
            return;
        }
        const grouped = this.groupProviders(eligible.requires);
        const connectors = await this.determineConnectors();
        const detailedPower = this.getDetailedProviders(grouped);
        this.filterLevelProviders(detailedPower, connectors);
        this.sortProviders(detailedPower);
        const connectorCount = this.countConnectors(detailedPower);

        return {
            powerModules: detailedPower,
            connectors: this.sortConnectors(connectors, connectorCount)
        } as PowerFinderResults;
    }

    public get error(): string | undefined {
        return this._error;
    }

    public isValidCombination(powerModules: Module[], connector: Module): boolean {
        console.assert(this.isLikeConnector(connector), `${connector.name} is not a connector.`);
        const consumption = this.calculateConsumption(powerModules);
        return this.canConnectorProvide(connector, consumption);
    }

    /**
     * TODO: some Power modules should be filed as Power Connectors, which necessitates this check.
     * True if a Power module is a Power Connector, or has no requires,
     * which is a characteristic of a connector.
     * @param module: Detailed module.
     */
    public isLikeConnector(module: Module): boolean {
        return module.isPowerConnector || module.isPowerModule && module.requires.length === 0;
    }

    /**
     * @param levelProviders: Summary modules.
     * @return a detailed modules version of levelProviders.
     */
    private getDetailedProviders(levelProviders: { level: Module[] }): { level: Module[] } {
        const providers = {} as { level: Module[] };
        for (const level in levelProviders) {
            providers[level] = [];
            for (const provider of levelProviders[level]) {
                if (Config.DEBUG) {
                    console.assert(undefined != this.detailedPowerMap[provider.getId()],
                        `${provider.name} doesn't have a detailed equivalent!`);
                }
                const detailed = this.detailedPowerMap[provider.getId()];
                providers[level].push(detailed);
            }
        }
        return providers;
    }

    /**
     * Eg. { '1.8': Module[],      { '1.8': Module [], (1.8 providers only)
     *       '3.3': Module[],   ->   '3.3': Module[], (3.3 providers only)
     *       '5.0': Module[],   ->   '5.0-16.0': Module[], (unique providers for both 5.0 and 16.0) }
     *      '16.0': Module[] }
     */
    private groupProviders(requires: RequireBus[]): { level: Module[] } {
        const alreadyProvided = {};
        const result = {} as { level: Module[] };

        for (const require of requires) {
            if (this.providerMap[require.getId()].length === 0) {
                continue;
            }
            const levels = require.getDeterminedLevels();
            if (levels.some(level => undefined != alreadyProvided[level] &&
                this.areLevelProvidersValid(require, level))) {
                continue;
            }
            const provideGroups = [];
            for (const level of levels) {
                if (this.areLevelProvidersValid(require, level)) {
                    provideGroups.push(this.levelProviders[level]);
                } else {
                    provideGroups.push(this.providerMap[require.getId()]);
                }
            }
            result[levels.join('-')] = this.getUniqueProvides(provideGroups);
            levels.forEach(level => alreadyProvided[level] = true);
        }
        return result;
    }

    /**
     * Providers can't necessarily supply a require with the same level, due to bus template.
     * Eg. AVCC "accepts" 3.3V, but common 3.3V providers like 3.3V/1.5A Regulator can't supply it.
     */
    private areLevelProvidersValid(require: RequireBus, level: string): boolean {
        const levelProviders = this.levelProviders[level];
        return levelProviders.some(lvlProvide =>
            this.providerMap[require.getId()].find(p => p.getId() === lvlProvide.getId())
        );
    }

    private getUniqueProvides(provideGroups: Module[][]): Module[] {
        const provides = [];
        for (const group of provideGroups) {
            for (const provide of group) {
                if (!provides.find(p => p.getId() === provide.getId())) {
                    provides.push(provide);
                }
            }
        }
        return provides;
    }

    private async makeModuleLookupMap(): Promise<void> {
        const toFetch = this.getUniqueProvideIds(this.levelProviders);
        const detailedPowerModules = await this.getDetailedModules(toFetch);
        const map = {} as { providerId: Module };
        for (const module of detailedPowerModules) {
            map[module.getId()] = module;
        }
        this.detailedPowerMap = map;
    }

    private get eligible(): {
        resources: RequireFilterResource[],
        requires: RequireBus[]
    } {
        const resources = [];
        const requires = [];
        for (const pm of this.designRev.getPlacedModules()) {
            for (const require of pm.getRequires()) {
                if (this.isEligibleRequire(require)) {
                    resources.push({
                        require: require.id,
                        amount: require.getPowerDraw(),
                        power_only: true
                    } as RequireFilterResource);
                    requires.push(require);
                }
            }
        }
        return {
            resources: resources,
            requires: requires.sort((a, b) => a.getDeterminedLevels().length - b.getDeterminedLevels().length)
        };
    }

    /**
     * True if require is:
     * 1) Power
     * 2) Not connected
     * 3) Not exclusive with another, connected require.
     */
    private isEligibleRequire(require: RequireBus): boolean {
        return require.isPower() && !require.isConnected() && !require.hasExclusions();
    }

    private getUniqueProvideIds(map: { [key: string]: Module[] }): string[] {
        const ids = [];
        for (const key in map) {
            for (const provider of map[key]) {
                if (ids.indexOf(provider.getId()) === -1) {
                    ids.push(provider.getId());
                }
            }
        }
        return ids;
    }

    private async makeProviderMap(resources: RequireFilterResource[]): Promise<{ requireId: Module[] }> {
        const providerMap = await this.moduleGateway.getProviders(resources) as { requireId: Module[] };
        for (const requireId in providerMap) {
            providerMap[requireId] = providerMap[requireId].filter(provider => !provider.isDummyPower);
        }
        return providerMap;
    }

    private calculateLevelMaps(powerMap: { requireId: Module[] },
                               requires: RequireBus[]): void {

        const levelProviders = {} as { level: Module[] };
        let consumption = [{}] as { level: number }[];

        const tallyLevelProvider = (require: RequireBus) => {
            const levels = require.getDeterminedLevels();
            for (const level of levels) {
                if (powerMap[require.getId()].length === 0) { // Eg. excludes VLOGIC
                    continue;
                }
                if (!levelProviders[level]) {
                    levelProviders[level] = [];
                }
                levelProviders[level].push(powerMap[require.getId()]);
            }
        };

        for (const require of requires) {
            tallyLevelProvider(require);
            const newGroups = [];
            for (const map of consumption.slice()) {
                for (const level of require.getDeterminedLevels()) {
                    const copy = {...map};
                    copy[level] = copy[level] ? copy[level] + require.getPowerDraw() : require.getPowerDraw();
                    newGroups.push(copy);
                }
            }
            consumption = newGroups;
        }

        const handleSplitResults = (level) => {
            for (let i = 1; i < levelProviders[level].length; ++i) {
                levelProviders[`${level}-${i}`] = levelProviders[level][i];
            }
            levelProviders[level] = levelProviders[level][0];
        };

        for (const level in levelProviders) {
            const intersection = this.intersectingModules(levelProviders[level]);
            // No results, due to eg. a difference in bus template.
            if (intersection.length === 0) {
                handleSplitResults(level);
            } else {
                levelProviders[level] = intersection;
            }
        }
        this.levelConsumption = consumption;
        this.levelProviders = levelProviders;
    }

    /**
     * Destructively filter power modules that cannot supply needed consumption.
     * @return boolean: If this kills all power modules under a level, the power finding process fails.
     * Return false in that case.
     */
    private filterPowerByCapacity(): boolean {
        for (const level in this.levelProviders) {
            this.levelProviders[level] = this.levelProviders[level].filter(provider => {
                const detailed = this.detailedPowerMap[provider.getId()];
                const provideBus = detailed.provides.find(provide => provide.levels.some(lvl => lvl === level));
                return provideBus && this.levelConsumption.some(map => provideBus.milliwatts >= map[level]);
            });
            if (this.levelProviders[level].length === 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sort providers by:
     * 1) Connector (if the level can be supplied directly by a connector, try to cut out power module 'middlemen')
     * 2) Regulators by price
     * 3) Other by price
     */
    private sortProviders(detailedProviderMap: { level: Module[] }): void {
        for (const level in detailedProviderMap) {
            const connectors = [];
            const regulators = [];
            const other = [];
            for (const provider of detailedProviderMap[level]) {
                if (this.isLikeConnector(provider)) {
                    connectors.push(provider);
                } else if (provider.isRegulator) {
                    regulators.push(provider);
                } else {
                    other.push(provider);
                }
            }
            const byPrice = (a, b) => a.getPrice() - b.getPrice();
            detailedProviderMap[level] = connectors.sort(byPrice)
                .concat(regulators.sort(byPrice))
                .concat(other.sort(byPrice));
        }
    }

    private calculateConsumption(powerModules: Module[]): { level: number }[] {
        const consumptionMaps = [...this.levelConsumption] as { level: number }[];
        const levelMap = this.makeLevelMap(powerModules);
        const sortedLevels = Object.keys(levelMap).sort((a, b) => (parseFloat(a) - parseFloat(b)));
        for (const level of sortedLevels) {
            for (const module of levelMap[level]) {
                for (const req of module.requires) {
                    if (req.power && req.efficiency > 0) {
                        this.buildConsumptionBranch(req, level, consumptionMaps);
                        break;
                    }
                }
            }
        }
        return consumptionMaps;
    }

    private makeLevelMap(fromModules: Module[]): { level: Module[] } {
        const map = {} as { level: Module[] };
        for (const module of fromModules) {
            for (const provide of module.provides) {
                if (!provide.power) {
                    continue;
                }
                for (const level of provide.levels) {
                    if (!map[level]) {
                        map[level] = [];
                    }
                    map[level].push(module);
                }
            }
        }
        return map;
    }

    /**
     * Find connectors that can provide for the chosen power modules.
     * @return connectors, or empty [] if invalid.
     */
    private async determineConnectors(): Promise<Module[]> {
        const consumptionMaps = [...this.levelConsumption] as { level: number }[];
        const resources: RequireFilterResource[] = [];
        const levelConnectors = [];
        const sortedLevels = Object.keys(this.levelProviders).sort((a, b) => (parseFloat(a) - parseFloat(b)));
        for (const level of sortedLevels) {
            for (const provider of this.levelProviders[level]) {
                const detailed: Module = this.detailedPowerMap[provider.getId()];
                if (this.isLikeConnector(detailed) &&
                    levelConnectors.every(c => c.getId() !== detailed.getId())) {
                    levelConnectors.push(detailed);
                    continue;
                }
                for (const req of detailed.requires) {
                    if (!req.power || req.efficiency === 0) {
                        continue;
                    }
                    this.buildConsumptionBranch(req, level, consumptionMaps);
                    const resource = {
                        require: req.id,
                        power_only: true
                    } as RequireFilterResource;
                    resources.push(resource);
                }
            }
        }
        if (resources.length === 0) {
            return levelConnectors;
        }
        const providerMap = await this.moduleGateway.getProviders(resources) as { requireId: Module[] };
        this.filterConnectorMap(providerMap);
        const toFetch = this.getUniqueProvideIds(providerMap);
        const detailed = await this.getDetailedModules(toFetch);
        this.mergeConnectors(detailed, levelConnectors);
        return this.filterByCapacity(detailed, consumptionMaps);
    }

    /**
     * Consumption maps taking [M] consumption and converting to levels provided by [P].
     * Eg. [M] reqs 3.3 -> [P] provides 3.3, reqs 5.0 -> [C] provides 5.0.
     * This finds every combination of power module consumption, where
     * connectors can provide for at least one of the combinations.
     */
    private buildConsumptionBranch(require: BusResource, level: string,
                                   consumptionMaps: { level: number }[]): void {
        for (const map of consumptionMaps.slice()) {
            const powerDraw = Math.ceil(map[level] / require.efficiency);
            if (!powerDraw) {
                continue;
            }
            for (const reqLvl of require.levels) {
                const copy = {...map};
                copy[reqLvl] = copy[reqLvl] ? copy[reqLvl] + powerDraw : powerDraw;
                if (reqLvl !== level) {
                    delete copy[level];
                }
                consumptionMaps.push(copy);
            }
        }
    }

    /**
     * @param connectors: Connectors that can provide for power modules.
     * @param levelConnectors: Connectors that can supply other levels without going through power modules.
     */
    private mergeConnectors(connectors: Module[], levelConnectors: Module[]): void {
        for (const lvlConn of levelConnectors) {
            const isUnique = connectors.every(conn => conn.getId() !== lvlConn.getId());
            if (!this.is5PinGPS(lvlConn) && isUnique) {
                connectors.push(lvlConn);
            }
        }
    }

    /**
     * The frequency of connectors appearing in other level categories. Used for sorting.
     */
    private countConnectors(detailedPower: { level: Module[] }): { providerId: number } {
        const connectorCount = {} as { providerId: number }; // number: how often it appears.
        for (const level in detailedPower) {
            for (const provider of detailedPower[level]) {
                if (!this.isLikeConnector(provider)) {
                    continue;
                }
                connectorCount[provider.getId()] = connectorCount[provider.getId()] ?
                    connectorCount[provider.getId()] + 1 : 1;
            }
        }
        return connectorCount;
    }

    /**
     * 1) If a connector is present under other level providers, sort it to the top.
     * 2) Else sort by barrel connectors first.
     * 3) Sort both by price.
     */
    private sortConnectors(connectors: Module[], existingConnectorIds: { providerId: number }): Module[] {
        const existingConnectors = [];
        const other = [];
        for (const connector of connectors) {
            if (existingConnectorIds[connector.getId()]) {
                existingConnectors.push(connector);
            } else {
                other.push(connector);
            }
        }
        const byBarrelConnector = (a, b) => {
            const aIsBarrel = a.isBarrelConnector ? 1 : 0;
            const bIsBarrel = b.isBarrelConnector ? 1 : 0;
            const comparison = bIsBarrel - aIsBarrel;
            return comparison !== 0 ? comparison : a.getPrice() - b.getPrice();
        };
        const byCount = (a, b) => {
            const count = existingConnectorIds[b.getId()] - existingConnectorIds[a.getId()];
            return count !== 0 ? count : byBarrelConnector(a, b);
        };
        return existingConnectors.sort(byCount)
            .concat(other.sort(byBarrelConnector));
    }

    /**
     * Given multiple lists of modules, find the intersecting modules between them.
     * TODO server task
     */
    private intersectingModules(lists: Module[][]): Module[] {
        return lists.reduce((accum, current) => accum.filter(module =>
            current.some(other => other.getId() === module.getId())
        ));
    }

    /**
     * See if the 'master' connectors can supply at least one combination of level requirements.
     */
    private filterByCapacity(detailedConnectors: Module[],
                             consumptionMaps: { level: number }[]): Module[] {
        return detailedConnectors.filter(connector => this.canConnectorProvide(connector, consumptionMaps));
    }

    private canConnectorProvide(connector: Module,
                                consumptionMaps: { level: number }[]): boolean {
        for (const map of consumptionMaps) {
            const neededLevels = Object.keys(map).length;
            let fulfilled = 0;
            for (const provide of connector.provides) {
                if (!provide.power) {
                    continue;
                }
                for (const level of provide.levels) {
                    if (map[level] && provide.milliwatts >= map[level]) {
                        ++fulfilled;
                        if (fulfilled >= neededLevels) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    /**
     * Destructively filter for power connectors (not power modules).
     */
    private filterConnectorMap(providerMap: { requireId: Module[] }): void {
        for (const requireId in providerMap) {
            providerMap[requireId] = providerMap[requireId].filter(
                module => module.isPowerConnector && !this.is5PinGPS(module)
            );
        }
    }

    /**
     * Gordon says 5-Pin GPS Right Angle Connector is never the right answer when finding a power supply.
     * Unfortunately, PowerFinder otherwise thinks it looks like a very good solution sometimes.
     */
    private is5PinGPS(module: Module): boolean {
        return module.getId() === 2310;
    }

    /**
     * Filter level connectors not listed under the 'master' Connectors category;
     * or, if all 'master' connectors can supply the level's requirements,
     * use those and exclude all other power modules.
     */
    private filterLevelProviders(detailedLvlProviders: { level: Module[] }, connectors: Module[]): void {
        for (const level in detailedLvlProviders) {
            let numEqualConnectors = 0;
            let filtered = [];
            for (const provider of detailedLvlProviders[level]) {
                if (!provider) continue; // TODO this should not be undefined but sometimes is
                if (!this.isLikeConnector(provider)) {
                    filtered.push(provider);
                    continue;
                }
                const matching = connectors.find(connector => connector.getId() === provider.getId());
                if (!matching) {
                    continue;
                }
                filtered.push(matching);
                ++numEqualConnectors;
                if (numEqualConnectors === connectors.length) {
                    filtered = connectors;
                    break;
                }
            }
            detailedLvlProviders[level] = filtered;
        }
    }

    private getDetailedModules(ids: ServerID[]): JQuery.jqXHR<Module[]> | Promise<Module[]> {
        const fetchNeeded = [];
        const detailedModules = [];

        for (const id of ids) {
            const libraryModule = this.library.models.find(module => module.getId() === id);
            if (libraryModule.isSummary) {
                fetchNeeded.push(id);
            } else {
                detailedModules.push(libraryModule);
            }
        }
        if (fetchNeeded.length === 0) {
            return Promise.resolve(detailedModules);
        }
        return this.moduleGateway.getDetailedModules(fetchNeeded).then(results => {
            ModuleController.setLibraryModuleAttributes(results);
            return results.concat(detailedModules);
        }) as JQuery.jqXHR<Module[]>;
    }
}