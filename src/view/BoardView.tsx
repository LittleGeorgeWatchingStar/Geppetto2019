import * as Backbone from "backbone";
import {ViewOptions} from "backbone";
import PathView from "connection/PathView";
import {BOARD_RESIZE_DRAGSTART} from "design/events";
import * as $ from "jquery";
import "lib/move";
import * as boardTemplate from "templates/board";
import events from "utils/events";
import {Point} from "utils/geometry";
import {Workspace} from "workspace/Workspace";
import {Board} from "../model/Board";
import {ServerID} from "../model/types";
import {BOARD_RESIZE} from "../design/events";
import {RESIZE_BOARD, ResizeEvent} from "./events";
import {EdgePosition} from "../dimension/Dimensionable";
import {Vector2D} from "../utils/geometry";
import {PseudoModuleTile} from "./librarypanel/PseudoModuleTile";
import {Module} from "../module/Module";
import * as ReactDOM from "react-dom";
import {AnchorsComponent} from "../dimension/Anchor/AnchorsComponent";
import * as React from "react";
import {DimensionToolbuttonLockTooltipController} from "../toolbar/toolbutton/DimensionToolbuttonLockTooltipController";
import UserController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";
import {CornerRadius} from "../board/CornerRadius";
import {ACTION_EXECUTED, ACTION_REVERSED} from "../placedmodule/events";


export interface BoardViewOptions extends ViewOptions<Board> {
    workspace: Workspace;
    addModuleById: (id: ServerID, position: Point) => void;
    addLogo: (position: Point) => void;
    findModule: (id: ServerID) => Module | undefined;

    // The following interactions on the board behave like the workspace grid:
    onClick: () => void;
    onMousewheel: (event) => void;
    onContextMenu: (event) => void;
}

interface DraggableBoardUIParams extends JQueryUI.DraggableEventUIParams {
    originalPosition: JQuery.Coordinates;
}

let currentResizeEdge: EdgePosition;
let currentResizeTrans: Vector2D;

export class BoardView extends Backbone.View<Board> {
    private workspace: Workspace;
    private pathView;
    private radius: number;
    private addModuleById: (id: ServerID, position: Point) => void;
    private addLogo: (position: Point) => void;
    private onClick: () => void;
    private onMousewheel: (event) => void;
    private onContextMenu: (event) => void;

    // TODO needed for matching the module tile drag shadow position more closely.
    private findModule: (id: ServerID) => Module | undefined;

    initialize(options: BoardViewOptions) {
        this.workspace = options.workspace;
        this.addModuleById = options.addModuleById;
        this.findModule = options.findModule;
        this.addLogo = options.addLogo;
        this.onClick = options.onClick;
        this.onMousewheel = options.onMousewheel;
        this.onContextMenu = options.onContextMenu;
        this.setElement(boardTemplate());

        this.renderAnchors();
        this.resizable();
        this.droppable();

        this.listenTo(this.board, 'change', () => this.render());
        this.listenTo(this.board, 'change:x', (board, newX) => this.changeX(board, newX));
        this.listenTo(this.board, 'change:height change:y', board => this.changeHeight(board));
        this.listenTo(this.workspace, 'change:zoom', () => this.renderCornerRadius(false));
        this.listenTo(this.board, 'change', () => this.renderCornerRadius(false));
        this.listenTo(events, ACTION_REVERSED, () => this.renderCornerRadius(true));
        this.listenTo(events, ACTION_EXECUTED, () => this.renderCornerRadius(true));

        this.$el.one('touchstart', () => this.setupSnap());

        this.pathView = new PathView({model: this.board});
        this.render();
        this.renderCornerRadius(false);
    }

    public get board(): Board {
        return this.model;
    }

    private renderCornerRadius(actionApplied: boolean) {
        ReactDOM.render(<CornerRadius board={this.board}
                                      workspace={this.workspace}
                                      updateBoardRadius={(r) => this.updateBoardRadius(r)}
                                      actionApplied={actionApplied}/>, this.el.querySelector('.radius-control'));
    }

    private updateBoardRadius(renderRadius: number): void {
        this.$el.css('border-radius', renderRadius);
    }

    startResize(startevent: Event, ui: DraggableBoardUIParams) {
        const edge = $(startevent.target).data('direction') as EdgePosition;

        // Abort resize if the drag target wasn't a board handle or board anchor is locked
        if (!edge || !this.board.canMoveEdge(edge)) {
            //shows tooltip if the board's dimension is locked;
            DimensionToolbuttonLockTooltipController.getInstance().triggerLockTooltip();
            return false;
        }
        this.radius = this.board.getCornerRadius();
        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;
        currentResizeEdge = edge;
        currentResizeTrans = {x: 0, y: 0};

        events.publish(BOARD_RESIZE_DRAGSTART);
    }

    dragResize(event: Event, ui: DraggableBoardUIParams) {
        const edge = $(event.target).data('direction') as EdgePosition;

        if (!edge) {
            return false;
        }

        const x = ui.offset.left - ui.originalPosition.left;
        const y = ui.offset.top - ui.originalPosition.top;
        const point = new Point(x, y);

        let coords = this.workspace.screenPointToBoard(point);

        ui.originalPosition.left = ui.offset.left;
        ui.originalPosition.top = ui.offset.top;

        ui.position.left = null;
        ui.position.top = null;
        $(ui.helper).css({
            left: '',
            top: ''
        });

        coords = Workspace.boardPointSnap(coords);
        this.board.resizeLinkedByEdge(edge, coords.x, -coords.y);
        currentResizeTrans = {
            x: currentResizeTrans.x + coords.x,
            y: currentResizeTrans.y - coords.y
        };
        events.publish(BOARD_RESIZE, this.board);
        this.clearHandlePositions();
    }

    /**
     * Reverts board back to how it was before 'dragResize', and execute the
     * resize action so that the resize is one action in the 'undo history'
     */
    stopResize() {
        const reverseTrans = {
            x: -currentResizeTrans.x,
            y: -currentResizeTrans.y
        };
        this.model.resizeLinkedByEdge(currentResizeEdge, reverseTrans.x, reverseTrans.y);
        events.publishEvent(RESIZE_BOARD, {
            model: this.model,
            edge: currentResizeEdge,
            vector: currentResizeTrans,
            radius: this.radius
        } as ResizeEvent);
    }

    /**
     * Make the board resizable.
     */
    resizable(): void {
        const workspace = this.workspace;
        const grid = workspace.screenCoordsGrid();
        const options: JQueryUI.DraggableOptions = {
            start: (event, ui) => this.startResize(event, (ui as DraggableBoardUIParams)),
            drag: (event, ui) => this.dragResize(event, (ui as DraggableBoardUIParams)),
            stop: () => this.stopResize(),
            scroll: false,
            grid: [grid, grid]
        };

        options.axis = 'x';
        this.$('.resize.left').draggable(options);
        this.$('.resize.right').draggable(options);

        options.axis = 'y';
        this.$('.resize.top').draggable(options);
        this.$('.resize.bottom').draggable(options);
        this.clearHandlePositions();
    }

    /**
     * Configure the board as a droppable area (onto which modules can be
     * dropped).
     */
    private droppable() {
        this.$el.droppable({
            accept: '.module-tile',
            greedy: true,
            tolerance: 'touch',
            drop: (event, ui) => this.onDrop(ui)
        });
    }

    private onDrop(ui: JQueryUI.DroppableEventUIParam): void {
        const revId = ui.draggable.data('module-id');
        if (revId) {
            const module = this.findModule(revId);
            let position = this.getPosition(ui);
            if (module) {
                position = position.subtract(module.outlineMinPoint);
            }
            this.addModuleById(revId, position);
        } else if (ui.draggable.data('logo-id') === PseudoModuleTile.LOGO_ID) {
            this.addLogo(this.getPosition(ui));
        }
    }

    /**
     * Get absolute position of the module, in units.
     */
    private getPosition(ui: JQueryUI.DroppableEventUIParam) {
        // Position of the module on the board, in pixels
        let position = this.calculateModulePositionFromDrop(ui.helper);

        // Position of the module on the board, in units
        position = this.workspace.screenPointToBoard(position);

        // The snapped position on the board, in units
        position = Workspace.boardPointSnap(position);

        // Absolute position of the module, in units.
        position = position.add(this.board.position);
        return position;
    }

    private calculateModulePositionFromDrop(draggedNode: JQuery): Point {
        const module_offset = draggedNode.offset();
        const board_offset = this.$el.offset();
        const x = module_offset.left - board_offset.left;
        const y = this.$el.outerHeight() - (module_offset.top - board_offset.top) - draggedNode.outerHeight();
        draggedNode.remove();
        return new Point(x, y);
    }

    render() {
        this.updateSize();
        this.setViewBox();

        const board = this.board;
        this.$el.removeClass("connected ready unready color-pcb");
        if (board.isConnected()) {
            this.$el.addClass("connected");
        } else if (board.isReady()) {
            this.$el.addClass("ready");
        } else {
            this.$el.addClass("unready");
        }

        const user = UserController.getUser();
        if (user.isFeatureEnabled(FeatureFlag.WORKSPACE_MODE_THREED_IMAGE)) {
            this.$el.addClass("color-pcb");
        }

        this.updateTransformation();
        return this;
    }

    private updateSize(): void {
        const scale = this.workspace.scale;
        this.$el.css({
            width: Math.ceil(this.board.getWidth() * scale),
            height: Math.ceil(this.board.getHeight() * scale)
        });
    }

    private setViewBox(): void {
        const x = this.board.position.x;
        const y = this.board.position.y;
        const width = Workspace.boardValueSnap(this.board.getWidth());
        const height = Workspace.boardValueSnap(this.board.getHeight());

        this.$('svg')[0].setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }

    changeX(board: Board, new_x: number): void {
        const scale = this.workspace.scale,
            dx = new_x - board.previous('x');
        this.moveOffset(dx * scale, 0);
    }

    changeHeight(board: Board) {
        const scale = this.workspace.scale,
            dy = board.y - board.previous('y'),
            dh = board.getHeight() - board.previous('height');

        this.updateTransformation();
        this.moveOffset(0, -(dh + dy) * scale);
    }

    updateTransformation(): void {
        const board = this.board;
        const y1 = board.y;
        const dx = board.x;
        // I have discovered a truly marvelous derivation of this formula
        // that this comment is too narrow to contain.
        const dy = -board.getHeight() - y1;
        const transformations = [
            // In eagle's coordinates, which we mostly work in, (0,0) is the
            // lower left corner, whereas it's the upper left in the browser.
            // We hence have to mirror about the horizontal axis.
            'scale(1,-1)',
            'translate(' + dx + ',' + dy + ')'
        ];
        this.$('svg > g').attr('transform', transformations.join(' '));
    }

    moveOffset(dx: number, dy: number): void {
        const offset = this.$el.offset();
        this.$el.offset({
            left: offset.left + dx,
            top: offset.top + dy,
        });
    }

    private clearHandlePositions(): void {
        this.$('.resize').removeAttr('style');
    }

    /**
     * Snap is touch only.
     */
    private setupSnap() {
        const grid = this.workspace.screenCoordsGrid();
        const options: JQueryUI.DraggableOptions = {
            snap: '.logo, .module',
            snapMode: 'outer',
            snapTolerance: grid
        };

        this.$('.resize.left').draggable(options);
        this.$('.resize.right').draggable(options);
        this.$('.resize.top').draggable(options);
        this.$('.resize.bottom').draggable(options);
    }

    /**
     * Display immediate feedback for touch.
     */
    private highlightResize(event): void {
        const leftMouseButton = event.which === 1;
        if (leftMouseButton) {
            $(event.currentTarget).addClass('ui-draggable-dragging');
        }
    }

    private unhighlightResize(): void {
        this.$('.resize').removeClass('ui-draggable-dragging');
    }

    private renderAnchors(): void {
        ReactDOM.render(
            <AnchorsComponent workspace={this.workspace}
                              anchors={this.model.anchors}/>,
            this.$('svg g.anchors')[0]
        );
    }

    events() {
        return {
            'mousedown .resize': this.highlightResize,
            'mouseup .resize': this.unhighlightResize,
            click: () => this.onClick(),
            mousewheel: event => this.onMousewheel(event),
            contextmenu: event => this.onContextMenu(event)
        }
    }
}