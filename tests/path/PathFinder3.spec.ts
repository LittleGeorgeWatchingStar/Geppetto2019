import {Point, Polyline} from "../../src/utils/geometry";
import {createSpatialIndexer} from "../../src/path/spatialindexer/SpatialIndexer";
import PathFinder from "../../src/path/PathFinder";
import {PathFinder3, SegmentedPath} from "../../src/path/PathFinder3";
import {BoardBuilder} from "../board/BoardBuilder";

describe('PathFinder3', () => {
    /**
     * 1800 +   E   +   E1  +   E2  +   +   +
     *          ^       ^       ^
     * 1700 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     * 1600 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     * 1500 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     * 1400 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     * 1300 +   +   +   +   +   + < + < +   +
     *          ^       ^               ^
     * 1200 +   +   +   + < + < +   +   +   +
     *          ^               ^       ^
     * 1100 +   + < + < +   +   +   +   +   +
     *                  ^       ^       ^
     * 1000 +---+---+   +   +   +   +   +   +
     *      |       |   ^       ^       ^
     *  900 +   +   +   +   +   +   +   +   +
     *      |       |   ^       ^       ^
     *  800 +---+---+   +   +   +   +   +   +
     *                  ^       ^       ^
     *  700 +   + > + > +   +   +   +   +   +
     *          ^               ^       ^
     *  600 +   +   +   + > + > +   +   +   +
     *          ^       ^               ^
     *  500 +   +   +   +   +   + > + > +   +
     *          ^       ^       ^
     *  400 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     *  300 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     *  200 +   +   +   +   +   +   +   +   +
     *          ^       ^       ^
     *  100 +   +   +   +   +   +   +   +   +
                ^       ^       ^
     *    0 +   S   +   S1  +   S2  +   +   +
     */
    it('can push existing paths', () => {
        const spec = {width: 198, minLength: 0, maxLength: 20000};
        const board = new BoardBuilder()
            .withWidth(800)
            .withHeight(1800)
            .build();
        const obstacle = {
            uuid: 'obstacle-uuid',
            pathKeepouts: [Polyline.square({x: 0, y: 800}, 200)],
            setOverlaps: () => {},
        };
        const spatialIndexer = createSpatialIndexer()
            .insertBoundary(board)
            .insertObstacles([obstacle]);

        const finder = new PathFinder(spatialIndexer);

        const path1 = finder.findPath({
            uuid: 'path1',
            spec: spec,
            start: new Point(300, 0),
            end: new Point(300, 1800),
        });

        const path2 = finder.findPath({
            uuid: 'path2',
            spec: spec,
            start: new Point(500, 0),
            end: new Point(500, 1800),
        });

        const existingPaths = [path1, path2];

        const finder3 = new PathFinder3(spatialIndexer, existingPaths);
        const results = finder3.findPath({
            uuid: 'path',
            spec: spec,
            start: new Point(100, 0),
            end: new Point(100, 1800),
        });

        expect(results.validPaths.length).toEqual(3);
        expect(results.invalidPaths.length).toEqual(0);

        const newPath = results.validPaths.find(path => path.uuid === 'path');
        const newPath1 = results.validPaths.find(path => path.uuid === 'path1');
        const newPath2 = results.validPaths.find(path => path.uuid === 'path2');

        expect(newPath.length).toEqual(1800 + 400);
        expect(newPath1.length).toEqual(1800 + 400);
        expect(newPath2.length).toEqual(1800 + 400);

        expect(newPath.nodes.some(node => node.x === 300)).toEqual(true);
        expect(newPath1.nodes.some(node => node.x === 500)).toEqual(true);
        expect(newPath2.nodes.some(node => node.x === 700)).toEqual(true);
    });

    it('returns invalid path and existing path if it can not push existing paths', () => {
        const spec = {width: 198, minLength: 0, maxLength: 20000};
        const board = new BoardBuilder()
            .withWidth(700) // Don't give the paths enough space.
            .withHeight(1800)
            .build();
        const obstacle = {
            uuid: 'obstacle-uuid',
            pathKeepouts: [Polyline.square({x: 0, y: 800}, 200)],
            setOverlaps: () => {},
        };
        const spatialIndexer = createSpatialIndexer()
            .insertBoundary(board)
            .insertObstacles([obstacle]);

        const finder = new PathFinder(spatialIndexer);

        const path1 = finder.findPath({
            uuid: 'path1',
            spec: spec,
            start: new Point(300, 0),
            end: new Point(300, 1800),
        });

        const path2 = finder.findPath({
            uuid: 'path2',
            spec: spec,
            start: new Point(500, 0),
            end: new Point(500, 1800),
        });

        const existingPaths = [path1, path2];

        const finder3 = new PathFinder3(spatialIndexer, existingPaths);
        const results = finder3.findPath({
            uuid: 'path',
            spec: spec,
            start: new Point(100, 0),
            end: new Point(100, 1800),
        });

        expect(results.validPaths.length).toEqual(2);
        expect(results.invalidPaths.length).toEqual(1);

        const newPath = results.invalidPaths.find(path => path.uuid === 'path');
        const newPath1 = results.validPaths.find(path => path.uuid === 'path1');
        const newPath2 = results.validPaths.find(path => path.uuid === 'path2');

        expect(newPath1.length).toEqual(1800);
        expect(newPath2.length).toEqual(1800);

        expect(newPath1.nodes.every(node => node.x === 300)).toEqual(true);
        expect(newPath2.nodes.every(node => node.x === 500)).toEqual(true);
    });
});

describe('SegmentedPath', () => {
    let start = new Point(0, 0);
    let end = new Point(1000, 0);
    let spec = {width: 20, minLength: 0, maxLength: 2000};
    let spatialIndexer = createSpatialIndexer();

    let finder = new PathFinder(spatialIndexer);

    let path = finder.findPath({
        uuid: 'uuid',
        spec: spec,
        start: start,
        end: end,
    });

    describe('fromValidPath', () => {
       it ('has correct end points', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            expect(segmentedPath.startSegment.start.equals(path.start)).toEqual(true);
            expect(segmentedPath.startSegment.end.equals({x: 460, y: 0})).toEqual(true);

            expect(segmentedPath.endSegment.start.equals({x: 540, y: 0})).toEqual(true);
            expect(segmentedPath.endSegment.end.equals(path.end)).toEqual(true);
        });

        it ('has correct lengths', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);

            expect(segmentedPath.startSegment.length).toEqual(460);
            expect(segmentedPath.endSegment.length).toEqual(460);
        });

        it ('cuts the correct nodes', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);

            expect(segmentedPath.startSegment.nodes.length).toEqual(24);
            expect(segmentedPath.endSegment.nodes.length).toEqual(24);

            segmentedPath.startSegment.nodes.forEach((node, index) => {
                expect(Point.copy(node).equals(path.nodes[index]));
            });
            segmentedPath.endSegment.nodes.reverse().forEach((node, index) => {
                expect(Point.copy(node).equals(path.nodes[path.nodes.length - index - 1]));
            });
        });

        it ('does not cut the start nodes', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 48); // 50 is the start node.

            expect(segmentedPath.startSegment.nodes.length).toEqual(2);
            expect(segmentedPath.endSegment.nodes.length).toEqual(47);
        });

        it ('does not cut the end nodes', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 2); // 0 is the end node.

            expect(segmentedPath.startSegment.nodes.length).toEqual(47);
            expect(segmentedPath.endSegment.nodes.length).toEqual(2);
        });

        it ('return null if no nodes can be cut', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 50);

            expect(segmentedPath).toBeNull();
        });
    });

    describe('updateStartSegment', () => {
        it ('cut nodes from start segment', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            segmentedPath.updateStartSegment(10);

            expect(segmentedPath.startSegment.nodes.length).toEqual(12);
            segmentedPath.startSegment.nodes.forEach((node, index) => {
                expect(Point.copy(node).equals(path.nodes[index]));
            });
        });

        it ('does not cut the start nodes', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            segmentedPath.updateStartSegment(23);

            expect(segmentedPath.startSegment.nodes.length).toEqual(2);
        });

        it ('returns true if nodes has been cut', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            const updated = segmentedPath.updateStartSegment(10);

            expect(updated).toEqual(true);
        });

        it ('returns false if nodes has not been cut', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 48);
            const updated = segmentedPath.updateStartSegment(0);

            expect(updated).toEqual(false);
        });
    });

    describe('updateEndSegment', () => {
        it ('cut nodes from end segment', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            segmentedPath.updateEndSegment(13);

            expect(segmentedPath.endSegment.nodes.length).toEqual(12);
            segmentedPath.endSegment.nodes.forEach((node, index) => {
                expect(Point.copy(node).equals(path.nodes[index]));
            });
        });

        it ('does not cut the end nodes', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            segmentedPath.updateEndSegment(0);

            expect(segmentedPath.endSegment.nodes.length).toEqual(2);
        });

        it ('returns true if nodes has been cut', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);
            const updated = segmentedPath.updateEndSegment(9);

            expect(updated).toEqual(true);
        });

        it ('returns false if nodes has not been cut', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 2);
            const updated = segmentedPath.updateEndSegment(0);

            expect(updated).toEqual(false);
        });
    });

    describe('createCompletePath', () => {
        it('creates a complete path', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);

            const segmentedPathLength = segmentedPath.startSegment.length + segmentedPath.endSegment.length;
            const middleSegment = finder.findPath({
                uuid: segmentedPath.originalPath.uuid,
                spec: {
                    width: segmentedPath.originalPath.spec.width,
                    minLength: Math.min(0 , segmentedPath.originalPath.spec.minLength - segmentedPathLength),
                    maxLength: segmentedPath.originalPath.spec.maxLength - segmentedPathLength,
                },
                start: segmentedPath.startSegment.end,
                end: segmentedPath.endSegment.start
            });

            const completePath = segmentedPath.createCompletePath(middleSegment);

            expect(completePath.uuid).toEqual(path.uuid);
            expect(completePath.spec).toEqual(path.spec);
            expect(completePath.nodes.length).toEqual(51);
            expect(completePath.length).toEqual(1000);
        });

        it('creates a complete path without overlaps', () => {
            const segmentedPath = SegmentedPath.fromValidPath(path, 25);

            const segmentedPathLength = segmentedPath.startSegment.length + segmentedPath.endSegment.length;
            const middleSegment = finder.fromNodes(
                'uuid',
                [
                    {x: 540, y: 0},
                    {x: 520, y: 0},
                    {x: 500, y: 0},
                    {x: 480, y: 0},
                    {x: 460, y: 0},
                    {x: 440, y: 0}, // Loop starts here.
                    {x: 420, y: 0},
                    {x: 400, y: 0},
                    {x: 420, y: 0},
                    {x: 440, y: 0},
                    {x: 460, y: 0},
                ],
                {
                    width: segmentedPath.originalPath.spec.width,
                    minLength: Math.min(0 , segmentedPath.originalPath.spec.minLength - segmentedPathLength),
                    maxLength: segmentedPath.originalPath.spec.maxLength - segmentedPathLength,
                },
                segmentedPath.startSegment.end,
                segmentedPath.endSegment.start
            );

            const completePath = segmentedPath.createCompletePath(middleSegment);

            expect(completePath.uuid).toEqual(path.uuid);
            expect(completePath.spec).toEqual(path.spec);
            expect(completePath.nodes.length).toEqual(51);
            expect(completePath.length).toEqual(1000);
        });
    });
});