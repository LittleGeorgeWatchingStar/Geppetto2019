import {
    createSpatialIndexer,
    SpatialIndexerItemType
} from "../../../src/path/spatialindexer/SpatialIndexer";
import {BoardBuilder} from "../../board/BoardBuilder";
import {Polyline} from "../../../src/utils/geometry";
import {BoundaryEdge} from "../../../src/path/spatialindexer/RBushSpatialIndexerAdaptor";

describe('PathFinder3', () => {
    describe('boundary', () => {
        describe('board radius', () => {
            let radius = 100;
            let board = new BoardBuilder()
                .withWidth(400)
                .withHeight(400)
                .withRadius(radius)
                .build();
            let spatialIndexer = createSpatialIndexer()
                .insertBoundary(board);
            describe('collides', () => {
                it('works on bottom left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.collides(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0))).toEqual(true);
                        expect(spatialIndexer.collides(Polyline.square({x: 100 - deltaXInside , y: 100 - deltaYInside}, 0))).toEqual(false);
                    }
                });
                it('works on top left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.collides(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0))).toEqual(true);
                        expect(spatialIndexer.collides(Polyline.square({x: 100 - deltaXInside , y: 300 + deltaYInside}, 0))).toEqual(false);
                    }
                });
                it('works on top right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.collides(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0))).toEqual(true);
                        expect(spatialIndexer.collides(Polyline.square({x: 300 + deltaXInside , y: 300 + deltaYInside}, 0))).toEqual(false);
                    }
                });
                it('works on bottom right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.collides(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0))).toEqual(true);
                        expect(spatialIndexer.collides(Polyline.square({x: 300 + deltaXInside , y: 100 - deltaYInside}, 0))).toEqual(false);
                    }
                });
            });
            describe('intersects', () => {
                it('works on bottom left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0)).every(item => item === 'board')).toEqual(true);
                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXInside , y: 100 - deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on top left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0)).every(item => item === 'board')).toEqual(true);
                        expect(spatialIndexer.intersects(Polyline.square({x: 100 - deltaXInside , y: 300 + deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on top right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0)).every(item => item === 'board')).toEqual(true);
                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXInside , y: 300 + deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on bottom right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0)).every(item => item === 'board')).toEqual(true);
                        expect(spatialIndexer.intersects(Polyline.square({x: 300 + deltaXInside , y: 100 - deltaYInside}, 0))).toEqual([]);
                    }
                });
            });
            describe('intersectRectangles', () => {
                it('works on bottom left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0)).every(item => item.type === SpatialIndexerItemType.BOARD)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 100 - deltaYOutside}, 0)).some(item => item.data['edge'] === BoundaryEdge.BOTTOM_LEFT)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXInside , y: 100 - deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on top left', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0)).every(item => item.type === SpatialIndexerItemType.BOARD)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXOutside , y: 300 + deltaYOutside}, 0)).some(item => item.data['edge'] === BoundaryEdge.TOP_LEFT)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 100 - deltaXInside , y: 300 + deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on top right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0)).every(item => item.type === SpatialIndexerItemType.BOARD)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 300 + deltaYOutside}, 0)).some(item => item.data['edge'] === BoundaryEdge.TOP_RIGHT)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXInside , y: 300 + deltaYInside}, 0))).toEqual([]);
                    }
                });
                it('works on bottom right', () => {
                    for (let angle = 1; angle < 90; angle++) {
                        const deltaXInside = Math.cos(angle * Math.PI / 180) * (radius - 0.0001);
                        const deltaYInside = Math.sin(angle * Math.PI / 180) * (radius - 0.0001);

                        const deltaXOutside = Math.cos(angle * Math.PI / 180) * (radius + 0.0001);
                        const deltaYOutside = Math.sin(angle * Math.PI / 180) * (radius + 0.0001);

                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0)).length).toBeGreaterThan(0);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0)).every(item => item.type === SpatialIndexerItemType.BOARD)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXOutside , y: 100 - deltaYOutside}, 0)).some(item => item.data['edge'] === BoundaryEdge.BOTTOM_RIGHT)).toEqual(true);
                        expect(spatialIndexer.intersectRectangles(Polyline.square({x: 300 + deltaXInside , y: 100 - deltaYInside}, 0))).toEqual([]);
                    }
                });
            });
        });
    });
});