import {PlacedItem} from "../placeditem/PlacedItem"
import {Line, Point, Polyline, Vector2D} from "../utils/geometry";
import * as $ from "jquery";
import {Outline} from "../module/feature/footprint";
import {Workspace} from "../workspace/Workspace";
import {PlacedLogoResource} from "./api";
import {createLogoAnchor, LogoAnchor} from "../dimension/Anchor/LogoAnchor";
import {EdgePosition} from "../dimension/Dimensionable";
import {TranslationRecord} from "../placeditem/Movable";
import {Anchor} from "../dimension/Anchor/Anchor";
import {LinkedAnchors} from "../dimension/Anchor/LinkedAnchors";
import {DimensionDirection} from "../dimension/DimensionController";
import {DesignRevision} from "../design/DesignRevision";

const MIN_SIZE = 5;

export const OUTLINE_PADDING = 5;

export type ResizeEdgePosition = 'top' | 'right' | 'bottom' | 'left' |
                                 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

type AspectRatioType = 'average' | 'width' | 'height';


export interface PlacedLogoAttributes {
    uuid?: string;
    svg_data: string;
    design_revision: DesignRevision;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation: number;
}

/**
 * A logo that has been placed onto a design.
 */
export class PlacedLogo extends PlacedItem {
    protected _anchors: LogoAnchor[];

    defaults(): any {
        return {
            // These come from the server
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,

            // These are intended to drive local events
            ready: false,
            overlaps: false,

            // Indicates that overlaps need to be recalculated.
            has_moved: true,
        };
    }

    initialize(attributes: PlacedLogoAttributes) {
        if (attributes.width === undefined) {
            const width = this.height * this.getDefaultAspectRatio();
            this.setWidth(width);
        }
        super.initialize(attributes);
    }

    get name() {
        return 'SVG Image';
    }

    private get viewWidth(): number {
        const rad = -(Math.PI / 180 * this.rotation);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return cos * this.width + sin * this.height;
    }

    private get viewHeight(): number {
        const rad = -(Math.PI / 180 * this.rotation);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return cos * this.height - sin * this.width;
    }

    public getOutline(): Outline {
        const xmax = Math.max(0, this.viewWidth);
        const xmin = Math.min(0, this.viewWidth);
        const ymax = Math.max(0, this.viewHeight);
        const ymin = Math.min(0, this.viewHeight);

        return {
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            width: xmax - xmin,
            height: ymax - ymin,
            mirror: ymin + ymax
        };
    }

    public getDisplayOutline(): Outline {
        const padding = OUTLINE_PADDING;
        const outline = this.getOutline();

        const xmax = outline.xmax + padding;
        const xmin = outline.xmin - padding;
        const ymax = outline.ymax + padding;
        const ymin = outline.ymin - padding;

        return {
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            width: xmax - xmin,
            height: ymax - ymin,
            mirror: ymin + ymax
        };
    }

    public getFootprintPolylines(): Polyline[] {
        return [
            new Polyline([
                new Point(0, 0),
                new Point(this.viewWidth, 0),
                new Point(this.viewWidth, this.viewHeight),
                new Point(0, this.viewHeight)
            ])
        ];
    }

    public get svgData(): string {
        return this.get('svg_data');
    }

    private getDefaultAspectRatio(): number {
        const svgEl = $(this.svgData)[0];
        if (svgEl instanceof SVGSVGElement) {
            const box = svgEl.viewBox.baseVal;
            const widthUnitType = svgEl.width.baseVal.unitType;
            const heightUnitType = svgEl.height.baseVal.unitType;
            if (box && box.width >= 0 && box.height > 0) {
                return box.width / box.height;
            } else if (widthUnitType === 1 && heightUnitType === 1) {
                const width = svgEl.width.baseVal.value;
                const height = svgEl.height.baseVal.value;
                return width/height;
            }
        }
        return 1;
    }

    /**
     * Height is relative to original svg orientation
     */
    public get height(): number {
        return this.get('height');
    }
    private setHeight(height: number) {
        this.set('height', height);
    }

    /**
     * Width is relative to original svg orientation
     */
    public get width(): number {
        return this.get('width');
    }
    private setWidth(width: number) {
        this.set('width', width);
    }

    /**
     * MOVE FUNCTIONS
     */
    public translateLinked(dx: number, dy: number): void {
        // Temporarily link all placed item anchors together to move the
        // placed item without having the separate linked anchor groups
        // conflict with each other
        const originalLinkAnchorsInstances = this._anchors.map((anchor: Anchor) => {
            return anchor.linkedAnchors;
        });

        const tempHorizontalLinkedAnchors = new LinkedAnchors();
        const tempVerticalLinkedAnchors = new LinkedAnchors();
        this._anchors.forEach((anchor: Anchor) => {
            if (anchor.isHorizontal()) {
                tempHorizontalLinkedAnchors.add(anchor);
            }
            if (anchor.isVertical()) {
                tempVerticalLinkedAnchors.add(anchor);
            }
        });

        const translated = new TranslationRecord();

        if (this.canMoveHorizontally()) {
            dx = tempVerticalLinkedAnchors.getLinkedConstrainedDx(dx);
            tempVerticalLinkedAnchors.forEach((anchor: Anchor) => {
                anchor.translate(dx, dy, translated);
            });
        }

        if (this.canMoveVertically()) {
            dy = tempHorizontalLinkedAnchors.getLinkedConstrainedDy(dy);
            tempHorizontalLinkedAnchors.forEach((anchor: Anchor) => {
                anchor.translate(dx, dy, translated);
            });
        }

        // Set linked anchors instances back to normal
        originalLinkAnchorsInstances.forEach((linkedAnchors: LinkedAnchors) => {
            linkedAnchors.updateInstances();
        });

        // Trigger change after linked anchor instances are back to normal to
        // trigger rendering on dimension view (or it would be shown as
        // implicitly locked to due the temporary linked anchors)
        if (this.canMoveHorizontally()) {
            this.trigger('change:x');
        }
        if (this.canMoveVertically()) {
            this.trigger('change:y');
        }
    }


    /**
     * RESIZE FUNCTIONS
     */
    public resizeLinkedByResizeEdge(resizeEdgePosition: ResizeEdgePosition,
                                    dx: number,
                                    dy: number): Vector2D {
        const edges = resizeEdgePosition.split('-');

        // Keep aspect Ratio for corners if no locking dimensions
        if (edges.length > 1 &&
            edges.every((edge: EdgePosition) => this.isEdgeResizable(edge))) {
            let trans = { x: dx, y: dy };
            trans = this.getLinkConstrainAspectRatioTrans(resizeEdgePosition, trans);
            dx = trans.x;
            dy = trans.y;
        } else {
            edges.forEach((edge: EdgePosition) => {
                const anchor = this.getAnchorByViewEdge(edge);
                switch (anchor.direction) {
                    case DimensionDirection.VERTICAL:
                        dx = this.isEdgeResizable(edge) && anchor.canMove() ?
                            anchor.linkedAnchors.getLinkedConstrainedDx(dx):
                            0;
                        break;
                    case DimensionDirection.HORIZONTAL:
                        dy = this.isEdgeResizable(edge) && anchor.canMove() ?
                            anchor.linkedAnchors.getLinkedConstrainedDy(dy) :
                            0;
                        break;
                }
            });
        }
        const translated = new TranslationRecord();
        edges.forEach((edge: EdgePosition) => {
            const anchor = this.getAnchorByViewEdge(edge);
            const linkedAnchors = anchor.linkedAnchors;
            linkedAnchors.forEach((linkedAnchor: Anchor) => {
                linkedAnchor.translate(dx, dy, translated)
            });
        });

        return {x: dx, y: dy};
    }

    private isEdgeResizable(viewEdge: EdgePosition): boolean {
        const anchor = this.getAnchorByViewEdge(viewEdge);

        if (anchor.isLinkedToBoard()) {
            return false;
        }

        return !anchor.isLinkedTo(this.getOppositeAnchor(anchor));
    }

    private resizeByAnchorEdge(edge: EdgePosition,
                               dx: number,
                               dy: number) {
        const trans = { x: dx, y: dy };

        const svgTrans = this.convertViewToSvgTrans(trans);
        const viewEdge = this.convertSvgToViewEdge(edge);

        let newWidth = this.width;
        let newHeight = this.height;
        let transX = 0;
        let transY = 0;

        switch (edge) {
            case 'top':
                newHeight += svgTrans.y;
                break;
            case 'right':
                newWidth += svgTrans.x;
                break;
            case 'bottom':
                if (viewEdge === 'top' || viewEdge === 'bottom') {
                    transY = trans.y;
                } else {
                    transX = trans.x;
                }
                newHeight -= svgTrans.y;
                break;
            case 'left':
                if (viewEdge === 'top' || viewEdge === 'bottom') {
                    transY = trans.y;
                } else {
                    transX = trans.x;
                }
                newWidth -= svgTrans.x;
                break;
        }

        if (newHeight < MIN_SIZE || newWidth < MIN_SIZE) {
            return;
        }

        this.translate(transX, transY);
        this.resize(newWidth, newHeight);
    }

    public resize(width: number, height: number) {
        this.setWidth(width);
        this.setHeight(height);
        this.has_moved = true;
        this.setAnchorPoints();
        this.trigger('resize', this);
    }

    public canMoveResizeEdge(resizeEdge: ResizeEdgePosition) {
        const edges = resizeEdge.split('-');

        const canResizeEdges = !edges.every((edge: EdgePosition ) => {
            return !this.isEdgeResizable(edge);
        });

        if (!canResizeEdges) {
            return false;
        }

        return edges.every((edge: EdgePosition ) => {
            return this.getAnchorByViewEdge(edge).canMove();
        });
    }

    private convertViewToSvgEdge(viewEdge) {
        const edgesArray = ['top', 'left', 'bottom', 'right'];
        const rotation = this.rotation;

        const viewEdgeIndex = edgesArray.indexOf(viewEdge);

        const svgEdgeIndex = (viewEdgeIndex + this.normalizeRotation(-rotation) / 90) % edgesArray.length;


        // Direction relative to svg data on the model
        const svgEdge = edgesArray[svgEdgeIndex];
        return svgEdge;
    }

    private convertSvgToViewEdge(viewEdge) {
        const edgesArray = ['top', 'left', 'bottom', 'right'];
        const rotation = this.rotation;

        const viewEdgeIndex = edgesArray.indexOf(viewEdge);

        const svgEdgeIndex = (viewEdgeIndex + this.normalizeRotation(rotation) / 90) % edgesArray.length;

        // Direction relative to svg data on the model
        const svgEdge = edgesArray[svgEdgeIndex];
        return svgEdge;
    }

    private convertViewToSvgTrans(viewTrans:  Vector2D): Vector2D {
        const rad = Math.PI / 180 * this.rotation;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const modelX = cos * viewTrans.x + sin * viewTrans.y;
        const modelY = cos * viewTrans.y - sin * viewTrans.x;

        //Coordinates relative to svg data orientation
        const svgTrans = {x: modelX, y: modelY};
        return svgTrans;
    }

    private convertSvgToViewTrans(viewTrans: Vector2D): Vector2D {
        const rad = -(Math.PI / 180 * this.rotation);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const modelX = cos * viewTrans.x + sin * viewTrans.y;
        const modelY = cos * viewTrans.y - sin * viewTrans.x;

        // Coordinates relative to svg data orientation
        const svgTrans = {x: modelX, y: modelY};
        return svgTrans;
    }

    /**
     * Changes resize translation so that it keeps the aspect ratio of logo
     */
    private resizeTransToAspectRatio(resizeEdge: ResizeEdgePosition,
                                     translate: Vector2D,
                                     type: AspectRatioType = 'average'): Vector2D {
        const edges = resizeEdge.split('-');

        // Size relative to workspace orientation
        const oldSize = this.convertSvgToViewTrans({x: this.width, y: this.height});

        // Width relative to workspace orientation
        const oldWidth = Math.abs(oldSize.x);
        let newWidth = oldWidth;

        // Height relative to workspace orientation
        const oldHeight = Math.abs(oldSize.y);
        let newHeight = oldHeight;

        edges.forEach(edge => {
            switch (edge) {
                case 'top':
                    newHeight += translate.y;
                    break;
                case 'right':
                    newWidth += translate.x;
                    break;
                case 'bottom':
                    newHeight -= translate.y;
                    break;
                case 'left':
                    newWidth -= translate.x;
                    break;
            }
        });

        const widthScale = newWidth / oldWidth;
        const heightScale = newHeight / oldHeight;

        let scale;
        switch (type) {
            case 'average':
                scale = (widthScale + heightScale) / 2;
                break;
            case 'width':
                scale = widthScale;
                break;
            case 'height':
                scale = heightScale;
                break;
        }

        newWidth = oldWidth * scale;
        newHeight = oldHeight * scale;

        const dx = oldWidth - newWidth;
        const dy = oldHeight - newHeight;
        let x = 0;
        let y = 0;

        edges.forEach(edge => {
            switch (edge) {
                case 'top':
                    y = -dy;
                    break;
                case 'right':
                    x = -dx;
                    break;
                case 'bottom':
                    y = dy;
                    break;
                case 'left':
                    x = dx;
                    break;
            }
        });

        return { x: x, y: y };
    }

    private getLinkConstrainAspectRatioTrans(resizeEdge: ResizeEdgePosition, trans: Vector2D): Vector2D {
        trans = this.resizeTransToAspectRatio(resizeEdge, trans);

        const slope = trans.x / trans.y;

        let constrainedDx = null;
        let constrainedDy = null;

        const edges = resizeEdge.split('-');
        edges.forEach((edge: EdgePosition) => {
            const anchor = this.getAnchorByViewEdge(edge);
            switch (anchor.direction) {
                case DimensionDirection.VERTICAL:
                    constrainedDx = anchor.linkedAnchors.getLinkedConstrainedDx(trans.x);
                    break;
                case DimensionDirection.HORIZONTAL:
                    constrainedDy = anchor.linkedAnchors.getLinkedConstrainedDy(trans.y);
                    break;
            }
        });

        if (constrainedDx === null && constrainedDy === null) {
            return trans;
        } else if (constrainedDx === 0 || constrainedDy === 0) {
            return { x: 0, y: 0 };
        } else if (constrainedDx === null || Math.abs(constrainedDx / constrainedDy) > Math.abs(slope)) {
            return { x: constrainedDy * slope, y: constrainedDy };
        } else {
            return { x: constrainedDx, y: constrainedDx / slope };
        }
    }

    public resizeEdgeSnap(resizeEdgePosition: ResizeEdgePosition): Vector2D {
        const edges = resizeEdgePosition.split('-');

        // Size relative to workspace orientation
        const size = this.convertSvgToViewTrans({x: this.width, y: this.height});

        // Width relative to workspace orientation
        const width = size.x;

        // Height relative to workspace orientation
        const height = size.y;

        let x;
        let y;
        edges.forEach(edge => {
            const svgDirection = this.convertViewToSvgEdge(edge);
            switch (edge) {
                case 'right':
                case 'left':
                    x = this.position.x;
                    if (svgDirection === 'right' || svgDirection === 'top') {
                        x += width;
                    }
                    break;
                case 'top':
                case 'bottom':
                    y = this.position.y;
                    if (svgDirection === 'right' || svgDirection === 'top') {
                        y += height;
                    }
                    break;
            }
        });

        let snapX;
        let snapY;
        let transX = 0;
        let transY = 0;
        if (x) {
            snapX = Workspace.boardValueSnap(x);
            transX = snapX - x;
        }
        if (y) {
            snapY = Workspace.boardValueSnap(y);
            transY = snapY - y;
        }

        let trans = {x: transX, y: transY};


        // Snap with axis closest to board snap if both axis was resized
        if (x && y) {
            let aspectRatioType;
            if (Math.abs(trans.x) < Math.abs(trans.y)) {
                aspectRatioType = 'width';
            } else {
                aspectRatioType = 'height';
            }
            trans = this.resizeTransToAspectRatio(resizeEdgePosition,
                                                  trans,
                                                  aspectRatioType);
        }

        return this.resizeLinkedByResizeEdge(resizeEdgePosition, trans.x, trans.y);
    }

    /**
     * ANCHORS
     */
    protected initAnchors(): void {
        this._anchors = ['top', 'right', 'bottom', 'left']
            .map((edge: EdgePosition) => createLogoAnchor(this, edge));
        this.resetLinkedAnchors();
    }

    public resetLinkedAnchors(): void {
        this._anchors.forEach((anchor: LogoAnchor) => {
            anchor.resetLinkedAnchors()
        });
    }

    public setAnchorPoints() {
        const x1 = 0;
        const y1 = 0;
        const x2 = this.width;
        const y2 = this.height;
        const lines = {};
        lines['top'] = new Line(new Point(x1, y2), new Point(x2, y2));
        lines['right'] = new Line(new Point(x2, y1), new Point(x2, y2));
        lines['bottom'] = new Line(new Point(x1, y1), new Point(x2, y1));
        lines['left'] = new Line(new Point(x1, y1), new Point(x1, y2));
        let rotation = this.rotation;
        while (rotation > 0) {
            for(const edge in lines) {
                lines[edge] = lines[edge].rotate();
            }
            rotation -= 90;
        }
        for(const edge in lines) {
            const line = lines[edge];
            this.getAnchorByEdge(edge as EdgePosition).setPoints(line.start, line.end);
        }
    }

    /**
     * Edge is relative to svg orientation
     */
    public getAnchorByEdge(edge: EdgePosition): LogoAnchor {
        return this._anchors.find(anchor => {
            return anchor.edge === edge;
        });
    }

    /**
     * Edge is relative to workspace orientation
     */
    public getAnchorByViewEdge(edge: EdgePosition): LogoAnchor {
        edge = this.convertViewToSvgEdge(edge) as EdgePosition;
        return this._anchors.find(anchor => {
            return anchor.edge === edge;
        });
    }

    public getOppositeAnchor(anchor: LogoAnchor): LogoAnchor {
        if (!anchor.belongsTo(this)) {
            throw new Error('Anchor does not belong to placed logo.');
        }
        switch(anchor.edge) {
            case 'top':
                return this.getAnchorByEdge('bottom');
            case 'left':
                return this.getAnchorByEdge('right');
            case 'bottom':
                return this.getAnchorByEdge('top');
            case 'right':
                return this.getAnchorByEdge('left');
        }
    }

    public moveAnchor(anchor: LogoAnchor,
                      dx: number,
                      dy: number,
                      translated: TranslationRecord): void {
        // Move placed logo
        const oppositeAnchor = this.getOppositeAnchor(anchor);
        if (anchor.linkedAnchors.isLinkedTo(oppositeAnchor)) {
            super.moveAnchor(anchor, dx, dy, translated);
            return;
        }

        // Resize placed logo
        if (translated.previouslyTranslated(anchor, dx, dy)) {
            return;
        }
        translated.registerTranslation(anchor, dx, dy);

        this.resizeByAnchorEdge(anchor.edge, dx, dy);

    }

    public getAnchorDxRange(anchor: LogoAnchor): { min: number, max: number } {
        if (!anchor.canMoveHorizontally) {
            return { min: 0, max: 0 };
        }

        const leftAnchor = this.getAnchorByViewEdge('left');
        const rightAnchor = this.getAnchorByViewEdge('right');
        if (leftAnchor.linkedAnchors.isLinkedTo(rightAnchor)) {
            return { min: null, max: null };
        }

        let minDx = null;
        let maxDx = null;

        const svgEdge = anchor.edge;
        const viewEdge = this.convertSvgToViewEdge(svgEdge);

        const length = svgEdge === 'top' || svgEdge === 'bottom' ?
            this.height :
            this.width;

        switch (viewEdge) {
            case 'top':
            case 'right':
                minDx = (MIN_SIZE) - length;
                break;
            case 'left':
            case 'bottom':
                maxDx = length - (MIN_SIZE);
                break;
        }
        return {min : minDx, max: maxDx};
    }

    public getAnchorDyRange(anchor: LogoAnchor): { min: number, max: number } {
        if (!anchor.canMoveVertically()) {
            return { min: 0, max: 0 };
        }

        const topAnchor = this.getAnchorByViewEdge('top');
        const bottomAnchor = this.getAnchorByViewEdge('bottom');
        if (topAnchor.linkedAnchors.isLinkedTo(bottomAnchor)) {
            return { min: null, max: null };
        }

        let minDy = null;
        let maxDy = null;

        const svgEdge = anchor.edge;
        const viewEdge = this.convertSvgToViewEdge(svgEdge);

        const length = svgEdge === 'top' || svgEdge === 'bottom' ?
            this.height :
            this.width;

        switch (viewEdge) {
            case 'top':
            case 'right':
                minDy = MIN_SIZE - length;
                break;
            case 'left':
            case 'bottom':
                maxDy = length - MIN_SIZE;
                break;
        }

        return {min : minDy, max: maxDy};
    }

    /////////////////////////  Server

    public toJSON() {
        return {
            uuid: this.uuid,
            svgData: this.svgData,
            x: this.boardPosition.x,
            y: this.boardPosition.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
        };
    }

    public toResource(): PlacedLogoResource {
        return {
            id: this.id,
            uuid: this.uuid,
            svg_data: this.svgData,
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
        };
    }
}