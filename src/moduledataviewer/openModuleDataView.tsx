import {Dialog} from "../view/Dialog";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {ModuleDataView} from "./ModuleDataViewer";
import {getCadSourceGateway} from "./moduledatadetail/cadsource/CadSourceGateway";
import {forkModule} from "./moduledatadetail/ModuleData";
import {Part} from "./moduledatadetail/part/Part";
import {LibraryController} from "../module/LibraryController";
import {Module} from "../module/Module";
import {ServerID} from "../model/types";
import {getModuleGateway} from "../module/ModuleGateway";
import {CpuGateway} from "./moduledatadetail/cpu/CpuGateway";


let dialog = null;

export function openModuleDataViewById(moduleId: ServerID, isForkedModule: boolean, forkConfirmation?: boolean): void {
    const module = LibraryController.getLibrary().findByRevisionId(moduleId);
    if (module && forkConfirmation) {
        return openModuleDataView(module, isForkedModule, forkConfirmation);
    }
    if (module) {
        return openModuleDataView(module, isForkedModule);
    }
}

export function openModuleDataView(module: Module, isForkedModule: boolean, forkConfirmation?: boolean): void {
    const modules = LibraryController.getLibrary().models;
    const savedForkModules = modules
        .filter(module => !module.sku);

    const moduleGateway = getModuleGateway();
    module.loadDetails(moduleGateway)
        .then(() => {
            const cadSourceGateway = getCadSourceGateway();

            const dialog = createModuleDataViewDialog();
            ReactDOM.render(
                <ModuleDataView editableModuleData={null}
                                savedForkModules={savedForkModules}
                                cpuGateway={new CpuGateway()}
                                closeDialog={() => dialog.close()}
                                isForkedModule={isForkedModule}
                                forkConfirmation={false}
                                isLoading={true}/>,
                dialog.el);

            cadSourceGateway.getUpverterCadSource(module.getRevisionId())
                .then(cadSource => {
                    Promise.all([
                        cadSourceGateway.getNetList(cadSource.id),
                        cadSourceGateway.getPartList(cadSource.id),
                    ]).then(results => {
                        const nets: string[] = results[0];
                        const parts: Part[] = results[1];

                        const editableModuleData = forkModule(module, cadSource, nets, parts);

                        ReactDOM.render(
                            <ModuleDataView editableModuleData={editableModuleData}
                                            savedForkModules={savedForkModules}
                                            cpuGateway={new CpuGateway()}
                                            closeDialog={() => dialog.close()}
                                            isForkedModule={isForkedModule}
                                            forkConfirmation={forkConfirmation !== null && forkConfirmation}
                                            isLoading={false}/>,
                            dialog.el);
                    });
                }).fail(() => dialog.close());
        });
}

function createModuleDataViewDialog(): Dialog {
    if (dialog) {
        dialog.close();
    }
    const width = Math.min(1100, $(window).width() * 0.8);
    dialog = new Dialog({
        title: 'Module Data Viewer',
        width: width,
        height: $(window).height() * 0.9
    });
    dialog.$el.addClass('module-data-viewer');
    return dialog;
}
