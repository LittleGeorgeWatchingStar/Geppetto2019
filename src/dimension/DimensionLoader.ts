import {AnchorResource} from "./Anchor/api";
import {DimensionResource, DimensionServerResource} from "./api";
import {Dimensionable, EdgePosition} from "./Dimensionable";
import {createDimension, Dimension, DimensionAttributes} from "./Dimension";
import {Anchor} from "./Anchor/Anchor";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {ModuleAnchor} from "./Anchor/ModuleAnchor";
import {Board} from "../model/Board";
import {FeatureResource} from "../module/feature/api";
import {Feature} from "../module/feature/Feature";

export class DimensionLoader {
    constructor(private dimensionResource: DimensionResource | DimensionServerResource,
                private dimensionables: Dimensionable[]) {
    }

    public get anchorResource1(): AnchorResource {
        return this.dimensionResource.anchor1;
    }

    public get anchorResource2(): AnchorResource {
        return this.dimensionResource.anchor2;
    }

    public getDimension(): Dimension | undefined {
        const anchor1 = this.getAnchorFromResource(this.anchorResource1);
        const anchor2 = this.getAnchorFromResource(this.anchorResource2);

        /**
         * Silently fail if one of the anchors are not found
         */
        if (anchor1 && anchor2) {
            const dimensionAttributes: DimensionAttributes = {
                anchor1: anchor1,
                anchor2: anchor2,
                locked: this.dimensionResource.locked,
                hidden: this.dimensionResource.hidden,
            };
            if (this.dimensionResource.hasOwnProperty('uuid')) {
                dimensionAttributes.uuid = (this.dimensionResource as DimensionResource).uuid
            }

            return createDimension(dimensionAttributes);
        }
    }

    private getAnchorFromResource(resource: AnchorResource): Anchor | undefined {
        switch (resource.type) {
            case 'board' :
                if (!this.board) {
                    return;
                }
                return this.board.getAnchorByEdge(resource.edge as EdgePosition);

            case 'module':
                const pm = this.getDimensionableByUuid(resource.module_uuid) as PlacedModule;
                if (!pm) {
                    return;
                }
                const feature = this.getFeature(pm, resource.feature);
                return pm.anchors.find((anchor: ModuleAnchor) => {
                    return anchor.feature === feature;
                });

            case 'logo':
                const pl = this.getDimensionableByUuid(resource.logo_uuid);
                if (!pl) {
                    return;
                }
                return pl.getAnchorByEdge(resource.edge as EdgePosition);

            default:
                return;
        }
    }

    private get board(): Board | undefined {
        return this.dimensionables.find((dimensionable: Dimensionable) => {
            return dimensionable instanceof Board;
        }) as Board;
    }

    private getDimensionableByUuid(uuid: string): Dimensionable | undefined {
        return this.dimensionables.find((dimensionable: Dimensionable) => {
            return dimensionable.uuid === uuid;
        });
    }

    /**
     * Find the feature for an anchor. If the module has been
     * upgraded, attempt to find the equivalent feature by searching
     * based on type and line points.
     */
    private getFeature(pm: PlacedModule,
                       featureResource: FeatureResource): Feature | undefined {
        let feature = pm.getFeature(featureResource.id);

        if (!feature) {
            feature = pm.features.find((feature: Feature) => {
                return this.isMatchingFeature(feature, featureResource);
            });
        }

        return feature;
    }

    private isMatchingFeature(feature: Feature, featureResource: FeatureResource): boolean {
        return feature.isType(featureResource.type) &&
            feature.arePointsEqual(featureResource.points);
    }
}

export function createDimensionLoader(dimensionResource: DimensionResource | DimensionServerResource,
                                dimensionables: Dimensionable[]): DimensionLoader {
    return new DimensionLoader(dimensionResource, dimensionables);
}