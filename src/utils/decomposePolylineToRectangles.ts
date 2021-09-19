import {Point, Polyline} from "./geometry";

/**
 * This function might not play well with not rectilinear polylines.
 */
export function decomposePolylineToRectangles(polyline: Polyline): Polyline[] {
    const rectangles = [];
    const points = polyline.points;
    const xSet = new Set<number>();
    const ySet = new Set<number>();
    for (const point of points) {
        xSet.add(point.x);
        ySet.add(point.y);
    }
    const xs = Array.from<number>(xSet).sort((a, b) => a - b);
    const ys = Array.from<number>(ySet).sort((a, b) => a - b);

    for (let i = 1; i < xs.length; i++) {
        const x0 = xs[i - 1];
        const x1 = xs[i];

        for (let j = 1; j < ys.length; j++) {
            const y0 = ys[j - 1];
            const y1 = ys[j];

            const rectangle = new Polyline([
                {x: x0, y: y0},
                {x: x0, y: y1},
                {x: x1, y: y1},
                {x: x1, y: y0},
            ]);

            const centrePoint = new Point((x1 + x0) / 2, (y1 + y0) / 2);
            if (polyline.contains(centrePoint)) {
                rectangles.push(rectangle);
            }
        }
    }

    return rectangles;
}