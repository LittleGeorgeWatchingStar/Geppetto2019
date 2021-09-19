import * as Backbone from 'backbone';

import {
    BACK_TO_DASHBOARD,
    CAD_COMPILE_COMPLETE,
    CAD_VIEW,
    ESC,
    RESET_FUNCTIONAL_VIEW,
    TOGGLE_MODULE_LIBRARY,
    UPVERTER_VIEW,
    WORKSPACE_CLICK,
    WORKSPACE_DRAG
} from 'workspace/events';

import * as $ from 'jquery';
import {PlacedLogoView} from "../placedlogo/PlacedLogoView";
import {PlacedModuleView} from 'placedmodule/PlacedModuleView';
import eventDispatcher from 'utils/events';
import events from 'utils/events';
import {
    DesignRevision,
    EVENT_ADD_DIMENSION,
    EVENT_ADD_LOGO,
    EVENT_ADD_MODULE,
    EVENT_REMOVE_DIMENSION,
    INIT_PLACED_ITEMS,
    RESET_CONNECTING_MODULES
} from "../design/DesignRevision";
import {PlacedLogo} from "../placedlogo/PlacedLogo";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {REFOCUS} from "../toolbar/events";
import {Workspace} from "./Workspace";
import {HasOutline} from "../placeditem/HasOutline";
import {ACTION_EXECUTED, ACTION_REVERSED, PLACED_MODULE_LOADED, PLACED_MODULE_SELECT} from "../placedmodule/events";
import {
    BOARD_DIMENSIONS_CHANGED,
    CURRENT_DESIGN_SET,
    DESIGN_LOADED,
    DESIGN_OPEN,
    DESIGN_SAVE_COMPLETE,
    DIRTY_STATUS_CHANGED,
    REVISION_LOADED,
    SAVING_STATE_CHANGED
} from "../design/events";
import {Point, Vector2D} from "../utils/geometry";
import {BoardView, BoardViewOptions} from "../view/BoardView";
import * as workspaceTemplate from "templates/workspace";
import {Panel} from "../view/librarypanel/Panel";
import {TabNavigation} from "../view/TabNavigation";
import {Tab} from "../view/DesignsTab";
import {WorkspaceWidgetController} from "../toolbar/WorkspaceWidgets";
import {
    LOGO_AUTO_ADD,
    MODULE_AUTO_ADD,
    MODULE_DOUBLE_CLICK,
    MODULE_INIT_BUSES,
    MODULE_PUT,
    ModuleEvent,
    ModulePlacementEvent,
    REMOVE_MODULE_FINISH
} from "../module/events";
import {KeyMap} from "./KeyMap";
import DialogManager from "../view/DialogManager";
import {actions} from "../core/action";
import {DesignController} from "../design/DesignController";
import {Module} from "../module/Module";
import {LibraryController} from "../module/LibraryController";
import {closeContext, openContext} from "../view/ContextMenu";
import {PlacedItemView} from "../placeditem/view/PlacedItemView";
import {PlacedItem} from "../placeditem/PlacedItem";
import {FitBoard} from "../view/actions";
import {CONNECTION_COMPLETE, ON_OPTIONS_SET, ProvideOptionsSetEvent} from "../connection/events";
import * as ReactDOM from 'react-dom';
import {ProviderOptionsView} from "./ProviderOptionsView";
import * as React from "react";
import {UploadLogoDialog} from "../logo/UploadLogoDialog";
import {ServerID} from "../model/types";
import {AnchorExtensionComponents} from "../dimension/Anchor/AnchorExtension/AnchorExtensionsComponent";
import {DimensionsComponent} from "../dimension/DimensionsComponent";
import {UpverterEditorContainer} from "../upverterviewer/UpverterEditorTab";
import {CompiledCadSourceJobController} from "../compiledcadsource/CompiledCadSourceJobController";
import {CadViewerContainer} from "../cadviewer/CadViewerTab";
import {WorkspaceMultiViewButton} from "./WorkspaceMultiViewButton";
import {FLAG_ITEM_TOGGLE, USER_CHANGED} from "../auth/events";
import {Board} from "../model/Board";
import {UpverterRegistrationController} from "../controller/UpverterRegistrationController";
import {ThreeDBoardView} from "../3dboard/ThreeDBoardView";
import {THREED_VIEW_BOARD} from "../view/events";
import UserController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";


const grid_line_spacing = 5;

type LogoViewMap = { [uuid: string]: PlacedLogoView };
type ModuleViewMap = { [uuid: string]: PlacedModuleView };

export interface WorkspaceViewOptions extends Backbone.ViewOptions<Workspace> {
    panel: Panel;
    renderBetaFeatures: () => boolean;
}

/**
 * Displays the Workspace tab, which contains the workspace toolbar, the grid, the board, and the module panel.
 */
export default class WorkspaceView extends Backbone.View<Workspace> implements Tab {
    public url = TabNavigation.WORKSPACE;

    private logoViews: LogoViewMap = {};
    private moduleViews: ModuleViewMap = {};

    /**
     * boardView is created when a DesignRevision has been loaded.
     * @see onSetDesign
     */
    private boardView: BoardView | undefined;
    private $grid: JQuery;
    private $interactionHelper;
    private panel: Panel;

    private widgetController: WorkspaceWidgetController;

    initialize(options: WorkspaceViewOptions) {
        this.setElement(workspaceTemplate({
            renderBetaFeatures: options.renderBetaFeatures,
        }));
        this.$grid = this.$('.grid');
        this.setupDragHelper();
        this.panel = options.panel;
        this.$el.append(options.panel.$el);
        this.checkConnectionMode();
        this.listenTo(eventDispatcher, MODULE_DOUBLE_CLICK, (event: ModuleEvent) => this.placeModule(event.model));
        this.listenTo(eventDispatcher, MODULE_AUTO_ADD, (event: ModuleEvent) => this.placeModule(event.model));
        this.listenTo(eventDispatcher, LOGO_AUTO_ADD, () => this.placeLogo());
        this.listenTo(eventDispatcher, BOARD_DIMENSIONS_CHANGED, () => this.designRev.updateMechanical());
        this.listenTo(eventDispatcher, PLACED_MODULE_SELECT, () => this.designRev.resetConnectingModules());
        this.listenTo(eventDispatcher, ON_OPTIONS_SET, event => this.onProvideOptionsSet(event));
        this.listenTo(eventDispatcher, CURRENT_DESIGN_SET, () => this.onSetDesign());
        this.listenTo(this.model, 'change:zoom', () => this.updateZoom());
        this.listenTo(this.model, 'change:context_mode', () => this.checkConnectionMode());
        this.listenTo(eventDispatcher, REFOCUS, () => this.refocus());
        this.widgetController = new WorkspaceWidgetController(this, options.panel);
        $(window).on('resize', () => this.windowResize());
        this.render();
        $(document).keydown(event => this.hotKeys(event));
        $(document).keyup(event => this.checkKeyup(event));
        this.initAnchorExtensionsComponent();
        this.renderMultiViewButton();

        this.listenTo(eventDispatcher, UPVERTER_VIEW, () => this.renderUpverterComponent());
        this.listenTo(eventDispatcher, CAD_VIEW, () => this.renderCadComponent());
        this.listenTo(eventDispatcher, RESET_FUNCTIONAL_VIEW, event => this.unmountViewComponent(event.type));
        this.listenTo(eventDispatcher, FLAG_ITEM_TOGGLE, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, DESIGN_OPEN, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, DESIGN_SAVE_COMPLETE, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, SAVING_STATE_CHANGED, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, DIRTY_STATUS_CHANGED, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, REMOVE_MODULE_FINISH, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, CAD_COMPILE_COMPLETE, () => this.renderMultiViewButton());
        this.listenTo(eventDispatcher, TOGGLE_MODULE_LIBRARY, (event) => this.shiftingBoardPosition(event.isOpen));
        this.listenTo(eventDispatcher, BACK_TO_DASHBOARD, () => TabNavigation.openDashboard());
    }

    /**
     * When we load into another tab and then open the workspace, the board will not be in view unless we refocus.
     * The board position is dependent on surrounding nodes being visible.
     */
    public onOpen(): void {
        this.$el.show();
        eventDispatcher.publish(REFOCUS);
        Backbone.history.navigate(`!/${this.url}`);
    }

    public onClose(): void {
        this.$el.hide();
    }

    public get toolbarContainer(): HTMLElement {
        return this.el.querySelector('.toolbar-container');
    }

    public get toolPanelContainer(): HTMLElement {
        return this.el.querySelector('.tool-panel');
    }

    public get workingAreaToolbarContainer(): HTMLElement {
        return this.el.querySelector('.working-area-toolbar-container');
    }

    public get hotkeyMessageContainer(): HTMLElement {
        return this.el.querySelector('#hotkey-message');
    }

    public get currentBoard(): Board {
        return this.designRev.board;
    }

    private onProvideOptionsSet(event: ProvideOptionsSetEvent): void {
        this.$el.addClass('connecting-require-js');
        const pmViews = event.placedModuleIds.map(id => this.moduleViews[id]);
        ReactDOM.render(
            <ProviderOptionsView tooManyOptions={event.hasTooManyOptions}
                                 requireName={event.requireName}
                                 placedModuleViews={pmViews}/>,
            this.el.querySelector('.provider-options-container')
        );
    }

    private onEndConnection(): void {
        ReactDOM.unmountComponentAtNode(this.el.querySelector('.provider-options-container'));
        this.$el.removeClass('connecting-require-js');
    }

    remove() {
        if (this.panel) {
            this.panel.remove();
        }
        this.widgetController.remove();
        return super.remove();
    }

    private hotKeys(e): void {
        if (this.isHotkeyBlocked(e)) {
            return;
        }
        const map = new KeyMap(e);
        if (map.isEscape) {
            events.publish(ESC);
            this.panel.cancelFilter();
        } else if (map.isUndo) {
            actions.undo();
            e.preventDefault();
        } else if (map.isRedo) {
            actions.redo();
        } else if (map.isSave) {
            DesignController.save();
            e.preventDefault();
        } else if (map.isShiftKey) {
            this.toggleRequireMenus(false);
        } else {
            this.checkControlSelectedItem(e);
        }
    }

    private isHotkeyBlocked(e): boolean {
        // TODO programmatically triggered hotkeys in tests don't always have a target tagName.
        const targetTagName = e.target.tagName ? e.target.tagName.toUpperCase() : null;
        return this.$el.css('display') === 'none' ||
            DialogManager.hasOpenDialog() ||
            targetTagName === 'INPUT' || targetTagName === 'TEXTAREA';
    }

    private checkControlSelectedItem(event): void {
        const serialize = obj => Object.keys(obj).map(k => obj[k]);
        const placedItemViews = serialize(this.logoViews).concat(serialize(this.moduleViews));
        const selected = placedItemViews.find(i => i.isSelected);
        if (selected) {
            selected.onHotkey(event);
        }
    }

    private checkKeyup(event): void {
        const map = new KeyMap(event);
        if (map.isShiftKey) {
            this.toggleRequireMenus(true);
        }
    }

    private toggleRequireMenus(isVisible: boolean): void {
        this.$el.toggleClass('suppress-requires-js', !isVisible);
    }

    private setupDragHelper(): void {
        this.$interactionHelper = this.$('.interaction-helper');
        this.$interactionHelper.css('position', 'fixed');
        // Unlike the grid and design items, this node is the full size of the workspace and
        // never changes position or dimensions. This is so that the user can always interact with it.
        const refreshHelperNode = () => {
            this.$interactionHelper.css({
                width: '100%',
                height: '100%',
                left: '0',
                top: '0',
                bottom: '0',
                right: '0'
            });
        };
        refreshHelperNode();
        this.$interactionHelper.draggable({
            scroll: false,
            start: (event, ui) => this.startDrag(event, ui),
            drag: (event, ui) => this.drag(event, ui),
            stop: refreshHelperNode
        });
    }

    private updateZoom(): void {
        this.render();
        this.boardView.render();
        this.setGridToBoardOrigin();
    }

    /**
     * Recentre the board and reset the zoom.
     */
    private refocus(): void {
        if (!this.boardView) {
            return;
        }
        this.model.resetZoom();

        const boardView = this.boardView.$el;
        boardView.position({
            my: 'center-' + this.panel.width / 2 + ' center',
            at: 'center',
            of: window
        });
        this.setGridToBoardOrigin();
    }

    /**
     * Location of board origin in relation to the window
     */
    private getBoardOrigin(): Vector2D {
        try {
            const workspace = this.model;
            const scale = workspace.scale;
            const board = this.designRev.board;
            const $board = this.boardView.$el;

            const boardRect = $board[0].getBoundingClientRect();

            const x = boardRect.left - board.position.x * scale;
            const y = boardRect.top + boardRect.height + board.position.y * scale;

            return {x: x, y: y};
        } catch (error) {
            return {x: 0, y: 0};
        }
    }

    /**
     * Sets the grid so it aligns with board origin
     */
    private setGridToBoardOrigin(): void {
        const boardOrigin = this.getBoardOrigin();
        const viewToWindowScale = 3;
        const workSpaceX = $(window).width() * (viewToWindowScale - 1) / 2;
        const workSpaceY = $(window).height() * (viewToWindowScale - 1) / 2;

        const dx = workSpaceX + boardOrigin.x;
        const dy = workSpaceY + boardOrigin.y;

        this.$grid.css({
            'background-position': `top ${dy}px left ${dx}px`
        });
    }

    private windowDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    private windowResize(): void {
        const dx = (window.innerWidth - this.windowDimensions.width) / 2;
        const dy = (window.innerHeight - this.windowDimensions.height) / 2;
        this.windowDimensions = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        this.moveWorkspaceItems({x: dx, y: dy});
        this.widgetController.onWindowResize();
    }

    private shiftingBoardPosition(isLibraryOpen: boolean): void {
        /**
         * The default width of the module library is based on screen width
         * If the screen width is >1300, module libaray width is around 400
         * Hiding the module libaray will shift the postion of board by moduleLibraryWidth/2 = 200 when screenWidth > 1300
         */
        const offsetX = window.innerWidth < 1300 ? 100 : 200;
        if (isLibraryOpen === true) {
            this.moveWorkspaceItems({x: -offsetX, y: 0});
        } else {
            this.moveWorkspaceItems({x: offsetX, y: 0});
        }
    }

    private moveWorkspaceItems(offset: Vector2D) {
        this.$workspaceContainer.move({
            left: offset.x,
            top: offset.y
        });
        this.setGridToBoardOrigin();
    }

    private checkConnectionMode(): void {
        this.$el.toggleClass('connections-mode-js', this.model.isConnecting());
    }

    private placeModule(module: Module, position?: Point): void {
        events.publishEvent(MODULE_PUT, {
            designRevision: this.designRev,
            model: module,
            position: position
        } as ModulePlacementEvent);
    }

    private placeLogo(position?: Point): void {
        DialogManager.create(UploadLogoDialog, {
            designRev: this.designRev,
            modulePosition: position || this.designRev.board.centroid
        });
    }

    private onSetDesign(): void {
        this.onEndConnection();
        this.renderMultiViewButton();
        this.initThreeDBoard();

        this.listenTo(this.designRev, INIT_PLACED_ITEMS, () => this.resetDesignView());
        this.listenTo(this.designRev, EVENT_ADD_LOGO, pl => this.createLogoView(pl));
        this.listenTo(this.designRev, EVENT_ADD_MODULE, pm => this.createModuleView(pm));

        this.listenTo(this.designRev, EVENT_ADD_DIMENSION, () => this.renderDimensionsComponent());
        this.listenTo(this.designRev, EVENT_REMOVE_DIMENSION, () => this.renderDimensionsComponent());

        this.listenTo(this.designRev, RESET_CONNECTING_MODULES, () => this.onEndConnection());
    }

    private resetDesignView(): void {
        /**
         * NOTE: We should unmount components that are sub classes of the design
         *  when the design is changed, so that components can refresh sub
         *  classes of the design properly (such as the board).
         */
        this.unmountDimensionsComponent();

        this.resetBoard();
        for (const key in this.moduleViews) {
            this.moduleViews[key].remove();
        }
        for (const key in this.logoViews) {
            this.logoViews[key].remove();
        }
        this.moduleViews = {};
        this.logoViews = {};

        this.refocus();
    }

    private resetBoard(): void {
        if (this.boardView) {
            this.boardView.remove();
        }
        const findModuleByRev = id => LibraryController.getLibrary().findByRevisionId(id); // ):<
        this.boardView = new BoardView({
            model: this.designRev.board,
            workspace: this.model,
            addModuleById: (id: ServerID, position: Point) => this.placeModule(findModuleByRev(id), position),
            addLogo: (position: Point) => this.placeLogo(position),
            findModule: findModuleByRev,
            onClick: () => this.onWorkspaceClick(),
            onMousewheel: event => this.mousewheel(event),
            onContextMenu: event => this.openContextMenu(event)
        } as BoardViewOptions);
        this.$workspaceContainer.append(this.boardView.$el);
        this.refocus();
    }

    private get $workspaceContainer(): JQuery {
        return this.$('.workspace-container');
    }

    private get designRev(): DesignRevision | null {
        return DesignController.getCurrentDesign();
    }

    private openContextMenu(event): void {
        const items = [
            {
                label: 'Fit board to modules',
                callback: () => FitBoard.addToStack(this.designRev),
                selector: 'fit-board'
            },
            {
                label: 'Refocus board',
                callback: () => eventDispatcher.publish(REFOCUS),
                selector: 'refocus'
            }
        ];
        openContext(event, items);
    }

    private onWorkspaceClick() {
        eventDispatcher.publish(WORKSPACE_CLICK);
        this.panel.cancelFilter();
    }

    events() {
        return {
            'mousewheel .interaction-helper': event => this.mousewheel(event),
            mousedown: event => this.mousedown(event),
            'click .interaction-helper': () => this.onWorkspaceClick(),
            'contextmenu .interaction-helper': event => this.openContextMenu(event),
        };
    }

    render() {
        const workspace = this.model;
        const grid_lines = workspace.screenCoordsGrid() * grid_line_spacing;
        const newPlaygroundUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_PLAYGROUND_UI);

        this.$grid.css('background-size', grid_lines + 'px ' + grid_lines + 'px');
        this.$('#scale-value').html((10 / workspace.scale).toFixed(2));
        if(newPlaygroundUI) this.$('.tabview-header').addClass('tabview-header-new-ui');
        return this;
    }

    private createLogoView(pl: PlacedLogo): void {
        const plView = new PlacedLogoView({
            model: pl,
            workspace: this.model,
            onMousewheel: event => this.mousewheel(event)
        });

        this.listenTo(pl, 'resize', () => this.zOrderPlacedItems());

        this.logoViews[pl.uuid] = plView;
        this.addItemView(plView);

        this.listenTo(pl, 'remove', () => {
            delete this.logoViews[pl.uuid];
        });
    }

    private createModuleView(pm: PlacedModule): void {
        const pmView = new PlacedModuleView({
            model: pm,
            workspace: this.model,
            onMousewheel: event => this.mousewheel(event)
        });

        this.moduleViews[pm.uuid] = pmView;
        this.addItemView(pmView);

        this.listenTo(pm, 'remove', () => {
            delete this.moduleViews[pm.uuid];
        });
    }

    private addItemView(view: PlacedItemView<PlacedItem>): void {
        this.$workspaceContainer.append(view.el);
        view.render();
        this.zOrderPlacedItems();
    }

    private mousewheel(event: JQueryMousewheel.JQueryMousewheelEventObject) {
        // Prevent the page from scrolling (Mostly for Geppetto in an iframe).
        event.preventDefault();
        event.stopPropagation();

        if (event.ctrlKey) {
            /**
             * Pinch zoom gets registered as a control scroll wheel in chrome.
             * So we just do nothing for that case.
             */
            return;
        }
        const workspace = this.model;
        const zoom = workspace.getZoom();
        const change = event.deltaY * Workspace.ZOOM_FACTOR;
        const next = parseFloat((zoom + change).toFixed(1));
        const x = event.pageX;
        const y = event.pageY;
        const $board = this.boardView.$el;
        const board_start = $board.offset();
        const board_final = Workspace.boardOffsetSnap({
            left: x - (x - board_start.left) * next / zoom,
            top: y - (y - board_start.top) * next / zoom
        });

        if (workspace.checkZoom(next)) {
            $board.offset(board_final);
            workspace.setZoom(next);
            closeContext();
        }
    }

    /**
     * Allow users to move around the workspace by clicking and holding mousewheel.
     */
    private mousedown(event: JQuery.Event<HTMLElement>): void {
        const isMousewheel = event.which === 2;
        if (isMousewheel) {
            event.which = 1;
            this.$interactionHelper.trigger(event);
        }
    }

    dragPosition = {
        x: 0,
        y: 0
    };

    private startDrag(event, ui): void {
        eventDispatcher.publish(WORKSPACE_DRAG);
        this.dragPosition = {
            x: ui.position.left,
            y: ui.position.top
        };
    }

    private drag(event, ui): void {
        const dx = ui.position.left - this.dragPosition.x;
        const dy = ui.position.top - this.dragPosition.y;

        this.dragPosition = {
            x: ui.position.left,
            y: ui.position.top
        };

        this.moveWorkspaceItems({x: dx, y: dy});
    }

    /**
     * Look through all the placed modules and logos, and sort them by their areas.
     * We then assign a unique z-index to each one, with the largest module
     * getting a z-index of 0, increasing by 1 to the smallest module.
     */
    private zOrderPlacedItems(): void {
        const placedModules = this.designRev.getPlacedModules();
        const placedLogos = this.designRev.getPlacedLogos();
        const placedItems = (placedModules as HasOutline[]).concat(placedLogos);

        placedItems.sort(
            (a, b) => b.outlineArea - a.outlineArea);
        for (const index in placedItems) {
            const outlineable = placedItems[index];
            const outlineableView = this.getPlacedItemView(outlineable);
            outlineableView.zIndex = index;
        }
    }

    private getPlacedItemView(pi: HasOutline): PlacedModuleView | PlacedLogoView {
        const uuid = pi.uuid;
        return this.moduleViews[uuid] || this.logoViews[uuid];
    }

    private renderDimensionsComponent(): void {
        ReactDOM.render(
            <DimensionsComponent workspace={this.model}
                                 board={this.designRev.board}
                                 dimensions={this.designRev.dimensions}/>,
            this.el.querySelector('#design .dimensions')
        );
    }

    private unmountDimensionsComponent(): void {
        ReactDOM.unmountComponentAtNode(this.el.querySelector('#design .dimensions'));
    }

    private initAnchorExtensionsComponent(): void {
        ReactDOM.render(
            <AnchorExtensionComponents workspace={this.model}/>,
            this.el.querySelector('#design .anchor-extensions')
        );
    }

    private initThreeDBoard(): void {
        let displayThreeDBoard = false;
        const toggleThreeD = () => {
            displayThreeDBoard = !displayThreeDBoard;
            render();
        }

        let offset = [];

        const render = () => {
            if (this.boardView) {
                if (offset.length == 0) {
                    offset = [this.boardView.$el.offset().left, this.boardView.$el.offset().top];
                } else {
                    offset = [this.boardView.$el.position().left, this.boardView.$el.position().top];
                }
            }

            if (displayThreeDBoard) {
                if (offset.length > 0) {
                    return ReactDOM.render(<ThreeDBoardView workspace={this.model}
                                                            modules={this.designRev.getPlacedModules()}
                                                            board={this.designRev.board}
                                                            boardOffset={offset}/>, this.el.querySelector('#design .threed-board'));
                }
                return ReactDOM.render(<ThreeDBoardView workspace={this.model}
                                                        modules={this.designRev.getPlacedModules()}
                                                        board={this.designRev.board}/>, this.el.querySelector('#design .threed-board'));
            } else {
                ReactDOM.unmountComponentAtNode(this.el.querySelector('#design .threed-board'));
            }
        }

        this.listenTo(eventDispatcher, DESIGN_LOADED, () => render());
        this.listenTo(eventDispatcher, PLACED_MODULE_LOADED, () => render());
        this.listenTo(eventDispatcher, ACTION_EXECUTED, () => render());
        this.listenTo(eventDispatcher, ACTION_REVERSED, () => render());
        this.listenTo(eventDispatcher, REVISION_LOADED, () => render());
        this.listenTo(eventDispatcher, USER_CHANGED, () => render());
        this.listenTo(eventDispatcher, CONNECTION_COMPLETE, () => render());
        this.listenTo(eventDispatcher, REMOVE_MODULE_FINISH, () => render());
        this.listenTo(eventDispatcher, MODULE_INIT_BUSES, () => render());
        this.listenTo(eventDispatcher, REFOCUS, () => render());
        this.listenTo(eventDispatcher, THREED_VIEW_BOARD, () => toggleThreeD());
        this.listenTo(this.model, 'change:zoom', () => render());
    }

    private renderMultiViewButton(): void {
        const job = CompiledCadSourceJobController.getInstance().job;
        ReactDOM.render(<WorkspaceMultiViewButton
                currentDesign={this.designRev}
                compiledCadJob={job}/>,
            this.el.querySelector('#multi-view-buttons'));
    }

    private renderUpverterComponent(): void {
        $.getJSON('/api/v3/upverter/current-user/', auth => {
            if (auth.prompt_access_request === true) {
                UpverterRegistrationController.getInstance().register(() => {
                    this.$('#upverter-container').show();
                    ReactDOM.render(
                        <UpverterEditorContainer designRevisionId={this.designRev ? this.designRev.id : ''}/>,
                        this.el.querySelector('#upverter-container')
                    );
                });
            } else {
                this.$('#upverter-container').show();
                ReactDOM.render(
                    <UpverterEditorContainer designRevisionId={this.designRev ? this.designRev.id : ''}/>,
                    this.el.querySelector('#upverter-container')
                );
            }
        });
    }

    private renderCadComponent(): void {
        this.$('#cad-viewer-container').show();
        const job = CompiledCadSourceJobController.getInstance().job;

        ReactDOM.render(
            <CadViewerContainer designRev={this.designRev}
                                compiledCadJob={job}/>,
            this.el.querySelector('#cad-viewer-container')
        );
    }

    private unmountViewComponent(type: string): void {
        if (type === 'upverter') {
            this.$('#upverter-container').hide();
            ReactDOM.unmountComponentAtNode(this.el.querySelector('#upverter-container'));
        } else {
            this.$('#cad-viewer-container').hide();
            ReactDOM.unmountComponentAtNode(this.el.querySelector('#cad-viewer-container'));
        }
    }
}
