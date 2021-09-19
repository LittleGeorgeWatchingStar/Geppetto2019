import * as placedLogoTemplate from "templates/placed_logo";
import {PlacedLogo, ResizeEdgePosition} from "./PlacedLogo";
import eventDispatcher from "../utils/events";
import {
    PLACED_LOGO_CLICK,
    PLACED_LOGO_DRAG,
    PLACED_LOGO_REMOVE,
    PLACED_LOGO_RESIZE,
    PLACED_LOGO_SELECT
} from "./events";
import {Point, Vector2D} from "../utils/geometry";
import * as $ from "jquery";
import {
    DraggablePlacedItemUIParams,
    PlacedItemView,
    PlacedItemViewParams
} from "../placeditem/view/PlacedItemView";
import {ContextMenuItem} from "../view/ContextMenu";
import {MoveEvent} from "../placeditem/events";
import {closeBlockMenu} from "../placeditem/view/Menu";
import * as ReactDOM from "react-dom";
import {AnchorsComponent} from "../dimension/Anchor/AnchorsComponent";
import * as React from "react";
import {DimensionToolbuttonLockTooltipController} from "../toolbar/toolbutton/DimensionToolbuttonLockTooltipController";


let currentResizeEdge: ResizeEdgePosition;
let currentResizeTrans: Vector2D;

export class PlacedLogoView extends PlacedItemView<PlacedLogo> {

    initialize(options: PlacedItemViewParams<PlacedLogo>) {
        super.initialize(options);

        this.resizable();
        this.listenTo(this.model, 'resize', this.resize);

        return this;
    }

    protected get viewClassName(): string {
        return 'logo';
    }

    protected get svgContainerSelector(): string {
        return '.logo-svg-container';
    }

    protected get clickEventName(): string {
        return PLACED_LOGO_CLICK;
    }

    protected get dragEventName(): string {
        return PLACED_LOGO_DRAG;
    }

    protected get selectEventName(): string {
        return PLACED_LOGO_SELECT;
    }

    protected get removeEventName(): string {
        return PLACED_LOGO_REMOVE;
    }

    protected subsequentRender() {
        super.subsequentRender();

        this.setSvgViewBox();
        this.$('.data svg')[0].setAttribute('preserveAspectRatio', 'none');
        this.$('.data').css({
            'transform': `rotate(-${this.model.rotation}deg)`,
        });
    }

    /**
     * Sets viewBox attribute to the logo SVG if it does not have one (requires
     * height and width to do this)
     * viewBox attribute is the best way to dynamically scale SVGs
     */
    private setSvgViewBox(): void {
        const svgEl = this.$('.data svg')[0];

        if (svgEl instanceof SVGSVGElement) {
            const viewBox = svgEl.getAttribute('viewBox');
            const widthUnitType = svgEl.width.baseVal.unitType;
            const heightUnitType = svgEl.height.baseVal.unitType;
            const width = svgEl.width.baseVal.valueInSpecifiedUnits;
            const height = svgEl.height.baseVal.valueInSpecifiedUnits;

            // Unit type 2 = percentage
            if (null == viewBox &&
                widthUnitType !== 2 &&
                heightUnitType !== 2) {
                svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`)
            }
        }
    }

    protected getViewHtml(): string {
        return placedLogoTemplate({
            title: '',
            summary: '',
            outline: this.model.getDisplayOutline(),
            svgData: this.model.svgData,
        });
    }

    protected updatePosition() {
        super.updatePosition();

        const scale = this.workspace.scale;
        const outline = this.model.getDisplayOutline();
        this.$('.data').css({
            position: 'absolute',
            top: (outline.height - this.model.height) / 2 * scale,
            left: (outline.width - this.model.width) / 2 * scale,
            width: this.model.width * scale,
            height: this.model.height * scale,
        });
    }

    private dispatch(eventName: string): void {
        eventDispatcher.publishEvent(eventName, {model: this.model});
    }

    private get deleteItem(): ContextMenuItem {
        return {label: 'Delete', callback: () => this.dispatch(PLACED_LOGO_REMOVE)};
    }

    protected getMenuItems(): ContextMenuItem[] {
        return [
            this.rotateItem,
            this.deleteItem
        ].filter(i => undefined != i);
    }

    /**
     * Make the placed logo resizable.
     */
    resizable(): void {
        const workspace = this.workspace;
        const grid = workspace.screenCoordsGrid();
        const options: JQueryUI.DraggableOptions = {
            start: (event, ui) => this.startResize(event, (ui as DraggablePlacedItemUIParams)),
            drag: (event, ui) => this.dragResize(event, (ui as DraggablePlacedItemUIParams)),
            stop: () => this.stopResize(),
            scroll: false,
            grid: [grid, grid]
        };

        this.$('.resize.top-left').draggable(options);
        this.$('.resize.top-right').draggable(options);
        this.$('.resize.bottom-left').draggable(options);
        this.$('.resize.bottom-right').draggable(options);

        options.axis = 'x';
        this.$('.resize.left').draggable(options);
        this.$('.resize.right').draggable(options);

        options.axis = 'y';
        this.$('.resize.top').draggable(options);
        this.$('.resize.bottom').draggable(options);

        this.clearResizeHandlePositions();
    }

    startResize(event: Event, ui: DraggablePlacedItemUIParams) {
        closeBlockMenu();
        const resizeEdge = ($(event.target).data('direction') as ResizeEdgePosition);

        // Abort resize if anchors are locked
        if (!this.model.canMoveResizeEdge(resizeEdge)) {
            DimensionToolbuttonLockTooltipController.getInstance().triggerLockTooltip();
            return false;
        }

        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;
        currentResizeEdge = resizeEdge;
        currentResizeTrans = {x: 0, y: 0};
    }

    /**
     * Resizes the logo as you drag (Doesn't use 'undo history', because that
     * would keep pushing to the history as you drag)
     */
    dragResize(event: Event, ui: DraggablePlacedItemUIParams) {
        const x = ui.offset.left - ui.originalPosition.left;
        const y = ui.offset.top - ui.originalPosition.top;
        const point = new Point(x, y);

        const coords = this.workspace.screenPointToBoard(point);
        const trans = {x: coords.x, y: -coords.y};

        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;

        ui.position.left = null;
        ui.position.top = null;
        $(ui.helper).css({
            left: '',
            top: ''
        });

        this.clearResizeHandlePositions();

        const resultTrans = this.model.resizeLinkedByResizeEdge(currentResizeEdge, trans.x, trans.y);
        currentResizeTrans = {
            x: currentResizeTrans.x + resultTrans.x,
            y: currentResizeTrans.y + resultTrans.y
        };
    }

    /**
     * Reverts model back to how it was before 'dragResize', and execute the
     * resize action so that the resize is one action in the 'undo history'
     */
    stopResize() {
        const reverseTrans = {
            x: -currentResizeTrans.x,
            y: -currentResizeTrans.y
        };
        this.model.resizeLinkedByResizeEdge(currentResizeEdge, reverseTrans.x, reverseTrans.y);
        this.dispatchResize(currentResizeEdge, currentResizeTrans);
    }

    private clearResizeHandlePositions(): void {
        this.$('.resize').removeAttr('style');
    }

    private dispatchResize(resizeEdge: ResizeEdgePosition, translate: Vector2D): void {
        eventDispatcher.publishEvent(PLACED_LOGO_RESIZE, {
            model: this.model,
            resizeEdge: resizeEdge,
            translation: translate
        } as MoveEvent);
    }

    resize(): void {
        this.render();
    }

    /**
     * Repositioning items (rotate, move to board) are already handled as default options in the BlockMenu.
     * @see BlockMenu
     */
    protected get horizontalMenuItems(): ContextMenuItem[] {
        return [
            this.deleteItem
        ];
    }

    protected renderAnchors(): void {
        ReactDOM.render(
            <AnchorsComponent workspace={this.workspace}
                              anchors={this.model.anchors}/>,
            this.$('.outline svg g.anchors')[0]
        );
    }

    events() {
        return {
            'mousedown .logo-svg-container': this.select,
            'click .logo-svg-container': this.checkClick,
            'contextmenu .logo-svg-container': this.contextMenu,
            mousewheel: event => this.onMousewheel(event)
        }
    }
}
