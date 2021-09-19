import * as Backbone from "backbone";
import * as _ from "underscore";
import {NeedsConnections} from "../../core/NeedsConnections";
import {RequireBus} from "../RequireBus";

/**
 * A set of mutually-exclusive require buses.
 */
export class ExclusionSet
    extends Backbone.Collection<RequireBus>
    implements NeedsConnections {

    /**
     * Merges the buses in `other` into this set.
     */
    public addAll(exclusions: RequireBus[]): void {
        const existingExclusions = this.models;
        this.reset(_(existingExclusions).union(exclusions));
    }

    /**
     * Make a copy of this.
     */
    public clone(): this {
        return new ExclusionSet(this.models) as this;
    }

    public isReady(): boolean {
        const currentExclusions: {[key: number]: boolean} = {};
        this.forEach(requireBus => {
            currentExclusions[requireBus.id] = false;
        });
        this.forEach(requireBus => {
            if (requireBus.isReady()) {
                const exclusions = requireBus.getExclusions();
                exclusions.forEach(exclusion => {
                    currentExclusions[exclusion.id] = true;
                });
            }
        });

        return this.every(requireBus => {
            return currentExclusions[requireBus.id] || requireBus.isReady();
        });
    }

    public isConnected(): boolean {
        const currentExclusions: {[key: number]: boolean} = {};
        this.forEach(requireBus => {
            currentExclusions[requireBus.id] = false;
        });
        this.forEach(requireBus => {
            if (requireBus.isConnected()) {
                const exclusions = requireBus.getExclusions();
                exclusions.forEach(exclusion => {
                    currentExclusions[exclusion.id] = true;
                });
            }
        });

        return this.every(requireBus => {
            return currentExclusions[requireBus.id] || requireBus.isConnected();
        });
    }

    public isOptional(): boolean {
        return this.every(requireBus => requireBus.isOptional);
    }

    public isNoConnect(): boolean {
        return this.every(requireBus => requireBus.isNoConnect());
    }

    public getInclusions(currentRequire: RequireBus): RequireBus[] {
        const currentExclusions: {[key: number]: boolean} = {};
        this.forEach(requireBus => {
            currentExclusions[requireBus.id] = false;
        });
        for (const requireBus of this.models) {
            if (requireBus === currentRequire) {
                const exclusions = requireBus.getExclusions();
                exclusions.forEach(exclusion => {
                    currentExclusions[exclusion.id] = true;
                });
                break;
            }
        }

        return this.filter(requireBus => {
            return !currentExclusions[requireBus.id];
        });
    }

    public getInclusionSets(): RequireBus[][] {
        const inclusionSet = [];
        this.forEach(requireBus => {
            const isInSet = inclusionSet.some(inclusions => {
                return inclusions.indexOf(requireBus) !== -1;
            });

            if (!isInSet) {
                const inclusion = this.getInclusions(requireBus);
                inclusionSet.push(inclusion);
            }
        });
        return inclusionSet;
    }
}
