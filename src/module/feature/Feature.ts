import GeppettoModel from 'model/GeppettoModel';
import {Line, Point, Vector2D} from 'utils/geometry';
import {FeatureResource, LineType} from "./api";
import {ServerID} from "../../model/types";

/**
 * A feature is a line that is used to render the board on screen.
 * Certain types of features are also used as anchor points for dimensions.
 */
export class Feature extends GeppettoModel {
    defaults() {
        return {
            visible: false,
            extend: false
        }
    }

    initialize(feature_resource: FeatureResource) {
        this.makePoints();
    }

    private makePoints(): void {
        const ps = this.get('points');
        this.set('points', [
            Point.copy(ps[0]),
            Point.copy(ps[1])
        ]);
    }

    public rotate(): void {
        const line = this.line;
        this.line = line.rotate();
    }

    getId(): ServerID {
        return this.get('id');
    }

    public get type(): LineType {
        return this.get('type');
    }

    /**
     * Edge features are automatically constrained to the edge of the board.
     */
    public isEdge(): boolean {
        return this.isType('edge');
    }

    public isVertical(): boolean {
        const line = this.line;
        return line.isVertical();
    }

    public isHorizontal(): boolean {
        const line = this.line;
        return line.isHorizontal();
    }

    /**
     * Is this feature of the given type?
     */
    public isType(type: LineType): boolean {
        return this.type === type;
    }

    /**
     * Is a resource representing a pair of points equal to this feature's
     * points?
     */
    public arePointsEqual(comparePoints: Vector2D[]): boolean {
        const comparePoint1 = comparePoints[0];
        const comparePoint2 = comparePoints[1];

        return this.points[0].equals(comparePoint1) &&
            this.points[1].equals(comparePoint2);
    }

    private get line(): Line {
        return new Line(this.points[0], this.points[1]);
    }

    private set line(line: Line) {
        this.set('points', line.points);
    }

    public get points(): Point[] {
        return this.get('points');
    }

    public contains(point: Point): boolean {
        return this.points[0].equals(point) ||
            this.points[1].equals(point);
    }

    public getOtherEnd(point: Point): Point {
        console.assert(this.contains(point));
        if (this.points[0].equals(point)) {
            return this.points[1];
        } else if (this.points[1].equals(point)) {
            return this.points[0];
        }
    }

    public get minX(): number {
        const ps = this.points;
        return Math.min(ps[0].x, ps[1].x);
    }

    public get maxX(): number {
        const ps = this.points;
        return Math.max(ps[0].x, ps[1].x);
    }

    public get minY(): number {
        const ps = this.points;
        return Math.min(ps[0].y, ps[1].y);
    }

    public get maxY(): number {
        const ps = this.points;
        return Math.max(ps[0].y, ps[1].y);
    }

    public get x(): number {
        const ps = this.points;
        console.assert(ps[0].x === ps[1].x);
        return ps[0].x;
    }

    public get y(): number {
        const ps = this.points;
        console.assert(ps[0].y === ps[1].y);
        return ps[0].y;
    }

    public toResource(): FeatureResource {
        return {
            id: this.id,
            type: this.type,
            points: this.points,
        };
    }
}
