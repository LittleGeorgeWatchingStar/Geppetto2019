import {Workspace} from "../../workspace/Workspace";
import * as Backbone from "backbone";
import {ViewOptions} from "backbone";
import {PlacedItem} from "../PlacedItem";
import * as $ from "jquery";
import eventDispatcher from "../../utils/events";
import {BOARD_RESIZE} from "../../design/events";
import {REFOCUS} from "../../toolbar/events";
import {ESC, WORKSPACE_CLICK} from "../../workspace/events";
import {Point, Vector2D} from "../../utils/geometry";
import {
    closeContext,
    ContextMenuItem,
    openContext
} from "../../view/ContextMenu";
import {closeBlockMenu, openBlockMenu, toggleBlockOptions} from "./Menu";
import {BLOCK_MOVE, MoveEvent} from "../events";
import {BLOCK_ON_DRAG_ROTATE, BLOCK_ROTATE} from "../../placedmodule/events";
import {MoveBlock} from "../actions";
import {getKeyName, isArrowKey} from "../../view/keys";
import userController from "../../auth/UserController";
import {AnchorsComponent} from "../../dimension/Anchor/AnchorsComponent";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {DimensionToolbuttonLockTooltipController} from "../../toolbar/toolbutton/DimensionToolbuttonLockTooltipController";

let horizontal,
    vertical;

export interface DraggablePlacedItemUIParams extends JQueryUI.DraggableEventUIParams {
    originalPosition: JQuery.Coordinates;
}

export interface PlacedItemViewParams<T extends PlacedItem> extends ViewOptions<T> {
    workspace: Workspace;
    onMousewheel: (event) => void;
}

let currentTrans: Vector2D;

export abstract class PlacedItemView<T extends PlacedItem> extends Backbone.View<T> {
    protected workspace: Workspace;
    private hasRendered = false;
    private isDragging = false;

    /**
     * For temporarily raising this item above others while dragged.
     */
    private previousZIndex: number | string;
    protected onMousewheel: (event) => void;
    private onDragRotateHotkeyActive: boolean;

    constructor(options: PlacedItemViewParams<T>) {
        super(options);
    }

    initialize(options: PlacedItemViewParams<T>) {
        this.workspace = options.workspace;
        this.onMousewheel = options.onMousewheel;
        this.onDragRotateHotkeyActive = false;

        const html = this.getViewHtml();
        this.$el.html(html)
            .addClass(this.viewClassName)
            .attr({
                uid: this.model.cid,
                tabindex: 0
            })
            .data({model: this.model});

        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'rotate', () => {
            if (!this.onDragRotateHotkeyActive) {
                this.render();
                this.openBlockContext();
            } else {
                this.setupDraggable();
                this.render();
                this.abortDragging();
            }
        });
        this.listenTo(this.model, 'remove', this.remove);
        this.listenTo(this.workspace, 'change:zoom', this.updateZoom);
        this.listenTo(eventDispatcher, BOARD_RESIZE, this.unselect);
        this.listenTo(eventDispatcher, WORKSPACE_CLICK, () => this.unselect());
        this.listenTo(eventDispatcher, ESC, () => this.unselect());
        this.listenTo(eventDispatcher, REFOCUS, () => this.render());
        this.$el.one('touchstart', () => this.setupSnap());

        this.renderAnchors();

        // Do not render the view here (Do it after it has been appended to the
        // DOM). When setting up draggable, the view has to be appended to the
        // DOM and have a position, or JQuery UI will put "position: relative"
        // on it.
    }

    protected abstract get viewClassName(): string;

    protected abstract get svgContainerSelector(): string;

    protected abstract get clickEventName(): string;

    protected abstract get dragEventName(): string;

    protected abstract get selectEventName(): string;

    protected abstract get removeEventName(): string;

    public render() {
        if (this.hasRendered) {
            this.subsequentRender();
        } else {
            this.firstRender();
        }
        this.hasRendered = true;
        return this;
    }

    private firstRender() {
        // Only initialize draggable once this element is visible, since
        // otherwise it will be positioned relative rather than absolute.
        // Relative positioning causes UI glitches if some HTML element changes
        // or gets removed since it affects all following sibling elements.
        this.setupDraggable();
        this.subsequentRender();
    }

    protected checkClick(event): void {

        /**
         * Something is stopping the placed item click from getting focused
         * NOTE: Very noticeable when the focus is on a text input (eg. library search)
         *  and clicking on a placed item doesn't take the focus away from the text input.
         *  This makes it so if you want to click on a placed module and rotate it with the shortcut key 'R'
         *  very awkward, as it would type in to the text input instead.
         */
        this.$el.trigger('focus');

        if (this.isDragging) {
            // Prevent triggering a click on mouseup if the user has just finished dragging.
            this.isDragging = false;
        } else {
            eventDispatcher.publish(this.clickEventName, this.model);
            if (event.which === 1) {
                if (!this.model.isSelected || !toggleBlockOptions()) {
                    this.openBlockContext();
                }
            }
        }
    }

    protected subsequentRender() {
        const scale = this.workspace.scale;
        const outline = this.model.getOutline();
        const displayOutline = this.model.getDisplayOutline();
        const overlaps = this.model.overlaps();

        this.$el.toggleClass('overlaps', overlaps);
        this.$el.toggleClass('selected', this.model.isSelected);

        this.$el.css({
            width: outline.width * scale,
            height: outline.height * scale,
        });

        this.$('.svg-container').css({
            'width': displayOutline.width * scale,
            'height': displayOutline.height * scale,
            'margin-left': `${(outline.width - displayOutline.width) * scale / 2}px`,
            'margin-top': `${(outline.height - displayOutline.height) * scale / 2}px`,
        });

        this.$('.outline svg')[0].setAttribute('viewBox', displayOutline.xmin + " " + displayOutline.ymin + " " + displayOutline.width + " " + displayOutline.height);
        this.$('.outline svg > g').attr('transform', "translate(0," + (displayOutline.ymax + displayOutline.ymin) + ") scale(1,-1)");

        this.updatePosition();
    }

    protected abstract getViewHtml(): string;

    onHotkey(event): void {
        const keyname = getKeyName(event.which);
        if (keyname === 'DELETE') {
            eventDispatcher.publishEvent(this.removeEventName, {model: this.model});
            return;
        }
        if (keyname === 'R' && !event.ctrlKey) {
            this.checkRotate();
            return;
        }
        if (keyname === 'SPACE' && this.onDragRotateHotkeyActive) {
            this.checkRotate();
            return;
        }
        this.checkMove(event);
    }

    get isSelected(): boolean {
        return this.model.isSelected;
    }

    private checkMove(event) {
        if (!isArrowKey(event.which)) return;
        let dx = 0,
            dy = 0;
        const keyName = getKeyName(event.which);
        const grid = Workspace.GRID;
        switch (keyName) {
            case 'UP':
                dy = grid;
                break;
            case 'RIGHT':
                dx = grid;
                break;
            case 'DOWN':
                dy = -grid;
                break;
            case 'LEFT':
                dx = -grid;
                break;
        }
        this.dispatchMove({x: dx, y: dy});
    }

    public remove() {
        this.unselect();
        closeBlockMenu();
        return super.remove();
    }

    /**
     * Activate on mousedown, as drag should deselect other placed items.
     */
    public select(): void {
        if (this.model.isSelected) {
            return;
        }
        eventDispatcher.publish(this.selectEventName, this.model);
        this.model.designRevision.selectPlacedItem(this.model);
    }

    protected unselect(): void {
        this.model.designRevision.selectPlacedItem(null);
        this.model.designRevision.groupSelectPlacedItem(null);
    }

    public multiSelect(): void {
        eventDispatcher.publish(this.selectEventName, this.model);
        this.model.designRevision.groupSelectPlacedItem(this.model);
        closeContext();
        closeBlockMenu();
    }

    public get zIndex(): number | string {
        return this.$el.find(this.svgContainerSelector).zIndex();
    }

    /**
     * Set the z-index of this module.
     *
     * Smaller placed items should have higher z-indexes so the user can click
     * on them.
     */
    public set zIndex(index: number | string) {
        this.$el.find(this.svgContainerSelector).css({zIndex: index});
    }

    private updateZoom() {
        this.render();
        this.updateDragGrid();
        // Zooming while dragging causes all kinds of UI glitches, so let's disallow it.
        this.abortDragging();
        closeBlockMenu();
    }

    protected setupDraggable(): void {
        this.$el.draggable({
            revertDuration: 0,
            scroll: false,
            start: (event, ui) => this.startDrag(event, ui as DraggablePlacedItemUIParams),
            drag: (event, ui) => this.drag(event, ui as DraggablePlacedItemUIParams),
            stop: (event, ui) => this.stopDrag(event, ui as DraggablePlacedItemUIParams),
            distance: 5, // Desensitize touch drags
        });
        this.updateDragGrid();
    }

    private updateDragGrid() {
        const grid = this.workspace.screenCoordsGrid();
        this.$el.draggable({
            grid: [grid, grid]
        });
    }

    private abortDragging() {
        if (!this.isDragging) {
            return;
        }

        // Revert the module position to prevent it from weirdly moving off somewhere due to zoom.
        this.$el.draggable("option", "revert", true);
        this.$el.mouseup();
        this.unselect();
        this.$el.draggable("option", "revert", false);
        this.isDragging = false;
    }

    private startDrag(event: Event, ui: DraggablePlacedItemUIParams) {
        this.onDragRotateHotkeyActive = true;
        eventDispatcher.publish(BLOCK_ON_DRAG_ROTATE);

        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;

        horizontal = this.model.canMoveHorizontally();
        vertical = this.model.canMoveVertically();

        if (!horizontal && !vertical) {
            // Both axes are locked, can't touch this.
            DimensionToolbuttonLockTooltipController.getInstance().triggerLockTooltip();
            return false;
        } else if (!vertical) {
            this.$el.draggable('option', 'axis', 'x');
        } else if (!horizontal) {
            this.$el.draggable('option', 'axis', 'y');
        } else {
            this.$el.draggable('option', 'axis', false);
        }

        this.previousZIndex = this.zIndex;
        this.zIndex = 1000;

        eventDispatcher.publish(this.dragEventName);
        this.isDragging = true;
        closeContext();
        closeBlockMenu();

        currentTrans = {x: 0, y: 0};
    }

    /**
     * Moves the placed item temporarily as you drag so paths can be computed
     * on drag. Placed item is later moved back to original position and moved
     * in a single action so that the history can undo the entire drag process.
     */
    private drag(event: Event, ui: DraggablePlacedItemUIParams) {
        const dx = horizontal ? ui.offset.left - ui.originalPosition.left : 0;
        const dy = vertical ? ui.offset.top - ui.originalPosition.top : 0;
        let translate = new Point(dx, -dy);

        translate = this.workspace.screenPointToBoard(translate);

        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;

        this.model.translateVector(translate);
        this.model.designRevision.temporaryUpdateGroupPlacedItemPosition(this.model, translate);

        currentTrans = {
            x: currentTrans.x + translate.x,
            y: currentTrans.y + translate.y,
        };

        if (userController.getUser().isBetaTester()) {
            this.model.designRevision.computePathIntersections();
        }
    }

    private stopDrag(event: Event, ui: DraggablePlacedItemUIParams) {
        this.onDragRotateHotkeyActive = false;
        eventDispatcher.publish(BLOCK_ON_DRAG_ROTATE);

        const reverseTrans = {
            x: -currentTrans.x,
            y: -currentTrans.y
        };
        this.model.translateVector(reverseTrans);
        this.model.designRevision.temporaryUpdateGroupPlacedItemPosition(this.model, reverseTrans);

        const translate = Workspace.boardPointSnap(currentTrans);
        if (translate.x !== 0 || translate.y !== 0) {
            this.dispatchMove(translate);
        }
        this.zIndex = this.previousZIndex;
    }

    protected updatePosition(): void {
        if ($('#board').length === 0) {
            // TODO position cannot update when the board DOM doesn't exist, which may be the case in tests.
            // While we can remove() fixtures, it only takes one erroneous callback to break a bunch of tests...
            return;
        }
        const scale = this.workspace.scale,
            outline = this.model.getOutline(),
            footprintPolylines = this.model.getFootprintPolylines(),
            footprintPathD = footprintPolylines.map(polyline => polyline.svgPath()).join(' '),
            bottom = -((this.model.boardPosition.y + outline.ymin) * scale),
            left = (this.model.boardPosition.x + outline.xmin) * scale;

        this.$el.position({
            my: 'left+' + left + ' bottom+' + bottom,
            at: 'left bottom',
            of: '#board',
            collision: "none"
        });

        this.$('path.footprint').attr('d', footprintPathD)
    }

    protected checkRotate() {
        if (this.model.canBeRotated()) {
            eventDispatcher.publishEvent(BLOCK_ROTATE, {
                model: this.model
            });
        }
    }

    protected dispatchMove(translate: Vector2D): void {
        eventDispatcher.publishEvent(BLOCK_MOVE, {
            model: this.model,
            translation: translate
        } as MoveEvent);
        this.model.designRevision.updateGroupPlacedItemPosition(this.model, translate);
        closeBlockMenu();
    }

    protected get rotateItem(): ContextMenuItem {
        return {label: 'Rotate 90° CCW', callback: () => this.checkRotate(), selector: 'rotate'};
    }

    protected get boardEdgeItem(): ContextMenuItem | undefined {
        if (!this.model.isOnEdge) {
            return {
                label: 'Move to board edge',
                callback: () => MoveBlock.toBoardEdge(this.model),
                selector: 'fit-edge'
            };
        }
    }

    protected get cornerItem(): ContextMenuItem | undefined {
        if (!this.model.isInCorner) {
            return {
                label: 'Move to corner',
                callback: () => MoveBlock.toBoardCorner(this.model),
                selector: 'fit-corner'
            };
        }
    }

    protected contextMenu(event): void {
        openContext(event, this.getMenuItems());
        closeBlockMenu();
    }

    protected openBlockContext(): void {
        openBlockMenu(this.el, this.horizontalMenuItems, this.model);
    }

    protected abstract getMenuItems(): ContextMenuItem[];

    protected abstract get horizontalMenuItems(): ContextMenuItem[];

    /**
     * Snap is touch only.
     */
    private setupSnap() {
        const grid = this.workspace.screenCoordsGrid();
        const options: JQueryUI.DraggableOptions = {
            snap: `.${this.viewClassName}`,
            snapMode: 'outer',
            snapTolerance: grid
        };

        this.$el.draggable(options);
    }

    protected renderAnchors(): void {
        ReactDOM.render(
            <AnchorsComponent workspace={this.workspace}
                              anchors={this.model.anchors}/>,
            this.$('svg g.anchors')[0]
        );
    }

    public abstract events();
}
