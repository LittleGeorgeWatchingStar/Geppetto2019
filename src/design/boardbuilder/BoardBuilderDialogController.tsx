import {
    BoardBuilderConfig,
    BoardBuilderConfigGateway, getBoardBuilderProfileGateway
} from "./BoardBuilderPathGateway";
import {LibraryController} from "../../module/LibraryController";
import {DesignController} from "../DesignController";
import {DataDependencyFinder} from "./DataDependencyFinder";
import {getModuleGateway} from "../../module/ModuleGateway";
import * as Backbone from "backbone";
import {Module} from "../../module/Module";
import {makeBoardBuilderCategoryFromData} from "./BoardBuilderCategory";
import {BoardBuilderView} from "./BoardBuilderView";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {Dialog} from "../../view/Dialog";
import {DesignRevision} from "../DesignRevision";
import {OPEN_BUILDER} from "../../workspace/events";
import events from "../../utils/events";

export class BoardBuilderDialogController {
    private static instance: BoardBuilderDialogController;

    private boardBuilderDialog: Dialog | null = null;

    private constructor(private configGateway: BoardBuilderConfigGateway) {}

    public static getInstance(): BoardBuilderDialogController {
        if (!this.instance) {
            this.instance = new BoardBuilderDialogController(getBoardBuilderProfileGateway());
        }
        return this.instance;
    }

    public openBoardBuilderDialog(path: string = ''): void {
        events.publish(OPEN_BUILDER);
        const designRev = DesignController.getCurrentDesign();
        const dependencyFinder = new DataDependencyFinder(
            getModuleGateway(),
            designRev
        );

        this.configGateway.getConfigurationForPath(path)
            .then(result => {
                const config = Object.assign({
                    excluded_module_ids: [],
                    categories: []
                }, result);


                this.createBoardBuilderDialog(
                    config,
                    dependencyFinder,
                    designRev);
            });
    }

    private closeBoardBuilder() {
        if (this.boardBuilderDialog) {
            this.boardBuilderDialog.close();
            this.boardBuilderDialog = null;
        }
    }

    private createBoardBuilderDialog(config: BoardBuilderConfig,
                                     dependencyFinder: DataDependencyFinder,
                                     designRev: DesignRevision)  {
        this.closeBoardBuilder();
        const filteredModules = [];
        const categories = {};
        for (const cat of config.categories) {
            categories[cat.name] = makeBoardBuilderCategoryFromData(cat, filteredModules);
        }
        const mountingHoles = [];
        this.boardBuilderDialog = getBoardBuilderDialogContainer();
        ReactDOM.render(<BoardBuilderView categories={categories}
                                          isLoading={true}
                                          mountingHoles={mountingHoles}
                                          dependencyFinder={dependencyFinder}
                                          designRevision={designRev}
                                          onClose={() => this.closeBoardBuilder()}/>,
            this.boardBuilderDialog.el);

        LibraryController.getLibraryAsync().then(library => {
            const modules = library.models;
            const filteredModules = filterExcludedModules(
                config.excluded_module_ids,
                modules
            );
            const categories = {};
            for (const cat of config.categories) {
                categories[cat.name] = makeBoardBuilderCategoryFromData(cat, filteredModules);
            }
            const mountingHoles = modules.filter(m => m.isMountingHole);
            ReactDOM.render(<BoardBuilderView categories={categories}
                                              isLoading={false}
                                              mountingHoles={mountingHoles}
                                              dependencyFinder={dependencyFinder}
                                              designRevision={designRev}
                                              onClose={() => this.closeBoardBuilder()}/>,
                this.boardBuilderDialog.el);
        });
        Backbone.history.navigate(`!/workspace/boardbuilder`);
    }

}

function filterExcludedModules(excludedIds: string[] = [], modules: Module[]): Module[] {
    const excludedModuleIds = {};
    excludedIds.forEach(id => excludedModuleIds[id.toString()] = true);
    return modules.filter(m => !excludedModuleIds[m.id.toString()]);
}

function getBoardBuilderDialogContainer(): Dialog {
    const dialog = new Dialog({
        title: ('Board Builder (Beta)'),
        width: Math.min(1100, $(window).width() * 0.7),
        position: {
            my: 'center',
            // Offset for the suggestions bar:
            at: 'center',
            of: window
        },
        height: $(window).height() * 0.8,
        close: () => Backbone.history.navigate('!/workspace/')
    });
    dialog.$el.addClass('board-builder-dialog');
    return dialog;
}
