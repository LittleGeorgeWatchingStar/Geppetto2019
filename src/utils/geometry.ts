/**
 * Geometry helper classes.
 */


/**
 * A polygon with four labeled corners.
 */
export interface HasCorners {
    bottomLeft: Point;
    bottomRight: Point;
    topLeft: Point;
    topRight: Point;
}

/**
 * A rectangle with labeled edges.
 * Type number: The position of the edge relative to the design origin.
 */
export interface HasEdges {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

/**
 * A vector in 2D space.
 */
export interface Vector2D {
    x: number;
    y: number;
}

export interface Shape {
    contains(point: Vector2D): boolean;
}

/**
 * A point in 2D space.
 */
export class Point implements Vector2D {
    private _x: number;
    private _y: number;

    constructor(x: number, y: number) {
        if (isNaN(x)) {
            throw new Error('x is NaN');
        }
        if (isNaN(y)) {
            throw new Error('y is NaN');
        }
        this._x = (x === -0) ? 0 : x;
        this._y = (y === -0) ? 0 : y;
    }

    /**
     * Factory method to create a Point from a Vector2D.
     */
    public static copy(other: Vector2D): Point {
        return new Point(other.x, other.y);
    }

    /**
     * Factory method that returns (0, 0).
     */
    public static origin(): Point {
        return new Point(0, 0);
    }

    public static fromObject(object: Object): Point {
        return new Point(object['_x'], object['_y']);
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    clone(): Point {
        return new Point(this.x, this.y);
    }

    /**
     * A new point rotated 90 deg counter-clockwise around the origin.
     */
    rotate(): Point {
        //noinspection JSSuspiciousNameCombination -- we're intentionally flipping x and y
        return new Point(-this.y, this.x);
    }

    round(): Point {
        return new Point(Math.round(this.x), Math.round(this.y));
    }

    translateX(amount: number): Point {
        return new Point(this.x + amount, this.y);
    }

    translateY(amount: number): Point {
        return new Point(this.x, this.y + amount);
    }

    add(other: Vector2D): Point {
        return new Point(this.x + other.x, this.y + other.y);
    }

    subtract(other: Vector2D): Point {
        return new Point(this.x - other.x, this.y - other.y);
    }

    multiply(scalar: number): Point {
        return new Point(this.x * scalar, this.y * scalar);
    }

    dot(other: Vector2D): number {
        return ((this.x * other.x) + (this.y * other.y));
    }

    cross(other: Vector2D): number {
        return ((this.x * other.y) - (this.y * other.x));
    }

    equals(other: Vector2D): boolean {
        return (this.x === other.x) &&
            (this.y === other.y);
    }

    /**
     * Calculates distance between two points
     */
    distance(other: Vector2D): number {
        return Math.hypot(this.x - other.x, this.y - other.y)
    }

    toString(): string {
        return `(${this.x},${this.y})`;
    }
}

/**
 * A line segment between two points.
 */
export class Line {
    points: Point[];

    constructor(a: Vector2D, b: Vector2D) {
        this.points = [new Point(a.x, a.y), new Point(b.x, b.y)];
    }

    get start(): Point {
        return this.points[0].clone();
    }

    get end(): Point {
        return this.points[1].clone();
    }

    isHorizontal(): boolean {
        return (this.start.y === this.end.y);
    }

    isVertical(): boolean {
        return (this.start.x === this.end.x);
    }

    length(): number {
        const dx = this.end.x - this.start.x,
            dy = this.end.y - this.start.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    unit(): Point {
        const length = this.length();

        return new Point(
            (this.end.x - this.start.x) / length,
            (this.end.y - this.start.y) / length);
    }

    /**
     * This is actually segment intersection. The segments are checked for
     * intersection, not the extended lines.
     */
    intersection(segment: Line): Point | null {

        const p = this.start,
            q = segment.start,
            r = this.end.subtract(p),
            s = segment.end.subtract(q),
            rxs = r.cross(s),
            qmp = q.subtract(p);

        /*
         * parallel lines
         */
        if (rxs === 0) {
            return null;
        }

        const t = (qmp).cross(s) / rxs;
        const u = (qmp).cross(r) / rxs;

        if (0 <= t && t <= 1 && 0 <= u && u <= 1) {
            return p.add(r.multiply(t)).round();
        }

        return null;
    }

    /**
     * Checks whether this segment intersects with `polyline`.
     */
    intersect(polyline: Polyline): Point[] {
        const intersectionPoints = [];
        for (const line of polyline.lines()) {
            const intersectPoint = this.intersection(line);
            if (intersectPoint && !intersectionPoints.some(point => point.equals(intersectPoint))) {
                intersectionPoints.push(intersectPoint);
            }
        }
        return intersectionPoints;
    }

    /**
     * @return A new Line rotated 90 degrees from this one.
     */
    rotate(): Line {
        return new Line(
            this.start.rotate(),
            this.end.rotate());
    }

    /**
     * @return True if this line is equal to `other`.
     */
    equals(other: Line): boolean {
        return (
            (
                this.start.equals(other.start) &&
                this.end.equals(other.end)
            ) || (
                this.start.equals(other.end) &&
                this.end.equals(other.start)
            )
        );
    }

    /**
     * @return Shortest distance from this line segment to a point.
     */
    segmentDistanceToPoint(point:Point): number {
        const ems = this.end.subtract(this.start);
        const length2 = ems.dot(ems);

        let t = point.subtract(this.start).dot(ems) / length2;
        t = Math.max(0, Math.min(1, t));
        return new Line(point, ems.multiply(t).add(this.start)).length();
    }

    toString(): string {
        return `Segment[${this.start},${this.end}]`;
    }
}

export class Polyline implements Shape {
    points: Point[];

    constructor(points: Vector2D[]) {
        this.points = points.map(p => new Point(p.x, p.y));
    }

    /**
     * Factory method that makes a square.
     */
    static square(bottomLeft: Vector2D, size: number): Polyline {
        return Polyline.rectangle(bottomLeft, size, size);
    }

    /**
     * Factory method that makes a rectangle.
     */
    static rectangle(bottomLeft: Vector2D, width: number, height: number): Polyline {
        const left = bottomLeft.x;
        const right = bottomLeft.x + width;
        const bottom = bottomLeft.y;
        const top = bottomLeft.y + height;
        return new Polyline([
            new Point(left, bottom),
            new Point(right, bottom),
            new Point(right, top),
            new Point(left, top),
        ]);
    }

    static fromObject(object: Object): Polyline {
        const points = object['points'].map(point => {
            return Point.fromObject(point);
        });
        return new Polyline(points);
    }

    /**
     * True if the given point is one of the vertices of this polygon.
     */
    public hasVertex(point: Vector2D): boolean {
        return this.points.some(vertex => vertex.equals(point))
    }

    shift(offset: Vector2D): Polyline {
        const points = [];

        for (let i = 0; i < this.points.length; i += 1) {
            points.push(this.points[i].add(offset));
        }

        return new Polyline(points);
    }

    lines(): Line[] {
        let j = this.points.length - 1;
        const lines = [];

        for (let i = 0; i < this.points.length; i += 1) {
            lines.push(new Line(this.points[j], this.points[i]));
            j = i;
        }

        return lines;
    }

    /**
     * TODO: This seems like it's the centroid of the points, rather than
     *  centroid of the area.
     */
    centroid(): Point {
        let i,
            centroid = new Point(0, 0);

        for (i = 0; i < this.points.length; i += 1) {
            centroid = centroid.add(this.points[i]);
        }

        return centroid.multiply(1 / i);
    }

    /**
     * The width of this Polyline, given its current orientation.
     */
    width(): number {
        let minX = Infinity;
        let maxX = -Infinity;
        for (const point of this.points) {
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
        }
        return maxX - minX;
    }

    /**
     * The height of this Polyline, given its current orientation.
     */
    height(): number {
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of this.points) {
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        return maxY - minY;
    }

    area(): number {
        let j = this.points.length - 1,
            sum = 0;

        for (let i = 0; i < this.points.length; i += 1) {
            sum += this.points[i].cross(this.points[j]);
            j = i;
        }

        return 0.5 * Math.abs(sum);
    }

    /**
     * Draw an imaginary line to the point, intersecting the edges of the polygon along the way.
     * If there is an odd number of intersections, the point is contained in the polygon.
     * To check for points sitting on edges, we will use rays cast from two directions.
     */
    contains(point: Vector2D): boolean {
        const xCoordinates = this.points.map(point => point.x);
        const yCoordinates = this.points.map(point => point.y);

        // Points sitting outside of the minimum and maximum outermost edges of the polygon.
        const minX = Math.min(...xCoordinates) - 1;
        const minY = Math.min(...yCoordinates) - 1;
        const maxX = Math.max(...xCoordinates) + 1;
        const maxY = Math.max(...yCoordinates) + 1;

        if (point.x <= minX || point.x >= maxX || point.y <= minY || point.y >= maxY) {
            // Outside of the polygon for sure, bye
            return false;
        }

        const minOuterPoint = new Point(minX, minY);
        const maxOuterPoint = new Point(maxX, maxY);

        const minRaycast = new Line(minOuterPoint, point);
        const maxRaycast = new Line(maxOuterPoint, point);

        const oddNum = 1;
        return minRaycast.intersect(this).length % 2 === oddNum ||
            maxRaycast.intersect(this).length % 2 === oddNum;
    }

    /**
     * Detects if based on number of intersection points found,
     * two polylines are considered as intersected.
     */
    intersects(otherPolyline: Polyline): boolean {
        return this.intersectionPoints(otherPolyline).length > 2;
    }

    /**
     * Finds all the intersection points between two polylines.
     */
    intersectionPoints(otherPolyline: Polyline): Point[] {

        const intersections = [];

        const _addIntersection = function (intersection) {
            for (const inter of intersections) {
                if (intersection.equals(inter)) {
                    return;
                }
            }
            intersections.push(intersection);
        };

        for (const segment of this.lines()) {
            for (const otherSegment of otherPolyline.lines()) {
                const intersection = segment.intersection(otherSegment);
                if (intersection) {
                    _addIntersection(intersection);
                }
            }
        }

        for (const point of this.points) {
            if (otherPolyline.contains(point)) {
                _addIntersection(point);
            }
        }

        for (const point of otherPolyline.points) {
            if (this.contains(point)) {
                _addIntersection(point);
            }
        }

        return intersections;
    }

    toString(): string {
        return this.points.map(p => p.toString()).join(', ');
    }

    /**
     * Creates string for "d" attribute for svg path elements.
     */
    public svgPath(): string
    {
        if (this.points.length < 2) {
            return '';
        }

        const lastPoint = this.points[this.points.length - 1];
        let path = `M ${lastPoint.x} ${lastPoint.y}`;
        for (const point of this.points) {
            path += ` L ${point.x} ${point.y}`
        }

        return path;
    }
}

export class Circle implements Shape {

    private _centrePoint: Point;
    private _radius: number;

    constructor(point: Point, radius: number) {
        this._centrePoint = point;
        this._radius = radius;
    }

    static fromObject(object: Object): Circle {
        return new Circle(Point.fromObject(object['_centrePoint']), object['_radius']);
    }

    get centrePoint(): Point {
        return this._centrePoint.clone();
    }

    get radius(): number {
        return this._radius;
    }

    contains(otherPoint: Vector2D): boolean {
        return this._centrePoint.distance(otherPoint) <= this._radius;
    }

    intersects(polyline: Polyline): boolean {
        return polyline.contains(this._centrePoint) ||
            polyline.lines().some(line =>
                line.segmentDistanceToPoint(this._centrePoint) < this._radius);
    }
}
