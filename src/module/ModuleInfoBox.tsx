import * as Backbone from "backbone";
import "jquery";
import "lib/jquery-ui";
import eventDispatcher from "utils/events";
import markdown from "utils/markdown";
import {PLACED_MODULE_CLICK, PLACED_MODULE_DRAG} from "../placedmodule/events";
import {
    MODULE_AUTO_ADD,
    MODULE_INFO,
    MODULE_PUT,
    MODULE_TILE_CLICK,
    MODULE_TILE_DRAG_START,
    ModuleEvent,
    ModuleRequestEvent,
    OPEN_MODULE_SCHEMATIC,
    PLACED_MODULE_INFO,
    PSEUDO_MODULE_TILE_CLICK,
    REMOVE_MODULE_FINISH
} from "./events";
import {BOARD_RESIZE, DESIGN_LOADED} from "../design/events";
import {SELECT_REQUIRE} from "../bus/events";
import {ESC, WORKSPACE_CLICK, WORKSPACE_DRAG} from "../workspace/events";
import {PLACED_LOGO_CLICK, PLACED_LOGO_DRAG} from "../placedlogo/events";
import UserController from "../auth/UserController";
import {ServerID} from "../model/types";
import {Workspace} from "../workspace/Workspace";
import * as React from "react";
import {openModuleDataViewById} from "../moduledataviewer/openModuleDataView";
import {FeatureFlag} from "../auth/FeatureFlag";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Module} from "./Module";
import {PromotionController} from "../promotions/PromotionController";
import {Subscription} from "rxjs";
import ReactDOM = require("react-dom");

/**
 * Renders the module info box that appears when you click on a module in a DesignPreviewTab.
 */
export class ModuleInfoBox extends Backbone.View<any> {
    private subscriptions: Subscription[];

    private module: Module;

    initialize(module: Module) {
        this.subscriptions = [];

        this.module = module;

        this.subscriptions.push(PromotionController.getInstance().subscribe(
            () => this.render())
        );

        return this.render();
    }

    render(): this {
        ReactDOM.render(this.getView(), this.el);
        return this;
    }

    remove() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];

        ReactDOM.unmountComponentAtNode(this.el);
        return super.remove();
    }

    private getView(): JSX.Element | null {
        return (
            <div className="module-info-container">
                {getInnerModuleInfoView({
                    name: this.module.name,
                    imageUrl: this.module.thumbnailUrl,
                    description: this.module.description,
                    price: this.module.getFormattedPrice(),
                    revisionNo: this.module.revisionNo,
                    promotionMessage: () => {
                        return PromotionController.getInstance().getModuleInfoMessage(this.module);
                    },
                    isForkedModule: !this.module.sku,
                }, () => this.$el.hide())}
            </div>
        );
    }
}


/**
 * Implementation to display basic information about a module, placed module, or pseudo-module.
 */
export interface ModuleInfo {
    name: string;
    description: string;
    imageUrl?: string;
    price?: string;
    revisionId?: ServerID;
    revisionNo?: number;
    onAdd?: () => void;
    promotionMessage?: () => string | null;
    isForkedModule?: boolean;
}


/**
 * The ModuleInfoBox on the workspace, containing events that are relevant to only it.
 * Contrast to ModuleInfoBox on DesignPreviewTab, which never renders information about a PlacedModule.
 */
export class WorkspaceModuleInfoBox extends Backbone.View<any> {
    private subscriptions: Subscription[] = [];

    private selected: ModuleInfo | null;

    /**
     * @param anchorNode: The element to position this box next to. Currently the workspace panel.
     * @param workspace: To determine whether this widget is on or not.
     */
    constructor(private readonly anchorNode: HTMLElement,
                private readonly workspace: Workspace) {
        super();
        this.listenTo(eventDispatcher, MODULE_TILE_CLICK,
            module => this.onSelectModule(module));
        this.listenTo(eventDispatcher, PSEUDO_MODULE_TILE_CLICK,
            info => this.onSelectPseudoModule(info));
        this.listenTo(eventDispatcher, MODULE_INFO,
            module => this.onSelectModule(module));
        this.listenTo(eventDispatcher, PLACED_MODULE_INFO,
            pm => this.onSelectPlacedModule(pm));
        this.listenTo(eventDispatcher, PLACED_MODULE_CLICK, () => this.unselect());
        this.listenTo(eventDispatcher, PLACED_LOGO_CLICK, () => this.unselect());
        this.listenTo(eventDispatcher, REMOVE_MODULE_FINISH, () => this.unselect());
        this.listenTo(eventDispatcher, PLACED_MODULE_DRAG, () => this.unselect());
        this.listenTo(eventDispatcher, PLACED_LOGO_DRAG, () => this.unselect());
        this.listenTo(eventDispatcher, BOARD_RESIZE, () => this.unselect());
        this.listenTo(eventDispatcher, ESC, () => this.unselect());
        this.listenTo(eventDispatcher, WORKSPACE_CLICK, () => this.unselect());
        this.listenTo(eventDispatcher, WORKSPACE_DRAG, () => this.unselect());
        this.listenTo(eventDispatcher, SELECT_REQUIRE, () => this.unselect());
        this.listenTo(eventDispatcher, DESIGN_LOADED, () => this.unselect());
        this.listenTo(eventDispatcher, MODULE_PUT, () => this.unselect());
        this.listenTo(eventDispatcher, MODULE_TILE_DRAG_START, () => this.unselect());

        this.subscriptions.push(PromotionController.getInstance().subscribe(
            () => this.render())
        );
    }

    render(): this {
        ReactDOM.render(this.getView(), this.el, () => this.reposition());
        return this;
    }

    remove() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];

        ReactDOM.unmountComponentAtNode(this.el);
        return super.remove();
    }

    unselect(): void {
        this.selected = null;
        this.render();
    }

    private getView(): JSX.Element | null {
        if (!this.selected) {
            return null;
        }
        return (
            <div className="module-info-container">
                {getInnerModuleInfoView(this.selected, () => this.unselect())}
                {this.selected.onAdd &&
                <div className="add-module-container">
                    <button className="add"
                            onClick={() => this.selected.onAdd()}>
                        Add this module
                    </button>
                </div>
                }
            </div>
        );
    }

    onSelectModule(module: Module): void {
        this.selected = this.adaptModuleToInfo(module);
        this.render();
    }

    private onSelectPseudoModule(item: ModuleInfo): void {
        this.selected = item;
        this.render();
    }

    onSelectPlacedModule(pm: PlacedModule): void {
        let name = pm.name;
        if (pm.customName !== pm.name) {
            name = `${pm.customName} (${pm.name})`;
        }
        this.selected = Object.assign(this.adaptModuleToInfo(pm.module),
            {
                name: name,
                onAdd: null // "Add this module" is not available for placed modules.
            });
        this.render();
    }

    private adaptModuleToInfo(module: Module): ModuleInfo {
        return {
            onAdd: () => eventDispatcher.publishEvent(MODULE_AUTO_ADD, {model: module} as ModuleEvent),
            name: module.name,
            description: module.description,
            imageUrl: module.thumbnailUrl,
            price: module.getFormattedPrice(),
            revisionId: module.revisionId,
            revisionNo: module.revisionNo,
            promotionMessage: () => {
                return PromotionController.getInstance().getModuleInfoMessage(module);
            },
            isForkedModule: !module.sku,
        };
    }

    private reposition(): void {
        this.$el.css('position', 'absolute');
        this.$el.position({
            my: 'right-10 top', // Buffer for the panel's absolutely positioned handle
            at: 'left top',
            of: $(this.anchorNode)
        });
    }

}

function openSchematic(revId: ServerID): void {
    eventDispatcher.publishEvent(OPEN_MODULE_SCHEMATIC, {
        id: revId
    } as ModuleRequestEvent);
}

function getInnerModuleInfoView(moduleInfo: ModuleInfo, onClose: () => void): JSX.Element {
    const isEngineer = UserController.getUser().isEngineer();
    const hasModuleEditPrivileges = UserController
        .getUser()
        .isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT);
    const description = $('<div>' + markdown(moduleInfo.description) + '</div>');
    const image = () => {
        if (moduleInfo.imageUrl) {
            return <div><img src={moduleInfo.imageUrl}
                             alt={'Thumbnail of ' + moduleInfo.name}/></div>;
        }
        const $img = description.find('img');
        if ($img.length > 0) {
            const imgHtml = $img[0].outerHTML;
            $img.remove();
            return <div dangerouslySetInnerHTML={{__html: imgHtml}}/>;
        }
        return null;
    };

    const promotionMessage = moduleInfo.promotionMessage ? moduleInfo.promotionMessage() : null;

    const editModuleEnable = UserController.getUser().isLoggedIn() && UserController.getUser().isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT);

    return (
        <div className="module-info" tabIndex={0}>
            <div className="module-info-header">
                <p className="title">{moduleInfo.name}</p>
                <button type="button"
                        className="close-btn"
                        onClick={onClose}/>
            </div>
            <div className="module-info-content">
                {image()}
                <div className="price">{moduleInfo.price}</div>
                <div className="description"
                     dangerouslySetInnerHTML={{__html: description[0].innerHTML}}/>
                {isEngineer && moduleInfo.revisionId &&
                <p className="schematic-btn-container">
                    <button className="schematic cta"
                            onClick={() => openSchematic(moduleInfo.revisionId)}>
                        Preview Schematic
                    </button>
                </p>
                }
                {hasModuleEditPrivileges || isEngineer && moduleInfo.revisionId &&
                <p className="schematic-btn-container">
                    <button type="button"
                            className="module-data-btn"
                            onClick={() => openModuleDataViewById(moduleInfo.revisionId, moduleInfo.isForkedModule)}>
                        Open Module
                    </button>
                </p>
                }
                {isEngineer && moduleInfo.revisionNo &&
                <p className="version">Version: {moduleInfo.revisionNo}</p>
                }
                {promotionMessage &&
                <div className="promotion">
                    <div className="alert alert-success"
                         dangerouslySetInnerHTML={{__html: promotionMessage}}/>
                </div>
                }
                {editModuleEnable &&
                <div className="edit-module">
                    <button
                        onClick={() => openModuleDataViewById(moduleInfo.revisionId, moduleInfo.isForkedModule)}>Open
                        Module Data
                    </button>
                    {moduleInfo.isForkedModule &&
                    <button
                        onClick={() => Backbone.history.navigate(`!/module-edit/${moduleInfo.revisionId}`, true)}>Edit
                        Module Data</button>
                    }
                    {!moduleInfo.isForkedModule &&
                    <button onClick={() => openModuleDataViewById(moduleInfo.revisionId, false, true)}>Customize
                        Module</button>
                    }
                </div>
                }
            </div>
        </div>
    );
}
