import * as ReactDOM from "react-dom";
import * as React from "react";
import {Module} from "../module/Module";
import {Dialog} from "../view/Dialog";
import {ModuleBusPinMappingViewer} from "./ModuleBusPinMappingViewer";
import {getModuleGateway} from "../module/ModuleGateway";

let dialog = null;

export function openModuleBusPinMappingView(module: Module, rotation: number) {
    const moduleGateway = getModuleGateway();
    module.loadDetails(moduleGateway).then(() => {
        if (dialog) {
            dialog.close();
        }
        const width = Math.max(750, $(window).width() * 0.55);
        dialog = new Dialog({
            title: `Module Bus to Pin Mapping Viewer: ${module.name}`,
            width: width,
            height: Math.min(750, $(window).height() * 0.9)
        });
        dialog.$el.addClass('custom-module-dialog view-only');
        ReactDOM.render(
            <ModuleBusPinMappingViewer module={module} rotation={rotation}/>,
            dialog.el);
    });
}
