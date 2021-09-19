import {Dimension} from "dimension/Dimension";
import {Dimensionable, EdgePosition} from "../dimension/Dimensionable";
import {TranslationRecord} from "../placeditem/Movable";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {
    Circle,
    HasCorners,
    Point,
    Polyline,
    Shape,
    Vector2D
} from "../utils/geometry";
import {ServerID} from "./types";
import GeppettoModel from "model/GeppettoModel";
import {TOGGLE_CORNER_RADIUS_LOCK} from "../design/events";
import events from 'utils/events';
import {PlacedLogo} from "../placedlogo/PlacedLogo";
import {Overlappable} from "../placeditem/Overlappable";
import {generateUuid} from "../utils/generateUuid";
import {BoardAnchor, createBoardAnchor} from "../dimension/Anchor/BoardAnchor";
import userController from "../auth/UserController";
import {PlacedItem} from "../placeditem/PlacedItem";
import {DimensionableEventsController} from "../dimension/DimensionableEventsController";
import {BoardEventsController} from "./BoardEventsController";

/**
 * The PCB board.
 */
export class Board extends GeppettoModel implements Dimensionable {
    /**
     * The scaling price of the board from the server.
     * This updates when all modules having been loaded, because there is a board "module" among them.
     */
    public static PRICE = 0.15;

    public get MAX_HEIGHT(): number {
        return userController.getUser()
        && userController.getUser().isEngineer() ? Infinity : 1524;
    }

    public get MAX_WIDTH(): number {
        return userController.getUser()
        && userController.getUser().isEngineer() ? Infinity : 2286;
    }

    static DEFAULT_HEIGHT = 400;
    static DEFAULT_WIDTH = 1050;

    private _dimensions: Dimension[];
    private _anchors: BoardAnchor[];

    defaults(): any {
        return {
            id: 1,
            width: Board.DEFAULT_WIDTH,
            height: Board.DEFAULT_HEIGHT,
            corner_radius: 0,
            radius_locked: false,
            x: 0,
            y: 0,
            ready: true,
            connected: true,
            error: false,
            revision_id: 1
        }
    }

    url() {
        return '/api/v3/module/library/1/';
    }

    initialize() {
        this.generateNewUuid();
        this.initAnchors();
        this._dimensions = [];
        this.listenTo(this, 'change:x change:y', this.setAnchorPoints);
        this.listenTo(events, TOGGLE_CORNER_RADIUS_LOCK, this.toggleRadiusLocked);
        return this;
    }

    public get board(): Board {
        return this;
    }

    /**
     * @return the distance needed to align a block to the board's left edge.
     * Ditto for other edges below.
     */
    alignLeftDistance(block: PlacedItem): number {
        return this.position.x - block.xMin;
    }

    alignRightDistance(block: PlacedItem): number {
        const width = block.xMax - block.xMin;
        return this.xMax - width - block.xMin;
    }

    alignTopDistance(block: PlacedItem): number {
        const height = block.yMax - block.yMin;
        return this.yMax - height - block.yMin;
    }

    alignBottomDistance(block: PlacedItem): number {
        return this.position.y - block.yMin;
    }

    isOnEdge(block: PlacedItem): boolean {
        return this.x === block.xMin || this.xMax === block.xMax
        || this.position.y === block.yMin || this.yMax === block.yMax;
    }

    isInCorner(block: PlacedItem): boolean {
        const trans = this.findClosestCornerTranslation(block);
        return trans.x === 0 && trans.y === 0;
    }

    /**
     * @return The shortest distance between a block to a corner of the board
     * (not considering any board radius).
     */
    findClosestCornerTranslation(block: PlacedItem): Vector2D {
        const leftDistance = this.alignLeftDistance(block);
        const rightDistance = this.alignRightDistance(block);
        const topDistance = this.alignTopDistance(block);
        const bottomDistance = this.alignBottomDistance(block);
        return {
            x: Math.abs(leftDistance) <= Math.abs(rightDistance) ? leftDistance : rightDistance,
            y: Math.abs(bottomDistance) <= Math.abs(topDistance) ? bottomDistance : topDistance
        };
    }

    /**
     * Update the board's "connected", "ready", and "error" flags,
     * based on the state of all placed modules and placed logos.
     */
    public updateStatusFlags(placed_modules: PlacedModule[],
                             placed_logos: PlacedLogo[]): void {
        let ready = true;
        let connected = true;
        let error = false;

        for (const placed_module of placed_modules) {
            error = error || placed_module.overlaps();
            ready = !error && ready && placed_module.isReady();
            connected = !error && connected && placed_module.isConnected();
            for (const connection of placed_module.providedConnections) {
                error = error || !connection.isValid()
            }
        }

        for (const placed_logo of placed_logos) {
            error = error || placed_logo.overlaps();
            ready = !error && ready;
            connected = !error && connected;
        }

        this.setReady(ready);
        this.setConnected(connected);
    }

    getPrice(): number {
        return Board.PRICE * this.areaInCm;
    }

    private get areaInCm(): number {
        return this.width * this.height / 10000;
    }

    public resize(width: number, height: number) {
        this.setWidth(width);
        this.setHeight(height);
        this.setAnchorPoints();
    }

    private translate(dx: number, dy: number): void {
        const position = this.position;
        const vector = new Point(dx, dy);
        this.setPosition(position.add(vector));
    }

    /**
     * A locked radius sets a minimum of size = R*2
     */
    getMinSize(): number {
        return this.isRadiusLocked() ? this.getCornerRadius() * 2 : 1;
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

    public get x(): number {
        return this.get('x');
    }

    public get y(): number {
        return this.get('y');
    }

    /**
     * The position of the board (on screen? relative to the origin?), in units.
     */
    public get position(): Point {
        return new Point(this.x, this.y);
    }

    private setPosition(position: Vector2D): void {
        this.set({
            x: position.x,
            y: position.y,
        });
        DimensionableEventsController.getInstance().publish(this);
    }

    /**
     * The position of the board relative to itself.
     *
     * This is trivial, but allows Board and PlacedModule to implement the
     * same interface.
     */
    public get boardPosition(): Point {
        return new Point(0, 0);
    }

    public getPlacedId(): ServerID {
        return this.get('id');
    }

    public get width(): number {
        return this.get('width');
    }

    public getWidth(): number {
        return this.width;
    }

    private setWidth(width: number) {
        this.set('width', width);
        BoardEventsController.getInstance().publish();
    }

    public get height(): number {
        return this.get('height');
    }

    public getHeight(): number {
        return this.height;
    }

    private setHeight(height: number) {
        this.set('height', height);
        BoardEventsController.getInstance().publish();
    }

    public isWidthValid(width: number): boolean {
        const min = this.getMinSize();
        return width >= min && width <= this.MAX_WIDTH;
    }

    public isHeightValid(height: number): boolean {
        const min = this.getMinSize();
        return height >= min && height <= this.MAX_HEIGHT;
    }

    public getCornerRadius(): number {
        return this.get('corner_radius');
    }

    public setCornerRadius(radius: number): void {
        this.set('corner_radius', radius);
    }

    public setRadiusLocked(isLocked: boolean): void {
        this.set('radius_locked', isLocked);
    }

    public isRadiusLocked(): boolean {
        return this.get('radius_locked');
    }

    private toggleRadiusLocked(): void {
        const isLocked = this.isRadiusLocked();
        this.setRadiusLocked(!isLocked);
    }

    /**
     * When checking radius = S/2, S is the height or width of the board, whichever is shorter.
     * Must be an int.
     */
    public getMaxRadius(): number {
        const shortSide = Math.min(this.getWidth(), this.getHeight());
        return Math.floor(shortSide / 2);
    }

    public get boundary(): Shape[] {
        if (this.getCornerRadius() === 0) {
            return [this.getTallerRect()];
        }
        return ([
            this.getTallerRect(),
            this.getWiderRect()
        ] as Shape[]).concat(this.getCircles());
    }

    isConnected(): boolean {
        return Boolean(this.get('connected'));
    }

    isReady(): boolean {
        return Boolean(this.get('ready'));
    }

    setReady(ready: boolean) {
        this.set('ready', Boolean(ready));
    }

    setConnected(connected: boolean) {
        this.set('connected', Boolean(connected));
    }

    /**
     * Translate everything linked (by linked anchors) to specified board edge
     */
    public resizeLinkedByEdge(edge: EdgePosition, dx: number, dy: number): void {
        const anchor = this.getAnchorByEdge(edge);
        if (anchor.canMove()) {
            anchor.translateLinked(dx, dy);
        }
    }

     // Methods for programmatically changing the board size and edges:

    /**
     * Set the top edge to a specified y position.
     */
    public setTopEdge(y: number): void {
        const yTranslation = y - (this.position.y + this.height);
        this.translateTopEdge(yTranslation);
    }

    /**
     * Move the top edge a specified distance.
     */
    public translateTopEdge(dy: number): void {
        this.resizeLinkedByEdge('top', 0, dy);
    }

    /**
     * Set the bottom edge to a specified y position.
     */
    public setBottomEdge(y: number): void {
        const yTranslation = y - this.position.y;
        this.translateBottomEdge(yTranslation);
    }

    public translateBottomEdge(dy: number): void {
        this.resizeLinkedByEdge('bottom', 0, dy);
    }

    public setLeftEdge(x: number): void {
        const xTranslation = x - this.position.x;
        this.translateLeftEdge(xTranslation);
    }

    public translateLeftEdge(dx: number): void {
        this.resizeLinkedByEdge('left', dx, 0);
    }

    public setRightEdge(x: number): void {
        const xTranslation = x - (this.position.x + this.width);
        this.translateRightEdge(xTranslation);
    }

    public translateRightEdge(dx: number): void {
        this.resizeLinkedByEdge('right', dx, 0);
    }

    private resizeByAnchorEdge(edge: EdgePosition, dx: number, dy: number): void {
        let newWidth = this.width;
        let newHeight = this.height;
        let transX = 0;
        let transY = 0;

        switch (edge) {
            case 'top':
                dx = 0;
                newHeight += dy;
                break;
            case 'right':
                dy = 0;
                newWidth += dx;
                break;
            case 'bottom':
                dx = 0;
                newHeight -= dy;
                transY = dy;
                break;
            case 'left':
                dy = 0;
                newWidth -= dx;
                transX = dx;
                break;
        }

        if (!this.isWidthValid(newWidth) || !this.isHeightValid(newHeight)) {
            return;
        }

        this.translate(transX, transY);
        this.resize(newWidth, newHeight);
    }

    public canMoveEdge(edge: EdgePosition) {
        return this.getAnchorByEdge(edge).canMove();
    }

    public toString(): string {
        return 'the board';
    }

    /**
     * True if the point of a Polyline is not contained on this board.
     */
    public isPolylineOutOfBounds(polyline: Polyline): boolean {
        return undefined != polyline.points.find(point => !this.contains(point));
    }

    /**
     * True if the given placed item is off the board.
     */
    public isOutOfBounds(overlappable: Overlappable): boolean {
        for (const placedPolyline of overlappable.keepouts) {
            if (this.isPolylineOutOfBounds(placedPolyline)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get a Point with which to centre a Polyline on this board.
     * Assumes that the Point should be at the item (I)'s bottom-left corner.
     *  _________
     * |   ___   |
     * |  |_I_|  |
     * |_P_______|
     */
    public getCentrePoint(width: number, height: number): Point {
        const offset = {x: width / 2 , y: height / 2};
        return this.centroid.subtract(offset);
    }

    public get centroid(): Point {
        return Polyline.rectangle({x: this.x, y: this.y}, this.width, this.height).centroid();
    }

    /**
     * Get corner points for placing an item/Polyline.
     *     ________
     *    |_|    |_|<- Item
     *   P|     P  |
     *    |_      _|
     *    |_|____|_|<- Item
     *   P      P
     */
    public getCornerPoints(width: number, height: number): HasCorners {
        return {
            bottomLeft: this.getBottomLeft(),
            topLeft: this.getTopLeft(0, -height),
            bottomRight: this.getBottomRight(-width),
            topRight: this.getTopRight(-width, -height)
        };
    }

    public get yMax(): number {
        return this.y + this.height;
    }

    public get xMax(): number {
        return this.x + this.width;
    }

    /**
     * Return the bottom-left corner point of the board, taking radius into account.
     * @param xOffset: Shift the x position of this point, eg., to account for a module's dimensions.
     * @param yOffset: Shift the y position of this point.
     * Ditto for other corner methods.
     */
    public getBottomLeft(xOffset = 0, yOffset = 0): Point {
        return new Point(
            this.x + this.radiusOffset + xOffset,
            this.y + this.radiusOffset + yOffset
        );
    }

    public getTopLeft(xOffset = 0, yOffset = 0): Point {
        return new Point(
            this.x + this.radiusOffset + xOffset,
            this.yMax - this.radiusOffset + yOffset
        );
    }

    public getBottomRight(xOffset = 0, yOffset = 0): Point {
        return new Point(
            this.xMax - this.radiusOffset + xOffset,
            this.y + this.radiusOffset + yOffset
        );
    }

    public getTopRight(xOffset = 0, yOffset = 0): Point {
        return new Point(
            this.xMax - this.radiusOffset + xOffset,
            this.yMax - this.radiusOffset + yOffset
        );
    }

    public get radiusOffset(): number {
        return this.getCornerRadius() / Math.PI;
    }

    /**
     * Expand this board's horizontal and vertical edges by given amounts.
     */
    public expand(horizontal: number, vertical: number): void {
        this.translateLeftEdge(-horizontal);
        this.translateRightEdge(horizontal);
        this.translateTopEdge(vertical);
        this.translateBottomEdge(-vertical);
    }

    private contains(point: Point): boolean {
        return this.withinTallerRect(point) ||
            this.withinWiderRect(point) ||
            this.withinCornerRadii(point);
    }

    /**
     * Checking out-of-bounds module when corner R > 0:
     *  ___________
     * /_|_______|_\ ___
     * | |       | |  |
     * | |       | |  H
     * |_|_______|_| _|_
     * \_|_______|_/ _R_
     *   |-- W --|R|
     *
     *  1) Check if the point is in the rectangle constrained by "W"
     *  2) Else, check if the point is in the rectangle constrained by "H"
     *  3) Else, check if the point is in any circle, by seeing if
     *  (distance of circle centre point to module point) <= R.
     */

    private withinTallerRect(point: Point): boolean {
        return this.getTallerRect().contains(point);
    }

    private withinWiderRect(point: Point): boolean {
        return this.getWiderRect().contains(point);
    }

    private getTallerRect(): Polyline {
        const radius = this.getCornerRadius();
        const x = this.position.x + radius;
        const y = this.position.y;
        const bottomLeft = new Point(x, y);
        const width = this.getWidth() - radius * 2;
        return Polyline.rectangle(bottomLeft, width, this.getHeight());
    }

    private getWiderRect(): Polyline {
        const radius = this.getCornerRadius();
        const x = this.position.x;
        const y = this.position.y + radius;
        const bottomLeft = new Point(x, y);
        const height = this.getHeight() - radius * 2;
        return Polyline.rectangle(bottomLeft, this.getWidth(), height);
    }

    private withinCornerRadii(point: Point): boolean {
        return this.getCircles().some(circle => circle.contains(point));
    }

    private getCircles(): Circle[] {
        const widerRect = this.getWiderRect();
        const tallerRect = this.getTallerRect();
        const centrePoints = widerRect.intersectionPoints(tallerRect);
        const radius = this.getCornerRadius();
        return centrePoints.map(point => new Circle(point, radius));
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
     * ANCHORS
     */
    private initAnchors() {
        this._anchors = ['top', 'right', 'bottom', 'left']
            .map((edge: EdgePosition) => createBoardAnchor(this, edge));
        this.resetLinkedAnchors();
    }

    public resetLinkedAnchors(): void {
        this._anchors.forEach((anchor: BoardAnchor) => {
            anchor.resetLinkedAnchors()
        });
    }

    public setAnchorPoints() {
        const x1 = 0;
        const y1 = 0;
        const x2 = this.width;
        const y2 = this.height;

        this.getAnchorByEdge('top').setPoints(new Point(x1, y2), new Point(x2, y2));
        this.getAnchorByEdge('right').setPoints(new Point(x2, y1), new Point(x2, y2));
        this.getAnchorByEdge('bottom').setPoints(new Point(x1, y1), new Point(x2, y1));
        this.getAnchorByEdge('left').setPoints(new Point(x1, y1), new Point(x1, y2));
    }

    public get anchors(): BoardAnchor[] {
        return this._anchors.slice(); // defensive copy
    }

    public getAnchorByEdge(edge: EdgePosition): BoardAnchor {
        return this._anchors.find((anchor: BoardAnchor) => {
            return anchor.edge === edge;
        });
    }

    public moveAnchor(anchor: BoardAnchor,
                      dx: number,
                      dy: number,
                      translated: TranslationRecord): void {
        if (translated.previouslyTranslated(anchor, dx, dy)) {
            return;
        }
        translated.registerTranslation(anchor, dx, dy);
        this.resizeByAnchorEdge(anchor.edge, dx, dy);
    }

    public getAnchorDxRange(anchor: BoardAnchor): { min: number, max: number } {
        if (!anchor.canMoveHorizontally) {
            return { min: 0, max: 0 };
        }

        const min = this.getMinSize();

        let minDx = null;
        let maxDx = null;

        const edge = anchor.edge;
        switch (edge) {
            case 'right':
                minDx = min - this.width;
                maxDx = this.MAX_WIDTH - this.width;
                break;
            case 'left':
                minDx = this.width - this.MAX_WIDTH;
                maxDx = this.width - min;
                break;
            case 'top':
            case 'bottom':
                return { min: 0, max: 0 };
        }

        return {min : minDx, max: maxDx};
    }

    public getAnchorDyRange(anchor: BoardAnchor): { min: number, max: number } {
        if (!anchor.canMoveVertically()) {
            return { min: 0, max: 0 };
        }

        const min = this.getMinSize();

        let minDy = null;
        let maxDy = null;

        const edge = anchor.edge;
        switch (edge) {
            case 'right':
            case 'left':
                return { min: 0, max: 0 };
            case 'top':
                minDy = min - this.height;
                maxDy = this.MAX_HEIGHT - this.height;
                break;
            case 'bottom':
                minDy = this.height - this.MAX_HEIGHT;
                maxDy = this.height - min;
                break;
        }

        return {min : minDy, max: maxDy};
    }

    public getAnchorConstrainedDx(anchor: BoardAnchor, dx: number): number {
        const range = this.getAnchorDxRange(anchor);
        if (range.max !== null && dx > range.max) {
            return range.max
        } else if (range.min !== null && dx < range.min) {
            return range.min
        }
        return dx;
    }

    public getAnchorConstrainedDy(anchor: BoardAnchor, dy: number): number {
        const range = this.getAnchorDyRange(anchor);
        if (range.max !== null && dy > range.max) {
            return range.max
        } else if (range.min !== null && dy < range.min) {
            return range.min
        }
        return dy;
    }

}
