import {Line, Point, Polyline} from "utils/geometry";

describe("geometry.Point", function () {

    it("is initialized correctly", function () {
        const p = new Point(1, 2);
        expect(p.x).toEqual(1);
        expect(p.y).toEqual(2);
    });

    it("origin constructor works", function () {
        const p = Point.origin();
        expect(p.x).toEqual(0);
        expect(p.y).toEqual(0);
    });

    it("can identify identical points", function () {
        const p1 = new Point(1, 2);
        const p2 = new Point(1, 2);
        expect(p1.equals(p2)).toBe(true);
    });

    it("can identify different points", function () {
        const p1 = new Point(1, 2);
        const p2 = new Point(2, 2);
        expect(p1.equals(p2)).toBe(false);
    });

    it("can be rotated immutably", function () {
        const p1 = new Point(1, 2),
            p2 = p1.rotate();

        expect(p1).not.toBe(p2);
        // p1 is unchanged
        expect(p1.x).toEqual(1);
        expect(p1.y).toEqual(2);

        // p2 is rotated
        expect(p2.x).toEqual(-2);
        expect(p2.y).toEqual(1);
    });

    it("renders as a string correctly", function () {
        const p = new Point(1.5, 2.0);
        expect(p.toString()).toEqual('(1.5,2)');
    });
});

describe("geometry.Line", function () {
    it("is initialized correctly", function () {
        const l = new Line({x: 1, y: 2}, {x: 3, y: 4});
        expect(l.points.length).toEqual(2);
        expect(l.points[0].x).toEqual(1);
        expect(l.points[0].y).toEqual(2);
        expect(l.points[1].x).toEqual(3);
        expect(l.points[1].y).toEqual(4);
    });

    it("can be rotated immutably", function () {
        const line1 = new Line({x: 1, y: 2}, {x: 3, y: 4}),
            line2 = line1.rotate();

        expect(line1).not.toBe(line2);

        // line1 is unchanged
        expect(line1.points[0].x).toEqual(1);
        expect(line1.points[0].y).toEqual(2);
        expect(line1.points[1].x).toEqual(3);
        expect(line1.points[1].y).toEqual(4);

        // line2 is rotated
        expect(line2.points[0].x).toEqual(-2);
        expect(line2.points[0].y).toEqual(1);
        expect(line2.points[1].x).toEqual(-4);
        expect(line2.points[1].y).toEqual(3);
    });

    it("compares equality correctly", function () {
        const p1 = {x: 1, y: 2},
            p2 = {x: 3, y: 4},
            p3 = {x: 3, y: 5},

            line1a = new Line(p1, p2),
            // line1b is line1a backwards
            line1b = new Line(p2, p1),
            // line2 is just different
            line2 = new Line(p1, p3);

        expect(line1a.equals(line1a)).toBe(true);
        expect(line1a.equals(line1b)).toBe(true);
        expect(line1b.equals(line1a)).toBe(true);

        expect(line1a.equals(line2)).toBe(false);
    });

    it("renders as a string correctly1", function () {
        const l = new Line({x: 1, y: 2}, {x: 3, y: 4});
        expect(l.toString()).toEqual('Segment[(1,2),(3,4)]');
    });

    it("intersects segment", function () {
        const line1 = new Line({x: 1, y: 1}, {x: 5, y: 5});
        const line2 = new Line({x: 2, y: 1}, {x: 1, y: 2});
        expect(line1.intersection(line2).toString()).toEqual('(2,2)');

        const line3 = new Line({x: 5, y: 0}, {x: 5, y: 6});
        expect(line1.intersection(line3).toString()).toEqual('(5,5)');

    });

    it("intersects polyline", function () {
        const line1 = new Line({x: 1, y: 1}, {x: 5, y: 5});
        const polyline1 = new Polyline([new Point(1, 1), new Point(5, 1), new Point(5, 5), new Point(1, 50)]);
        expect(line1.intersect(polyline1).toString()).toContain('(1,1)');
        expect(line1.intersect(polyline1).toString()).toContain('(5,5)');

        const polyline2 = new Polyline([new Point(3, 2), new Point(5, 2), new Point(5, 4), new Point(3, 4)]);
        expect(line1.intersect(polyline2).toString()).toContain('(3,3)');
        expect(line1.intersect(polyline2).toString()).toContain('(4,4)');
    });

});

describe("geometry.Polyline", function () {

    /*
     * Returns a 5x5 box
     */
    function getBox(): Polyline {
        return new Polyline([
            {x: 0, y: 0},
            {x: 4, y: 0},
            {x: 4, y: 4},
            {x: 0, y: 4}
        ]);
    }

    it("can define a triangle", function () {
        const pl = new Polyline([
            {x: 0, y: 0},
            {x: 2, y: 0},
            {x: 2, y: 2}
        ]);

        expect(pl.lines().length).toEqual(3);
    });

    it("can calculate the area", function () {
        const pl = new Polyline([
            {x: 1, y: 1},
            {x: 3, y: 1},
            {x: 3, y: 2},
            {x: 1, y: 2}
        ]);
        expect(pl.area()).toEqual(2);
    });

    it("knows when it has a vertex", function () {
        const pl = new Polyline([
            {x: -4, y: 3},
            {x: -1, y: 3},
            {x: -3, y: 4.2},
        ]);

        expect(pl.hasVertex({x: -4, y: 3})).toBe(true);
        expect(pl.hasVertex({x: -3, y: 4.2})).toBe(true);

        expect(pl.hasVertex({x: -4, y: 4.2})).toBe(false);
        expect(pl.hasVertex({x: 0, y: 0})).toBe(false);
    });

    describe("left edge", function () {
        /*
         * 4     +-------+
         * 3     |       |
         * 2     |       |
         * 1   x x x     |
         * 0     +-------+
         *    -1 0 1 2 3 4
         */

        const box = getBox();

        it("knows when it contains a point", function () {
            const inside = {x: 1, y: 1};
            expect(box.contains(inside)).toBe(true);
        });

        it("contains points that rests on the edge", function () {
            const onEdge = {x: 0, y: 1};
            expect(box.contains(onEdge)).toBe(true);
        });

        it("knows when a point is outside", function () {
            const outside = {x: -1, y: 1};
            expect(box.contains(outside)).toBe(false);
        });
    });

    describe("right edge", function () {
        /*
         * 4  +-------+
         * 3  |     x x x
         * 2  |       |
         * 1  |       |
         * 0  +-------+
         *    0 1 2 3 4 5
         */

        const box = getBox();

        it("knows when it contains a point", function () {
            const inside = {x: 3, y: 3};
            expect(box.contains(inside)).toBe(true);
        });

        it("contains points that rest on the edge", function () {
            const onEdge = {x: 4, y: 3};
            expect(box.contains(onEdge)).toBe(true);
        });

        it("knows when a point is outside", function () {
            const outside = {x: 5, y: 3};
            expect(box.contains(outside)).toBe(false);
        });
    });


    describe("bottom edge", function () {
        /* 5        x
         * 4  +-----x-+
         * 3  |     x |
         * 2  |       |
         * 1  |       |
         * 0  +-------+
         *    0 1 2 3 4
         */

        const box = getBox();

        it("knows when it contains a point", function () {
            const inside = {x: 3, y: 3};
            expect(box.contains(inside)).toBe(true);
        });

        it("contains points that rest on the edge", function () {
            const onEdge = {x: 3, y: 4};
            expect(box.contains(onEdge)).toBe(true);
        });

        it("knows when a point is outside", function () {
            const outside = {x: 3, y: 5};
            expect(box.contains(outside)).toBe(false);
        });
    });

    describe("top edge", function () {
        /*
        *  4  +-------+
        *  3  |       |
        *  2  |       |
        *  1  | x     |
        *  0  +-x-----+
        * -1    x
        *     0 1 2 3 4
        */

        const box = getBox();

        it("knows when it contains a point", function () {
            const inside = {x: 1, y: 1};
            expect(box.contains(inside)).toBe(true);
        });

        it("contains points that rest on the edge", function () {
            const onEdge = {x: 1, y: 0};
            expect(box.contains(onEdge)).toBe(true);
        });

        it("knows when a point is outside", function () {
            const outside = {x: 1, y: -1};
            expect(box.contains(outside)).toBe(false);
        });
    });

    /**
     * A and B fully overlap
     * B and C share a corner
     * C and D partially share an edge
     *
     *     6                +---+
     *     5           +----+D  |
     *     4           |C   +---+
     *     3    +------+----+
     *     2 +--|B     |
     *     1 |A +------+
     *     0 |     |
     *    -1 +-----+
     *      -1  0  1  2  3  4  5
     */
    it("Intersects another polyline", function () {
        const A = new Polyline([
            {x: -1, y: -1},
            {x:  1, y: -1},
            {x:  1, y:  2},
            {x: -1, y:  2},
        ]);

        const B = new Polyline([
            {x: 0, y: 1},
            {x: 2.3, y: 1},
            {x: 2.3, y: 3},
            {x: 0, y: 3}
        ]);

        const C = new Polyline([
            {x: 2.3, y: 3},
            {x: 4,   y: 3},
            {x: 4,   y: 5},
            {x: 2.3, y: 5}
        ]);

        const D = new Polyline([
            {x: 4,   y: 4},
            {x: 5.2, y: 4},
            {x: 5.2, y: 5},
            {x: 4,   y: 5}
        ]);

        expect(A.intersects(B)).toBe(true, "A & B");
        expect(A.intersects(C)).toBe(false, "A & C");

        // An "overlap" of area == 0 does not count as an intersection,
        // for our purposes. (Watch out for floating point rounding here!)
        expect(B.intersects(C)).toBe(false, "B & C");
        expect(C.intersects(D)).toBe(false, "C & D");
    });

    /**
     * A completely contains B
     * A and C share two edges
     *
     *     4
     *     3 +---------+----+
     *     2 |A +--+   |C   |
     *     1 |  |B |   +----+
     *     0 |  +--+        |
     *    -1 +--------------+
     *      -1  0  1  2  3  4  5
     */
    it("Contains another polyline", function () {
        const A = Polyline.rectangle({x: -1, y: 1}, 5, 4);

        const B = Polyline.rectangle({x: 0, y: 0}, 1, 2);

        const C = new Polyline([
            {x: 2.3, y: 1},
            {x: 4,   y: 1},
            {x: 4,   y: 3},
            {x: 2.3, y: 3}
        ]);

        expect(A.intersects(A)).toBe(true, "A & A");
        expect(A.intersects(B)).toBe(true, "A & B");
        expect(A.intersects(C)).toBe(true, "A & C");
    });
});


