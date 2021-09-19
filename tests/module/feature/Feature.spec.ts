import {Feature} from "../../../src/module/feature/Feature";
import {Point} from 'utils/geometry';
import {FeatureBuilder} from './FeatureBuilder';

describe("Feature", function () {
    const defaultPoints = [
        {x: 1, y: 0},
        {x: 3, y: 0}
    ];

    it("can be loaded successfully", function () {
        expect(Feature).not.toBe(undefined);
    });

    it("knows when it's an edge", function () {
        const edge = FeatureBuilder.edge();
        expect(edge.isEdge()).toBe(true);

        const footprint = FeatureBuilder.footprint();
        expect(footprint.isEdge()).toBe(false);
    });

    describe("points", function () {
        it("instantiates Point objects", function () {
            const feature = new FeatureBuilder().build();
            expect(feature.points[0].round).toBeDefined();
        });

        it("knows when points are equal", function () {
            const feature = new FeatureBuilder().withPoints(defaultPoints).build();
            expect(feature.arePointsEqual([
                {x: 1, y: 0},
                {x: 3, y: 0},
            ])).toBe(true);
        });
    });

    describe("direction", function () {
        it("knows when it is horizontal", function () {
            const points = [
                {x: 1, y: 0},
                {x: 3, y: 0}
            ];
            const footprint = new FeatureBuilder().withPoints(points).build();
            expect(footprint.isHorizontal()).toBe(true);
        });

        it("knows when it is vertical", function () {
            const points = [
                {x: 1, y: 0},
                {x: 1, y: 2}
            ];
            const footprint = new FeatureBuilder().withPoints(points).build();
            expect(footprint.isVertical()).toBe(true);
        });

        it("knows when it is neither", function () {
            const points = [
                {x: 2, y: 0},
                {x: 1, y: 2}
            ];
            const footprint = new FeatureBuilder().withPoints(points).build();
            expect(footprint.isHorizontal()).toBe(false);
            expect(footprint.isVertical()).toBe(false);
        });

        it("can be rotated", function () {
            const points = [
                {x: 1, y: 0},
                {x: 1, y: 2}
            ];
            const footprint = new FeatureBuilder().withPoints(points).build(); // a vertical line

            footprint.rotate();
            expect(footprint.isVertical()).toBe(false);
            expect(footprint.isHorizontal()).toBe(true);
            const start = footprint.points[0];
            expect(start.x).toEqual(0);
            expect(start.y).toEqual(1);
            expect(start.equals(new Point(0, 1))).toBe(true);

            const end = footprint.points[1];
            expect(end.equals(new Point(-2, 1))).toBe(true);
        });
    });
});
