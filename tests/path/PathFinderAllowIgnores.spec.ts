import {Point} from "utils/geometry";
import {Path, PathObstacle} from "../../src/path/Path";
import {createSpatialIndexer} from "../../src/path/spatialindexer/SpatialIndexer";
import {Board} from "../../src/model/Board";
import {BoardBuilder} from "../board/BoardBuilder";
import {PathSpec} from "../../src/connection/PathSpec";
import PathFinderAllowIgnores from "../../src/path/PathFinderAllowIgnores";


const DEFAULT_BOUNDARY = new BoardBuilder()
    .withPosition(-1000, -1000)
    .withWidth(2000)
    .withHeight(2000)
    .build();

function findPath(start: Point,
                  end: Point,
                  spec: PathSpec,
                  modules: PathObstacle[],
                  boundary: Board = DEFAULT_BOUNDARY,
                  existingPaths: Path[] = [],
                  uuid: string = 'uuid',
                  ignoredUuids: Set<string> = new Set<string>()): Path {
    const spatialIndexer = createSpatialIndexer()
        .insertBoundary(boundary)
        .insertObstacles(modules)
        .insertPaths(existingPaths);

    const finder = new PathFinderAllowIgnores(spatialIndexer, ignoredUuids);
    // finder.logger = new SvgLogger();
    const path = finder.findPath({
        uuid: uuid,
        spec: spec,
        start: start,
        end: end,
    });
    // console.log(finder.logger.toString());
    return path;
}


describe("PathFinderAllowIgnores", () => {

    /**
     * Other path = %
     * Existing path = X
     * New path = #
     *
     * +   +   +   +   +
     * % % % % % % % % %
     * +   +   #   +   +
     *         #
     * X X X X # X X X X
     *         #
     * +   +   #   +   +
     *         #
     * O   +   #   +   +
     */
    it('can ignore ignored uuids', () => {
        const boundary = new BoardBuilder()
            .withPosition(0 , 0)
            .withWidth(40)
            .withHeight(40)
            .build();

        const otherPath = findPath(
            new Point(0, 35),
            new Point(40, 35),
            {width: 5, minLength: 0, maxLength: 100},
            [],
            boundary,
            [],
            'other'
        );

        const existingPath = findPath(
            new Point(0, 20),
            new Point(40, 20),
            {width: 5, minLength: 0, maxLength: 100},
            [],
            boundary,
            [],
            'existing'
        );

        const path = findPath(
            new Point(20, 0),
            new Point(20, 40),
            {width: 5, minLength: 0, maxLength: 100},
            [],
            boundary,
            [otherPath, existingPath],
            'uuid',
            new Set<string>(['existing'])
        );

        expect(path.isComplete).toEqual(false);

        path.blockingPathNodes.forEach(node => {
            expect(node.uuid).toEqual('other');
        });
    });
});
