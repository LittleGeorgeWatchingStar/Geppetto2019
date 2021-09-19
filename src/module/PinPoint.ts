import {Point, Polyline, Vector2D} from "../utils/geometry";
import {PinPointResource} from "./api";
import {Module} from "./Module";

export interface ViewableModule {
    outline;
    polylines: Polyline[];
    pinPoints: PinPoint[];
    edges: Point[][];
    features: Point[][];
    /** The mid X of the rectangle formed by pinpoints. Used for label placements. **/
    midX: number;
    /** The mid Y of the rectangle formed by pinpoints. Used for label placements. **/
    midY: number;
    isHorizontalOrientation: boolean;
    // CSS options for SVG are very limited. This is a workaround to keep square-ish/tall modules from looking huge.
    shouldConstrainSize: boolean;
}

/**
 * TODO: 'VCC_3.3&VCC_5.0' will be come '3350', even though it's not a pin.
 * The value/name of a pin sans non-numeric characters.
 * Some pins are named 'P10' while others are named 'PIN10';
 * this allows finding pins based on their ID number only.
 */
export function normalizePinName(value: string): string {
    return value.replace(/\D/g,'') || value;
}

/**
 * Convert a module's SVG data to a render-friendly version for display in Custom Modules.
 * This is to organize the data transformations on Module points.
 * @see PinPointsView
 */
export function moduleToViewableData(module: Module): ViewableModule {

    /**
     * The default viewbox has some padding that causes the position to be inaccurate.
     */
    const outline = (() => {
        const defaultOutline = module.getOutline();
        const pad = 5;
        return {
            xmin: defaultOutline.xmin + pad,
            ymin: defaultOutline.ymin + pad,
            width: defaultOutline.width - pad * 2,
            height: defaultOutline.height - pad * 2,
        };
    })();

    const shouldConstrainSize = (() => {
        const ratio = 3 / 4;
        const max = Math.max(outline.width);
        const min = Math.min(outline.height);
        return min / max > ratio || outline.height > outline.width;
    })();

    const yMax = outline.height + outline.ymin;
    const pinPoints = module.pinpoints.map(p => makePinPoint(p, yMax));
    const pinPointsBoundary = makePinPointBoundary(pinPoints);
    let numXRow = 0;
    let numYRow = 0;
    for (const pinpoint of pinPoints) {
        if (pinpoint.position.y === pinPointsBoundary.yMin ||
            pinpoint.position.y === pinPointsBoundary.yMax) {
            ++numYRow;
        }
        if (pinpoint.position.x === pinPointsBoundary.xMin ||
            pinpoint.position.x === pinPointsBoundary.xMax) {
            ++numXRow;
        }
    }

    return {
        outline: outline,
        polylines: module.getFootprintPolylines(),
        pinPoints: pinPoints,
        features: makeMirroredPoints(module.features, yMax),
        edges: makeMirroredPoints(module.features.filter(f => f.isType('edge')), yMax),
        midX: (pinPointsBoundary.xMax - pinPointsBoundary.xMin) / 2,
        midY: yMax - (pinPointsBoundary.yMax - pinPointsBoundary.yMin) / 2,
        isHorizontalOrientation: numXRow < numYRow,
        shouldConstrainSize: shouldConstrainSize
    };
}

export interface PinPoint {
    pinNumber: string;
    position: Vector2D;
}

/**
 * Convert a PinPointResource to a camelCase, render-friendly version.
 * @param yMax: Browser coordinates start (0,0) in the upper-left corner,
 * while cartesian coordinates start (0,0) in the bottom-left corner. We need to compensate for that.
 */
function makePinPoint(resource: PinPointResource, yMax: number): PinPoint {
    return {
        pinNumber: normalizePinName(resource.net_name),
        position: {
            y: yMax - resource.position.y,
            x: resource.position.x
        }
    };
}

/**
 * Mirrored for the same reason as PinPoint (browser vs cartesian coordinates).
 */
function makeMirroredPoints(features, yMax: number): Point[][] {
    return features.map(feature => feature.points.map(point => {
        return {
            x: point.x,
            y: yMax - point.y
        }
    }));
}

function makePinPointBoundary(pinPoints: PinPoint[]) {
    const boundary = {
        xMax: 0,
        yMax: 0,
        xMin: Infinity,
        yMin: Infinity
    };
    for (const pinpoint of pinPoints) {
        if (pinpoint.position.x > boundary.xMax) {
            boundary.xMax = pinpoint.position.x;
        }
        if (pinpoint.position.x < boundary.xMin) {
            boundary.xMin = pinpoint.position.x;
        }
        if (pinpoint.position.y > boundary.yMax) {
            boundary.yMax = pinpoint.position.y;
        }
        if (pinpoint.position.y < boundary.yMin) {
            boundary.yMin = pinpoint.position.y;
        }
    }
    return boundary;
}
