import {Point, Polyline} from "../../utils/geometry";
import {Feature} from "./Feature";
import {FeatureCollection} from "./FeatureCollection";

export interface Footprint {
    polylines: Polyline[];
    features: FeatureCollection;
}

export interface Outline {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    width: number;
    height: number;
    mirror: number;
}

export function makeFootprint(features: Feature[],
                              startAtOrigin = true): Footprint | null {
    features = features.slice(); // Clone features.

    const popMatchingFeature = (point: Point) => {
        for (let i = 0; i < features.length; i += 1) {
            const feature = features[i];
            if (feature.contains(point)) {
                const match = feature;
                features.splice(i, 1);
                return match;
            }
        }
    };

    const polylines: Polyline[] = [];
    const orderedFeatures: Feature[] = [];

    let firstPoint: Point;
    if (startAtOrigin) {
        firstPoint = new Point(0, 0);
    } else {
        firstPoint = features[0].points[0];
    }

    let currentPolylinePoints = [firstPoint];
    while(features.length) {
        if (!currentPolylinePoints.length) {
            const currentFirstFeature = features.shift();
            currentPolylinePoints = currentFirstFeature.points.slice();
            orderedFeatures.push(currentFirstFeature);
        }

        const startPoint = currentPolylinePoints[0];
        const lastPoint = currentPolylinePoints[currentPolylinePoints.length - 1];

        const nextFeature = popMatchingFeature(lastPoint);
        if (!nextFeature) {
            break;
        }

        orderedFeatures.push(nextFeature);
        const newLastPoint = nextFeature.getOtherEnd(lastPoint);
        if (startPoint.equals(newLastPoint)) {
            polylines.push(new Polyline(currentPolylinePoints));
            currentPolylinePoints = [];
        } else {
            currentPolylinePoints.push(newLastPoint);
        }
    }

    if (!polylines.length) {
        return null;
    }

    return {
        polylines: polylines,
        features: new FeatureCollection(orderedFeatures),
    }
}
