import GeppettoModel from "../model/GeppettoModel";
import {HasCorners, Point, Polyline, Vector2D} from "../utils/geometry";
import {Outline} from "../module/feature/footprint";
import {Movable, TranslationRecord} from "./Movable";
import {DesignRevision} from "../design/DesignRevision";
import {Board} from "../model/Board";
import {Overlappable} from "./Overlappable";
import {HasOutline} from "./HasOutline";
import {generateUuid} from "../utils/generateUuid";
import {Anchor} from "../dimension/Anchor/Anchor";
import {Dimensionable, EdgePosition} from "../dimension/Dimensionable";
import {Dimension} from "../dimension/Dimension";
import {DimensionableEventsController} from "../dimension/DimensionableEventsController";

export abstract class PlacedItem extends GeppettoModel implements Dimensionable,
    Overlappable,
    Movable,
    HasOutline,
    HasCorners {

    protected _anchors: Anchor[];
    protected _dimensions: Dimension[];

    initialize(attributes) {
        if (attributes.uuid === undefined) {
            this.generateNewUuid();
        }
        this.has_moved = true;
        this.initAnchors();
        this._dimensions = [];
    }

    public abstract get name(): string;

    public get isSelected(): boolean {
        return this.get('selected') || false;
    }

    public setSelected(isSelected: boolean): void {
        this.set('selected', isSelected);
    }

    public toggleSelected(): void {
        this.set('selected', !this.isSelected);
    }

    public remove(): void {
        this.deleteDimensions();
        this.trigger('remove');
    }

    public get designRevision(): DesignRevision {
        return this.get('design_revision');
    }

    /**
     * True if this and other are the same object.
     */
    public equals(other: Overlappable): boolean {
        return this.cid === other.cid;
    }

    /**
     * True if this item is right on the board's edge (without going off of the board).
     */
    public get isOnEdge(): boolean {
        return this.board.isOnEdge(this);
    }

    /**
     * True if this item is against the corner of the board.
     */
    public get isInCorner(): boolean {
        return this.board.isInCorner(this);
    }

    public get board(): Board {
        return this.designRevision.board;
    }


    /**
     * UUID
     * Used to identify PlacedItem even if it has no ID.
     */
    public get uuid(): string {
        return this.get('uuid');
    }

    private setUuid(uuid: string): void {
        this.set('uuid', uuid);
    }

    private generateNewUuid(): void {
        this.setUuid(generateUuid());
    }


    /**
     * POSITIONING
     */
    protected get x(): number {
        return this.get('x');
    }

    protected get y(): number {
        return this.get('y');
    }

    /**
     * The absolute position of this module, in units.
     */
    public get position(): Point {
        return new Point(this.x, this.y);
    }

    protected setPosition(position: Vector2D): void {
        this.set({
            x: position.x,
            y: position.y,
            has_moved: true,
        });
        DimensionableEventsController.getInstance().publish(this);
    }

    /**
     * The position of this module relative to the board, in units.
     */
    public get boardPosition(): Point {
        return this.position.subtract(this.board.position);
    }

    public get rotation(): number {
        return this.get('rotation');
    }


    /**
     * MOVE FUNCTIONS
     */
    public get has_moved(): boolean {
        return this.get('has_moved');
    }

    public set has_moved(moved: boolean) {
        this.set('has_moved', moved);
    }

    public canMoveHorizontally(): boolean {
        const isLinkedToBoard = this._anchors.filter((a: Anchor) => {
            return a.isVertical();
        }).some((a: Anchor) => {
            return a.isLinkedToBoard();
        });
        if (isLinkedToBoard) {
            return false;
        }

        return this._anchors.filter((a: Anchor) => {
            return a.isVertical();
        }).every((a: Anchor) => {
            return a.canMoveHorizontally();
        });
    }

    public canMoveVertically(): boolean {
        const isLinkedToBoard = this._anchors.filter((a: Anchor) => {
            return a.isHorizontal();
        }).some((a: Anchor) => {
            return a.isLinkedToBoard();
        });
        if (isLinkedToBoard) {
            return false;
        }

        return this._anchors.filter((a: Anchor) => {
            return a.isHorizontal();
        }).every((a: Anchor) => {
            return a.canMoveVertically();
        });
    }

    public translateVector(vector: Vector2D): void {
        this.translateLinked(vector.x, vector.y);
    }

    /**
     * Translate everything linked (by linked anchors) to this placed item
     */
    public translateLinked(dx: number, dy: number): void {
        let horizontalLinkedAnchors;
        let verticalLinkedAnchors;
        const anchors = this._anchors;
        for (const anchor of anchors) {
            if (horizontalLinkedAnchors && verticalLinkedAnchors) {
                break;
            }
            if (anchor.isHorizontal()) {
                horizontalLinkedAnchors = anchor.linkedAnchors;
            }
            if (anchor.isVertical()) {
                verticalLinkedAnchors = anchor.linkedAnchors;
            }
        }

        const translated = new TranslationRecord();

        if (this.canMoveHorizontally()) {
            dx = verticalLinkedAnchors.getLinkedConstrainedDx(dx);
            verticalLinkedAnchors.forEach((anchor: Anchor) => {
                anchor.translate(dx, dy, translated);
            });
        }

        if (this.canMoveVertically()) {
            dy = horizontalLinkedAnchors.getLinkedConstrainedDy(dy);
            horizontalLinkedAnchors.forEach((anchor: Anchor) => {
                anchor.translate(dx, dy, translated);
            });
        }
    }

    protected translate(dx: number, dy: number): void {
        const position = this.position;
        const vector = new Point(dx, dy);
        this.setPosition(position.add(vector));
    }


    /**
     * ROTATE FUNCTIONS
     */
    public rotateTo(desired: number): void {
        let remaining = this.normalizeRotation(this.rotation + desired);
        while (remaining > 0) {
            this.rotate();
            remaining -= 90;
        }
    }

    /**
     * Rotates this module 90 degrees.
     */
    public rotate(): void {
        if (!this.canBeRotated()) {
            return;
        }

        this.deleteDimensions();

        const oldCentroid = this.centroid;
        this.set('rotation', this.normalizeRotation(this.rotation + 90));
        this.rotateAnchors();
        this.has_moved = true;

        const translate = oldCentroid.subtract(this.centroid);
        if (this.rotation == 0 || this.rotation == 180) {
            this.translate(Math.floor(translate.x), Math.floor(translate.y));
        } else {
            this.translate(Math.ceil(translate.x), Math.ceil(translate.y));
        }
        this.trigger('rotate', this);
    }

    /**
     * True if this module can be rotated.
     */
    public canBeRotated(): boolean {
        return !this.hasLockedDimensions();
    }

    /**
     * The outermost x position relative to the design origin.
     * The original x,y position could have changed due to rotation.
     */
    public get xMax(): number {
        const xCoordinates = this.points.map(point => point.x);
        return xCoordinates.reduce((a, b) => {
            return Math.max(a, b);
        });
    }

    /**
     * The outermost y position relative to the design origin.
     */
    public get yMax(): number {
        const yCoordinates = this.points.map(point => point.y);
        return yCoordinates.reduce((a, b) => {
            return Math.max(a, b);
        });
    }

    /**
     * The innermost x position relative to the design origin.
     */
    public get xMin(): number {
        const xCoordinates = this.points.map(point => point.x);
        return xCoordinates.reduce((a, b) => {
            return Math.min(a, b);
        });
    }

    /**
     * The innermost y position relative to the design origin.
     */
    public get yMin(): number {
        const yCoordinates = this.points.map(point => point.y);
        return yCoordinates.reduce((a, b) => {
            return Math.min(a, b);
        });
    }

    /**
     * Note: relative to design origin.
     */
    public get points(): Point[] {
        let points = [];
        this.getPlacedPolygons().forEach(polyline => {
            points = [...points, ...polyline.points];
        });
        return points;
    }

    protected normalizeRotation(rotation: number): number {
        if (rotation % 90 !== 0) {
            throw `Rotation must be a multiple of 90; ${rotation} given`;
        }
        while (rotation < 0) {
            rotation += 360;
        }
        rotation = rotation % 360;
        return rotation;
    }

    /**
     * OVERLAP FUNCTIONS
     */
    public overlaps(): boolean {
        return Boolean(this.get('overlaps'));
    }

    public setOverlaps(overlaps: boolean) {
        this.set('overlaps', Boolean(overlaps));
    }

    /**
     * Determine if this logo overlaps with any of the given placed items
     * and update their statuses accordingly.
     */
    public updateOverlaps(others: Overlappable[]): void {
        let overlaps = false;
        for (const other of others) {
            if (this.overlapsWith(other)) {
                other.setOverlaps(true);
                overlaps = true;
            }
        }
        this.setOverlaps(overlaps);
    }

    /**
     * True if this logo physically collides with other overlappable.
     */
    public overlapsWith(other: Overlappable): boolean {
        if (this.equals(other)) {
            return false; // It doesn't overlap with itself.
        }
        return other.keepouts.some(polyline => this.intersects(polyline));
    }

    public intersects(other: Polyline): boolean {
        return this.keepouts.some(polyline => polyline.intersects(other));
    }

    /**
     * Polygons which can collide with other objects on the board.
     *
     * Note: Relative to design origin.
     *
     * @todo: Use this to implement support for modules with multiple footprints:
     *   https://mantis.gumstix.com/view.php?id=5414
     */
    public get keepouts(): Polyline[] {
        return this.getPlacedPolygons();
    }

    /**
     * Get points (P) around a perimeter of the PlacedItem.
     * We use these to see if we can put a module at that location.
     *    ____P____
     *   |    |    |
     * P_|    |____|_P
     *   |  (X,Y)  |
     *   |_________|
     *  P     P
     */
    public getSurroundingPoints(width: number, height: number): Point[] {
        const x = this.xMin;
        const y = this.yMin;
        const offsetX = this.xMax;
        const offsetY = this.yMax;
        const inverseX = x - width;
        const inverseY = y - height;
        return [
            new Point(offsetX, y),
            new Point(inverseX, y),
            new Point(x, offsetY),
            new Point(x, inverseY),
            new Point(offsetX - width, inverseY)
        ];
    }

    /**
     * Returns Point (P) on this item (from a rectangular boundary only).
     *    ____
     *   |    |
     *   |____|
     *         P
     */
    public get bottomRight(): Point {
        return new Point(this.xMax, this.yMin);
    }

    /**
     *  P ____
     *   |    |
     *   |____|
     */
    public get topLeft(): Point {
        return new Point(this.xMin, this.yMax);
    }

    /**
     *    ____ P
     *   |    |
     *   |____|
     */
    public get topRight(): Point {
        return new Point(this.xMax, this.yMax);
    }

    /**
     *   ____
     *  |    |
     *  |____|
     * P
     */
    public get bottomLeft(): Point {
        return new Point(this.xMin, this.yMin);
    }

    /**
     * GEOMETRY
     */
    /**
     * The polygons of this place item's footprint, relative to the place item
     * origin.
     * It should always contain (0, 0).
     *
     * Contrast this with getPlacedPolygon(), which is relative to the design
     * origin.
     */
    public abstract getFootprintPolylines(): Polyline[];

    /**
     * The footprint polygons of this placed item relative to the design origin.
     *
     * Contrast this with getFootprintPolyline(), which is relative to the
     * placed item origin.
     */
    public getPlacedPolygons(): Polyline[] {
        return this.getFootprintPolylines()
            .map(polyline => polyline.shift(this.position));
    }

    /**
     * Note: Relative to placed item origin.
     *
     * TODO: The centroid of the points, rather than
     *  centroid of the area.
     *  @see Polyline.centroid
     */
    protected get centroid(): Point {
        const polylines = this.getFootprintPolylines();
        let centroid: Point = new Point(0, 0);
        let pointsCount: number = 0;
        polylines.forEach(polyline => {
            centroid = centroid.add(polyline.centroid().multiply(polyline.points.length));
            pointsCount += polyline.points.length;
        });

        return centroid.multiply(1 / pointsCount);
    }

    /**
     * Box for which outlines the PlaceItem.
     */
    public abstract getOutline(): Outline;

    /**
     * Box for displaying PlacedItem on the view (includes padding so that the
     * stroke-width of the drawn outline does not get cut in half by the
     * outline box).
     */
    public abstract getDisplayOutline(): Outline;

    public get outlineArea(): number {
        const outline = this.getOutline();
        return outline.height * outline.width;
    }

    /**
     * DIMENSIONS
     */
    public get dimensions(): Dimension[] {
        return this._dimensions;
    }

    public addDimension(dimension: Dimension): void {
        const index = this._dimensions.indexOf(dimension);
        if (index === -1) {
            this._dimensions.push(dimension);
        }
    }

    public removeDimension(dimension: Dimension): void {
        const index = this._dimensions.indexOf(dimension);
        if (index > -1) {
            this._dimensions.splice(index, 1);
        }
    }

    /**
     * Deletes all dimensions which constrain this dimensionable.
     */
    protected deleteDimensions(): void {
        for (const dimension of this.constraints) {
            this.designRevision.removeDimension(dimension);
        }
    }

    protected hasLockedDimensions(): boolean {
        return !!this.constraints.find((dimension: Dimension) => {
            return dimension.isLockedByUser();
        });
    }

    /**
     * Those dimensions which constrain this placed item.
     */
    public get constraints(): Dimension[] {
        return this.designRevision.getDimensionsFor(this);
    }


    /**
     * ANCHORS
     */
    protected abstract initAnchors(): void

    public abstract resetLinkedAnchors(): void

    /**
     * Rotates anchors 90 degrees.
     */
    protected rotateAnchors(): void {
        this._anchors.forEach((anchor: Anchor) => {
            anchor.rotate();
        });
    }

    public get anchors(): Anchor[] {
        return this._anchors.slice(); // defensive copy
    }

    public abstract getAnchorByEdge(edge: EdgePosition): Anchor

    public moveAnchor(anchor: Anchor,
                      dx: number,
                      dy: number,
                      translated: TranslationRecord): void {
        if (translated.previouslyTranslated(this, dx, dy)) {
            return;
        }
        translated.registerTranslation(this, dx, dy);
        this.translate(dx, dy);

    }

    public getAnchorDxRange(anchor: Anchor): { min: number, max: number } {
        return anchor.canMoveHorizontally() ?
            {min: null, max: null} :
            {min: 0, max: 0}
    }

    public getAnchorDyRange(anchor: Anchor): { min: number, max: number } {
        return anchor.canMoveVertically() ?
            {min: null, max: null} :
            {min: 0, max: 0}
    }

    public getAnchorConstrainedDx(anchor: Anchor, dx: number): number {
        const range = this.getAnchorDxRange(anchor);
        if (range.max !== null && dx > range.max) {
            return range.max
        } else if (range.min !== null && dx < range.min) {
            return range.min
        }
        return dx;
    }

    public getAnchorConstrainedDy(anchor: Anchor, dy: number): number {
        const range = this.getAnchorDyRange(anchor);
        if (range.max !== null && dy > range.max) {
            return range.max
        } else if (range.min !== null && dy < range.min) {
            return range.min
        }
        return dy;
    }

    public abstract toResource();
}