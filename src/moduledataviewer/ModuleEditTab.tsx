import {Tab} from "../view/DesignsTab";
import {TabSpec} from "../view/TabNavigation";
import * as ReactDOM from "react-dom";
import {CpuGateway} from "./moduledatadetail/cpu/CpuGateway";
import * as React from "react";
import {LibraryController} from "../module/LibraryController";
import {getExpandedBusTemplateGateway} from "../module/custom/BusTemplateGateway";
import {BusTemplate} from "../module/custom/BusTemplate";
import {ModuleDataEdit} from "./ModuleDataEditor";

export class ModuleEditTab implements Tab {
    public url: string;
    public $el: JQuery;

    constructor(tabSpec: TabSpec) {
        this.url = tabSpec.url;
        this.$el = $("<div class='tabview module-data-viewer'></div>");
    }

    onOpen(id?: number): void {
        LibraryController.getLibraryAsync().then(library=> {
            const modules = library.models;
            const savedForkModules = modules
                .filter(module => !module.sku);

            const busTemplateGateway = getExpandedBusTemplateGateway();

            busTemplateGateway.getBusTemplates()
                .then((busTemplates: BusTemplate[]) => {
                    ReactDOM.render(
                        <ModuleDataEdit initialSelectedFork={id ? savedForkModules.filter(m => m.revisionId == id)[0] : null}
                                        savedForkModules={savedForkModules}
                                        availableBusTemplates={busTemplates}
                                        cpuGateway={new CpuGateway()}/>,
                        this.$el[0]);
                    this.$el.show();
                });
        });
    }

    onClose(): void {
        this.$el.hide();
        ReactDOM.unmountComponentAtNode(this.$el[0]);
    }
}
