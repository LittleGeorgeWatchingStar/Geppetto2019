import GeppettoModel from 'model/GeppettoModel';
import {Level, ServerID} from "../model/types";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {RequireBus} from "./RequireBus";
import {ProvideBus} from "./ProvideBus";


export class BusGroup extends GeppettoModel {

    private determinedGroupLevels: Level[];

    /**
     * Used for requires with exclusions when determining whether a require is
     * a match to a provide.
     *
     * Ex. Even though require(1) has set the determined levels for the
     * bus group, require (2) should ignore what (1) has set, because (1) will
     * be disconnected upon (2)'s connection due to the exclusions.
     *
     * `cid` is of the current require you want to check, and the 'levels' given
     * will exclude any requires within the current require's exclusions
     */
    private exclusionDeterminedGroupLevels: {[cid: string]: Level[]} = {};

    initialize(attributes) {
        if (attributes.placed_module) {
            this.set('placed_module', attributes.placed_module);
        }
        //initialize determined levels to default logic levels
        this.setDeterminedVlogicLevels(this.getLogicLevels());
    }

    defaults() {
        return {
            placed_module: null
        }
    }

    getLogicLevels(): Level[] {
        return this.get('levels');
    }

    isVariableLevel(): boolean {
        return this.getLogicLevels().length > 1;
    }

    private setDeterminedVlogicLevels(levels: Level[], exclusions?: RequireBus[]) {
        if (levels.length === 0) {
            console.warn(`Bus group ${this.name} has no valid levels.`);
        }
        if (exclusions) {
            exclusions.forEach(require => {
                this.exclusionDeterminedGroupLevels[require.cid] = levels;
            });
        } else {
            this.determinedGroupLevels = levels;
        }
    }

    public getDeterminedGroupLevels(exclusion?: RequireBus): Level[] {
        if (!exclusion ||
            !this.exclusionDeterminedGroupLevels.hasOwnProperty(exclusion.cid)) {
            return this.determinedGroupLevels.slice(); // defensive copy
        } else {
            return this.exclusionDeterminedGroupLevels[exclusion.cid].slice();
        }
    }

    /**
     * True if this bus group bus can accept any of the given voltages level
     */
    public canAcceptAnyLevel(levels: Level[], exclusion?: RequireBus): boolean {
        const determinedLevels = this.getDeterminedGroupLevels(exclusion);
        return determinedLevels.some(level => {
            return levels.indexOf(level) !== -1
        });
    }

    getId(): ServerID {
        return this.get('id');
    }

    get name(): string {
        return this.get('title');
    }

    _getRequireBuses(): RequireBus[] {
        return this.placedModule.getRequires().filter(requireBus => requireBus.isPartOfGroup(this));
    }

    private get placedModule(): PlacedModule {
        return this.get('placed_module');
    }

    isAnyRequireConnected(): boolean {
        return this._getRequireBuses().some(require => require.isConnected());
    }

    isAnyProvideConnected(): boolean {
        return this._getProvideBuses().some(provide => provide.isConnected());
    }

    _getProvideBuses(): ProvideBus[] {
        return this.placedModule.getProvides().filter(provideBus => provideBus.isPartOfGroup(this));
    }

    getRequireVlogicPowerBus(): RequireBus | undefined {
        return this._getRequireBuses().find(requireBus => requireBus.implementsVlogicTemplate());
    }

    getProvideVlogicPowerBus(): ProvideBus | undefined {
        return this._getProvideBuses().find(provideBus => provideBus.implementsVlogicTemplate());
    }

    _getConnectedRequireBuses(): RequireBus[] {
        return this._getRequireBuses().filter(requireBus => requireBus.isConnected());
    }

    /**
     * Provide buses which are connected to this group's require buses.
     */
    _getUpstreamProvideBuses(): ProvideBus[] {
        return this._getConnectedRequireBuses().map(require => require.getConnectedProvide());
    }

    /**
     * Placed modules which are providing connections to this group's
     * require buses.
     */
    getUpstreamModules(): PlacedModule[] {
        return this._getUpstreamProvideBuses()
            .map(provide => provide.getPlacedModule());
    }

    getConnectedGroups(exclusion?: RequireBus): BusGroup[] {
        const inclusions = exclusion ? exclusion.getInclusions() : [];

        const groups = new Set<BusGroup>();
        const requires = this._getRequireBuses();
        const provides = this._getProvideBuses();
        for (const require of requires) {
            if (inclusions.indexOf(require) !== -1) {
                continue;
            }
            const parentProvides = require.getGraphParents();
            for (const provide of parentProvides) {
                groups.add(provide.getBusGroup())
            }
        }
        for (const provide of provides) {
            const childRequires = provide.getGraphChildren();
            for (const require of childRequires) {
                if (inclusions.indexOf(require) !== -1) {
                    continue;
                }
                groups.add(require.getBusGroup());
            }
        }
        return Array.from<BusGroup>(groups);
    }

    recalculateDeterminedLevels(exclusion?: RequireBus): void {
        const finderA = new IntersectionLevelFinder();
        this.traverseGraph(this, node => finderA.updateIntersection(node));
        this.traverseGraph(this, node => node.setDeterminedVlogicLevels(finderA.intersection));

        if (!exclusion) {
            return;
        }

        const finderB = new IntersectionLevelFinder();
        this.traverseGraph(this,
            node => finderB.updateIntersection(node),
            exclusion);
        this.traverseGraph(this,
            node => node.setDeterminedVlogicLevels(finderB.intersection, exclusion.getExclusions()),
            exclusion);
    }

    private traverseGraph(node: BusGroup,
                          actionOnVisit: GraphAction,
                          exclusion?: RequireBus): void {
        const visited = new Set<ServerID>();
        const isVisited = node => {
            return visited.has(node.getId());
        };

        const setVisited = node => {
            visited.add(node.getId());
        };
        const stack = [];
        stack.push(node);
        while (stack.length) {
            const currentNode = stack.pop();
            if (isVisited(currentNode)) {
                continue;
            }
            actionOnVisit(currentNode);
            setVisited(currentNode);
            const connectedGroups = exclusion ?
                currentNode.getConnectedGroups(exclusion) :
                currentNode.getConnectedGroups();
            for (const child of connectedGroups) {
                stack.push(child);
            }
        }
    }

    /**
     * Returns if the VLOGIC RequireBus of this group does not need to be
     * connected.
     *
     * Eg. All the RequireBuses (excluding the VLOGIC one) are optional, and set
     * to NC (No connect), then there is no need to connect the VLOGIC
     * RequireBus.
     */
    public get isVlogicRequireBusConnectionNotRequired(): boolean {
        const requireBuses = this._getRequireBuses();
        let busCount = 0; // Exclude the VLOGIC RequireBus.
        let optionalCount = 0;
        let noConnectCount = 0;
        for (const requireBus of requireBuses) {
            if (!requireBus.implementsVlogicTemplate()) {
                busCount++;
                if (requireBus.isOptional) {
                    optionalCount++;
                }
                if (requireBus.isNoConnect()) {
                    noConnectCount++;
                }
            }
        }

        const isAllOptional = optionalCount === busCount;
        const isAllNoConnect = noConnectCount === busCount;
        return isAllOptional && isAllNoConnect;
    }

    equals(group: BusGroup): boolean {
        return this.getId() === group.getId();
    }

}


type GraphAction = (node: BusGroup) => void;


class IntersectionLevelFinder {
    private _intersection: Level[] | null;

    constructor() {
        this._intersection = null;
    }

    updateIntersection(busGroup: BusGroup): void {
        if (!this._intersection) {
            this._intersection = busGroup.getLogicLevels();
        }
        this._intersection = busGroup.getLogicLevels()
            .filter(level => this._intersection.indexOf(level) !== -1);
    }

    public get intersection(): Level[] | null {
        return this._intersection;
    }
}
