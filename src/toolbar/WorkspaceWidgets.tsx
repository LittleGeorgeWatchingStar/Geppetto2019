import HelpDialog from "../help/HelpDialog";
import {WorkspaceModuleInfoBox} from "../module/ModuleInfoBox";
import {HELP, POWER_FINDER} from "./events";
import {getModuleGateway} from "../module/ModuleGateway";
import {PowerFinder} from "../design/boardbuilder/PowerFinder";
import {PowerFinderDialog, PowerFinderOptions} from "../design/boardbuilder/PowerFinderDialog";
import WorkspaceView from "../workspace/WorkspaceView";
import {DesignController} from "../design/DesignController";
import {getWorkspaceToolbuttons} from "./toolbutton/WorkspaceToolbuttons";
import {USER_CHANGED, USER_SELECTED_PARTNER_THEME} from "../auth/events";
import {ACTION_EXECUTED, ACTION_REVERSED, BLOCK_ON_DRAG_ROTATE, PLACED_MODULE_LOADED} from "../placedmodule/events";
import {
    DESIGN_LOADED,
    DESIGN_PUSH_COMPLETE,
    DESIGN_UPREV_COMPLETE,
    DIRTY_STATUS_CHANGED,
    REVISION_LOADED,
    SAVING_STATE_CHANGED
} from "../design/events";
import {Toolbar} from "./Toolbar";
import * as ReactDOM from "react-dom";
import eventDispatcher from "../utils/events";
import * as React from "react";
import * as Backbone from "backbone";
import {Workspace} from "../workspace/Workspace";
import {LibraryController} from "../module/LibraryController";
import {PriceView} from "../view/Price";
import {DesignHelper} from "../design/helper/DesignHelper";
import {ActionLog} from "../workspace/ActionLog";
import {getAllActionLogs} from "../core/action";
import UserController from "../auth/UserController";
import {Panel} from "../view/librarypanel/Panel";
import {DisconnectionWidget} from "../view/DisconnectionWidget";
import {PROVIDE_ERROR, ProvideErrorEvent} from "../bus/events";
import {getModuleRecommendations,} from "../design/helper/DesignRecommendationsGateway";
import {ACTION_HISTORY, DESIGN_HELPER} from "../view/events";
import {WorkingAreaToolbar} from "./workingarea/WorkingAreaToolbar";
import {getWorkingAreaToolbuttons} from "./workingarea/WorkingAreaToolbuttons";
import {MODULE_LIBRARY_LOADED, TOGGLE_MODULE_LIBRARY} from "../workspace/events";
import {ModuleList} from "../design/helper/ModuleList";
import {PowerTree} from "../design/helper/PowerTree";
import {CONNECTION_COMPLETE} from "../connection/events";
import {MODULE_INIT_BUSES, REMOVE_MODULE_FINISH} from "../module/events";
import {WorkspaceMode} from "../design/helper/WorkspaceMode";
import {FeatureFlag} from "../auth/FeatureFlag";
import {ThemeController} from "../controller/ThemeController";


/**
 * Workspace dialogs/info-box widgets, some of which are controlled by the toolbar.
 * TODO this view bridges old Backbone behaviour to the React toolbar. Convert to React nodes.
 */
export class WorkspaceWidgetController extends Backbone.View<Workspace> {
    private moduleInfoBox: WorkspaceModuleInfoBox;
    private helpDialog: HelpDialog | undefined;
    private disconnectWidget: DisconnectionWidget | null;

    constructor(private readonly workspaceView: WorkspaceView,
                panel: Panel) {
        super();
        this.listenTo(eventDispatcher, POWER_FINDER, powerFinderDialog);
        this.listenTo(eventDispatcher, HELP, (selection) => this.openHelpDialog(selection.selection));
        this.listenTo(eventDispatcher, PROVIDE_ERROR, this.openDisconnectWidget);
        this.moduleInfoBox = new WorkspaceModuleInfoBox(panel.el, this.workspaceView.model);
        this.workspaceView.$el.append(this.moduleInfoBox.$el);
        this.initToolbar();
        this.initToolPanel();
        this.initWorkingAreaToolbar();
        this.initHotkeyMessage();
    }

    public onWindowResize(): void {
        if (this.moduleInfoBox) {
            this.moduleInfoBox.unselect();
        }
    }

    private openDisconnectWidget(event: ProvideErrorEvent): void {
        if (this.disconnectWidget) {
            this.disconnectWidget.remove();
        }
        this.disconnectWidget = new DisconnectionWidget(event.options);
        this.disconnectWidget.setPosition(event.target);
        this.workspaceView.$el.append(this.disconnectWidget.$el);
    }

    private initToolbar(): void {
        const model = this.workspaceView.model;
        const events = [
            USER_CHANGED,
            DIRTY_STATUS_CHANGED,
            DESIGN_LOADED,
            SAVING_STATE_CHANGED,
            DESIGN_UPREV_COMPLETE,
            DESIGN_PUSH_COMPLETE,
            MODULE_LIBRARY_LOADED,
            USER_SELECTED_PARTNER_THEME,
        ];
        const toolbarContainer = this.workspaceView.toolbarContainer;
        const renderToolbar = () => {
            const toolbar = <Toolbar toolbuttonGroups={getWorkspaceToolbuttons(model)}/>;
            ReactDOM.render(toolbar, toolbarContainer);
        };
        for (const event of events) {
            this.listenTo(eventDispatcher, event, renderToolbar);
        }
        this.listenTo(model, 'change:context_mode', renderToolbar);
        this.listenTo(model, 'change:price_active', renderToolbar);
        this.listenTo(model, 'change:power_active', renderToolbar);
        this.listenTo(model, 'change:module_info_active', renderToolbar);
        renderToolbar();
    }

    private openHelpDialog(selection: string): void {
        if (!this.helpDialog) {
            this.helpDialog = new HelpDialog({el: '#dialog-help'});
        }
        this.helpDialog.open(selection);
    }

    private initToolPanel(): void {
        const events = [
            PLACED_MODULE_LOADED,
            DESIGN_LOADED,
            ACTION_EXECUTED,
            ACTION_REVERSED,
            REVISION_LOADED,
            USER_CHANGED,
            CONNECTION_COMPLETE,
            REMOVE_MODULE_FINISH,
            MODULE_INIT_BUSES,
            USER_SELECTED_PARTNER_THEME,
        ];
        const user = UserController.getUser();
        let openActionHistory = false;
        const toggleHistory = () => {
            openActionHistory = !openActionHistory;
            render();
        }
        const isNewWorkspaceModeShow = user.isFeatureEnabled(FeatureFlag.WORKSPACE_MODE);
        const render = () => {
            getModuleRecommendations().then(recommendations => {
                ReactDOM.render(
                    <div className="workspace-widget-container">
                        {isNewWorkspaceModeShow &&
                        <WorkspaceMode workspace={this.workspaceView.model}/>}
                        <DesignHelper design={DesignController.getCurrentDesign()}
                                      moduleRecommendations={recommendations}
                                      currentUser={UserController.getUser()}
                                      workspace={this.workspaceView.model}
                                      libraryModules={LibraryController.getLibrary().models}
                                      board={this.workspaceView.currentBoard}/>
                        <ModuleList design={DesignController.getCurrentDesign()}
                                    moduleRecommendations={recommendations}
                                    currentUser={UserController.getUser()}
                                    workspace={this.workspaceView.model}
                                    libraryModules={LibraryController.getLibrary().models}/>
                        <PriceView workspace={this.workspaceView.model}
                                   design={DesignController.getCurrentDesign()}/>
                        <PowerTree workspace={this.workspaceView.model}
                                   rootPowerProviders={DesignController.getCurrentDesign().rootPowerProviders}/>
                        <ActionLog actionLogs={getAllActionLogs().undo} isOpen={openActionHistory}/>
                    </div>,
                    this.workspaceView.toolPanelContainer);
            });
        };
        for (const event of events) {
            this.listenTo(eventDispatcher, event, render);
        }
        this.listenTo(eventDispatcher, DESIGN_HELPER, () => {
            // Super greasy. Helps the user notice the Design Helper when they exit out of the Order dialog.
            $('.design-helper').addClass('fast-blink');
            setTimeout(() => $('.design-helper').removeClass('fast-blink'), 750);
        });
        this.listenTo(this.workspaceView.model, 'change:price_active', render);
        this.listenTo(this.workspaceView.model, 'change:power_active', render);
        this.listenTo(eventDispatcher, ACTION_HISTORY, toggleHistory);
    }

    private initWorkingAreaToolbar(): void {
        const events = [
            PLACED_MODULE_LOADED,
            DESIGN_LOADED,
            ACTION_EXECUTED,
            ACTION_REVERSED,
            REVISION_LOADED,
            USER_CHANGED
        ];
        const model = this.workspaceView.model;
        const workingAreaToolbarContainer = this.workspaceView.workingAreaToolbarContainer;
        let isModuleLibraryOpen = true;
        const toggleModuleLibrary = () => {
            isModuleLibraryOpen = !isModuleLibraryOpen;
            renderWorkingAreaToolbar();
        }
        const renderWorkingAreaToolbar = () => {
            const workingAreaToolbar = <WorkingAreaToolbar
                toolbuttonGroups={getWorkingAreaToolbuttons(model, getAllActionLogs())}
                isModuleLibraryOpen={isModuleLibraryOpen}/>;
            ReactDOM.render(workingAreaToolbar, workingAreaToolbarContainer);
        };
        this.listenTo(model, 'change:zoom', renderWorkingAreaToolbar);
        for (const event of events) {
            this.listenTo(eventDispatcher, event, renderWorkingAreaToolbar);
        }
        this.listenTo(eventDispatcher, TOGGLE_MODULE_LIBRARY, toggleModuleLibrary);
        renderWorkingAreaToolbar();
    }

    private initHotkeyMessage(): void {
        const container = this.workspaceView.hotkeyMessageContainer;
        let isHotkeyMessageShow = false;
        const toggleMessage = () => {
            isHotkeyMessageShow = !isHotkeyMessageShow;
            renderHotkeyMessage();
        }

        const renderHotkeyMessage = () => {
            ReactDOM.render(<div>{isHotkeyMessageShow && <p>Press Spacebar to Rotate</p>}</div>, container);
        }
        this.listenTo(eventDispatcher, BLOCK_ON_DRAG_ROTATE, toggleMessage);
        renderHotkeyMessage();
    }

    public remove() {
        this.moduleInfoBox.remove();
        this.moduleInfoBox = null;
        if (this.helpDialog) {
            this.helpDialog.remove();
        }
        if (this.workspaceView.toolbarContainer) {
            ReactDOM.unmountComponentAtNode(this.workspaceView.toolbarContainer);
        }
        if (this.workspaceView.toolPanelContainer) {
            ReactDOM.unmountComponentAtNode(this.workspaceView.toolPanelContainer);
        }
        return super.remove();
    }
}

export function powerFinderDialog(open3D: boolean): void {
    const library = LibraryController.getLibrary();
    const designRev = DesignController.getCurrentDesign();
    const powerFinder = new PowerFinder(
        designRev,
        getModuleGateway(),
        library
    );
    new PowerFinderDialog({
        designRevision: designRev,
        powerFinder: powerFinder,
        open3D: open3D
    } as PowerFinderOptions);
}
