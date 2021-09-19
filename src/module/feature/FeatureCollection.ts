import * as Backbone from "backbone";
import * as _ from "underscore";
import {Footprint, makeFootprint, Outline} from "./footprint";

import {Feature} from "./Feature";

export const OUTLINE_PADDING = 5;

export class FeatureCollection extends Backbone.Collection<Feature> {

    get model() {
        return Feature;
    }

    footprint(): Footprint | null {
        const grouped = this.groupBy('type');
        const fp_features = _.compact(_.flatten([grouped.footprint, grouped.edge]));

        return makeFootprint(fp_features);
    }

    pathWall(): Footprint | null {
        const grouped = this.groupBy('type');
        const fp_features = _.compact(_.flatten([grouped.pathWall]));

        if (!fp_features.length) {
            return null;
        }

        return makeFootprint(fp_features, false);
    }

    rotate(): void {
        this.map((feature: Feature) => feature.rotate())
    }

    vertical(): FeatureCollection {
        const v = this.filter((feature: Feature) => feature.isVertical());
        return new FeatureCollection(v);
    }

    /**
     * Eg. if this group of features is constrained by the right edge, returns ['right'].
     */
    public get edgeConstraints(): string[] {
        const edges = {
            top: this.top(),
            bottom: this.bottom(),
            left: this.left(),
            right: this.right()
        };
        const constraints = [];
        try {
            for (const edgeName in edges) {
                if (edges[edgeName].isEdge()) {
                    constraints.push(edgeName);
                }
            }
        } catch {
            // Workaround for bugged Colibri modules. Since their horizontal()/vertical() methods
            // aren't valid, the min/max will return Infinity instead of a Feature.
        }
        return constraints;
    }

    horizontal(): FeatureCollection {
        const h = this.filter((feature: Feature) => feature.isHorizontal());
        return new FeatureCollection(h);
    }

    top(): Feature {
        return this.horizontal().max((feature: Feature) => feature.y)
    }

    right(): Feature {
        return this.vertical().max((feature: Feature) => feature.x)
    }

    bottom(): Feature {
        return this.horizontal().min((feature: Feature) => feature.y)
    }

    left(): Feature {
        return this.vertical().min((feature: Feature) => feature.x)
    }

    /**
     * Box for outlining the collection of features.
     */
    outline(): Outline {
        const xmin = this.chain()
            .map((feature: Feature) => feature.minX)
            .min()
            .value();

        const ymin = this.chain()
            .map((feature: Feature) => feature.minY)
            .min()
            .value();

        const xmax = this.chain()
            .map((feature: Feature) => feature.maxX)
            .max()
            .value();

        const ymax = this.chain()
            .map((feature: Feature) => feature.maxY)
            .max()
            .value();

        return {
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            width: xmax - xmin,
            height: ymax - ymin,
            mirror: ymin + ymax
        };
    }

    /**
     * Box for displaying the collection of features (includes padding so that
     * the stroke-width of the drawn features does not get cut in half by the
     * outline box).
     */
    displayOutline(): Outline {
        const padding = OUTLINE_PADDING;

        const outline = this.outline();

        const xmin = outline.xmin - padding;
        const ymin = outline.ymin - padding;
        const xmax = outline.xmax + padding;
        const ymax = outline.ymax + padding;

        return {
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            width: xmax - xmin,
            height: ymax - ymin,
            mirror: ymin + ymax
        };
    }

    /**
     * Copy this collection and its features for the given dimensionable
     * (Board, PlacedModule, etc).
     */
    public cloneCollection(): FeatureCollection {
        const collection = new FeatureCollection();
        this.each((feature: Feature) => {
            const copy = new Feature(feature.toResource());
            collection.add(copy);
        });
        return collection;
    }

    toString(): string {
        const features = this.map((feature: Feature) => feature.toString());
        return features.join('\n');
    }
}
