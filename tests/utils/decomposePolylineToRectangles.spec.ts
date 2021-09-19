import {Point, Polyline} from "../../src/utils/geometry";
import {decomposePolylineToRectangles} from "../../src/utils/decomposePolylineToRectangles";

describe("ConnectionPath", () => {
    /**
     * +   +---+---+   +   +
     *     |       |
     * +   +   +   +   +   +
     *     |       |
     * +   +   +   +---+---+
     *     |               |
     * +   +   +   +   +   +
     *     |               |
     * +   +---+---+---+---+
     */
    it('works with right and top edges', () =>{
        const polyline = new Polyline([
            new Point(10, 0),
            new Point(10, 40),
            new Point(30, 40),
            new Point(30, 20),
            new Point(50, 20),
            new Point(50, 0),
        ]);

        const rectangles = decomposePolylineToRectangles(polyline);

        expect(rectangles.length).toEqual(3);
        expect(rectangles[0].toString()).toEqual('(10,0), (10,20), (30,20), (30,0)');
        expect(rectangles[1].toString()).toEqual('(10,20), (10,40), (30,40), (30,20)');
        expect(rectangles[2].toString()).toEqual('(30,0), (30,20), (50,20), (50,0)');
    });

    /**
     * +   +---+---+---+---+
     *     |               |
     * +   +   +   +   +   +
     *     |               |
     * +   +---+---+   +   +
     *             |       |
     * +   +   +   +   +   +
     *             |       |
     * +   +   +   +---+---+
     */
    it('works with left and bottom edges', () =>{
        const polyline = new Polyline([
            new Point(10, 20),
            new Point(10, 40),
            new Point(50, 40),
            new Point(50, 0),
            new Point(30, 0),
            new Point(30, 20),
        ]);

        const rectangles = decomposePolylineToRectangles(polyline);

        expect(rectangles.length).toEqual(3);
        expect(rectangles[0].toString()).toEqual('(10,20), (10,40), (30,40), (30,20)');
        expect(rectangles[1].toString()).toEqual('(30,0), (30,20), (50,20), (50,0)');
        expect(rectangles[2].toString()).toEqual('(30,20), (30,40), (50,40), (50,20)');
    });

    /**
     * 70 +---+---+---+---+---+---+---+---+---+---+
     *    |                                       |
     * 60 +   +---+---+---+---+---+---+---+---+   +
     *    |   |                               |   |
     * 50 +   +   +   +   +   +---+---+   +   +   +
     *    |   |               |       |       |   |
     * 40 +---+   +   +   +   +   +   +---+---+   +
     *                        |                   |
     * 30 +   +   +   +   +   +---+---+   +   +   +
     *                                |           |
     * 20 +---+   +   +   +   +   +   +---+---+   +
     *    |   |                               |   |
     * 10 +   +---+---+---+---+---+---+---+---+   +
     *    |                                       |
     *  0 +---+---+---+---+---+---+---+---+---+---+
     *   0   10   20  30  40  50  60  70  80  90  100
     */
    it('works on complex shaped polyline', () =>{
        const polyline = new Polyline([
            new Point(0, 0),
            new Point(0, 20),
            new Point(10, 20),
            new Point(10, 10),
            new Point(90, 10),
            new Point(90, 20),
            new Point(70, 20),
            new Point(70, 30),
            new Point(50, 30),
            new Point(50, 50),
            new Point(70, 50),
            new Point(70, 40),
            new Point(90, 40),
            new Point(90, 60),
            new Point(10, 60),
            new Point(10, 40),
            new Point(0, 40),
            new Point(0, 70),
            new Point(100, 70),
            new Point(100, 0),
        ]);

        const rectangles = decomposePolylineToRectangles(polyline);

        expect(rectangles.length).toEqual(22);
        expect(rectangles.some(rectangle => rectangle.contains({x: 5, y: 5}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 5, y: 15}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 15, y: 5}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 15, y: 15}))).toEqual(false);

        expect(rectangles.some(rectangle => rectangle.contains({x: 5, y: 65}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 5, y: 55}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 15, y: 65}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 15, y: 45}))).toEqual(false);

        expect(rectangles.some(rectangle => rectangle.contains({x: 95, y: 5}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 95, y: 15}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 5}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 15}))).toEqual(false);

        expect(rectangles.some(rectangle => rectangle.contains({x: 95, y: 65}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 95, y: 55}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 65}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 45}))).toEqual(false);

        expect(rectangles.some(rectangle => rectangle.contains({x: 55, y: 45}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 65, y: 45}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 55, y: 35}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 65, y: 35}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 75, y: 35}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 35}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 75, y: 25}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 85, y: 25}))).toEqual(true);
        expect(rectangles.some(rectangle => rectangle.contains({x: 45, y: 45}))).toEqual(false);
        expect(rectangles.some(rectangle => rectangle.contains({x: 55, y: 55}))).toEqual(false);
        expect(rectangles.some(rectangle => rectangle.contains({x: 65, y: 55}))).toEqual(false);
        expect(rectangles.some(rectangle => rectangle.contains({x: 75, y: 45}))).toEqual(false);
        expect(rectangles.some(rectangle => rectangle.contains({x: 65, y: 25}))).toEqual(false);
    });
});