import {
    CUSTOMER_MODULE_SAVED,
    MODULE_PUT,
    ModulePlacementEvent
} from "module/events";
import {
    BLOCK_ROTATE,
    CUSTOM_NAME_INPUT,
    PLACED_MODULE_REMOVE,
    PlacedModuleEvent
} from "placedmodule/events";
import events from "utils/events";
import {actions} from "../core/action";
import {ServerID} from "../model/types";
import {NameModuleDialog} from "../placedmodule/NameModuleDialog";
import DialogManager from "../view/DialogManager";
import {
    AddModule,
    AutoPlaceModule,
    FinishReplaceModule,
    PowerBoard,
    RemoveModule,
} from "./actions";
import {Module} from "./Module";
import {getModuleGateway} from "./ModuleGateway";
import {PlacedModuleResource} from "../placedmodule/api";
import {
    BUILD_BOARD,
    BuildBoardEvent,
    POWER_BOARD,
    PowerBoardEvent
} from "../workspace/events";
import {LibraryController} from "./LibraryController";
import {BLOCK_MOVE, MoveEvent} from "../placeditem/events";
import {MoveBlock, RotateBlock} from "../placeditem/actions";
import {BuildBoard} from "../design/boardbuilder/action";
import {Vector2D} from "../utils/geometry";
import UserController from "../auth/UserController";
import {Dialog} from "../view/Dialog";
import {createCustomModuleDialog} from "./custom/view/CustomModuleDialog";
import {DesignRevision} from "../design/DesignRevision";

function loadDetailedModule(module: Module): Promise<Module> {
    const moduleGateway = getModuleGateway();
    return module.loadDetails(moduleGateway)
}

/**
 * Used to set the details for modules in the library and returns the module
 * instance from the library.
 */
function setLibraryModuleAttributes(modules: Module[]): Module[] {
    modules.forEach((module, index) => {
        const library = LibraryController.getLibrary();
        const libraryModule = library.findWhere({revision_id: module.getRevisionId()});
        if (libraryModule) {
            libraryModule.set(module.attributes);
            modules[index] = libraryModule;
        }
    });
    return modules;
}

function getAvailableRevision(pmResource: PlacedModuleResource): Module | null {
    const devModule = getDevModule(pmResource.module_id);
    const stableModule = getStableModule(pmResource.module_id);
    if (stableModule && stableModule.getRevisionNo() >= pmResource.revision_no) {
        return stableModule;
    } else if (devModule && devModule.getRevisionNo() >= pmResource.revision_no) {
        return devModule;
    }
    return null;
}

function getStableModule(moduleId: ServerID): Module {
    return LibraryController.getLibrary().findWhere({module_id: moduleId, stable: true});
}

function getDevModule(moduleId: ServerID): Module {
    return LibraryController.getLibrary().findWhere({module_id: moduleId, dev: true});
}

function inputCustomName(event: PlacedModuleEvent) {
    DialogManager.create(NameModuleDialog, {
        model: event.model,
        custom_name: event.model.customName
    });
}

/**
 * Handle a module after it has been 'put' on the board (by drag or otherwise).
 * This does not necessarily create an action because of customizable template modules.
 */
function onModulePut(event: ModulePlacementEvent): void {
    const module = event.model;
    if (module && module.isTemplateModule()) {
        openCustomModuleDialog(module, event.designRevision, event.position);
    } else {
        placeModule(module, event.designRevision, event.position);
    }
}

function onCustomerModuleSaved(event: ModulePlacementEvent): void {
    const module = event.model;
    placeModule(module, event.designRevision, event.position);
}

function placeModule(module: Module,
                     designRevision: DesignRevision,
                     position: Vector2D | undefined): void {
    if (!position) {
        autoPlaceModule(module, designRevision);
        return;
    }
    const isSubstituting = designRevision.moduleToReplace;
    if (isSubstituting) {
        FinishReplaceModule.addToStack(module, designRevision, position);
    } else {
        AddModule.addToStack(module, designRevision, position);
    }
}

function autoPlaceModule(module: Module, designRev: DesignRevision): void {
    const moduleToSub = designRev.moduleToReplace;
    if (!moduleToSub) {
        AutoPlaceModule.addToStack(module, designRev);
    } else {
        FinishReplaceModule.addToStack(module, designRev, moduleToSub.position);
    }
}

/**
 * Render the custom module dialog for template modules once the template
 * module has been fully loaded.
 */
function openCustomModuleDialog(module: Module,
                                designRev: DesignRevision,
                                position: Vector2D): void {
    if (UserController.getUser().isLoggedIn()) {
        createCustomModuleDialog(module, designRev, position);
    } else {
        DialogManager.create(Dialog, {
            title: 'Login required',
            html: '<p>Creating and saving a custom module requires an account. Please log in first.</p>',
        }).alert();
    }
}

actions.subscribe(BLOCK_ROTATE,
    (event: PlacedModuleEvent) => RotateBlock.fromEvent(event));
actions.subscribe(BLOCK_MOVE,
    (event: MoveEvent) => MoveBlock.fromEvent(event));
actions.subscribe(PLACED_MODULE_REMOVE,
    (event: PlacedModuleEvent) => RemoveModule.fromEvent(event));
actions.subscribe(BUILD_BOARD,
    (event: BuildBoardEvent) => BuildBoard.fromEvent(event));
actions.subscribe(POWER_BOARD,
    (event: PowerBoardEvent) => PowerBoard.fromEvent(event));
events.subscribe(CUSTOM_NAME_INPUT, inputCustomName);
events.subscribe(MODULE_PUT, onModulePut);
events.subscribe(CUSTOMER_MODULE_SAVED, onCustomerModuleSaved);

export default {
    getAvailableRevision: getAvailableRevision,
    loadDetailedModule: loadDetailedModule,
    setLibraryModuleAttributes: setLibraryModuleAttributes
}
