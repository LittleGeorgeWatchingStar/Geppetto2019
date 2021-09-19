import {Module} from "../../module/Module";
import {ProvideBus} from "../../bus/ProvideBus";
import {Workspace} from "../../workspace/Workspace";
import {Dialog} from "../../view/Dialog";
import {getModuleGateway} from "../../module/ModuleGateway";
import * as ReactDOM from "react-dom";
import events from "../../utils/events";
import {SELECT_REQUIRE} from "../../bus/events";
import * as React from "react";
import {SuggestedModulesView} from "./SuggestedModulesView";
import {MODULE_PUT} from "../../module/events";

let dialog = null;

function closeDialog(): void {
    if (dialog) {
        dialog.close();
        dialog = null;
    }
}

export interface suggestedModulesDialogOptions {

    /**
     * Modules that appear under the "Recommended Modules" section of the dialog.
     * These have been chosen by engineers.
     */
    recommended: Module[];

    /**
     * For querying modules that are generally compatible to the selected bus.
     */
    busToQuery?: ProvideBus;

    /**
     * The suggestion associated with the recommended modules.
     */
    message: string;
    workspace: Workspace;
}

export function showSuggestedModules(options: suggestedModulesDialogOptions): void {
    closeDialog();
    dialog = new Dialog({
        title: 'Showing modules for suggestion',
        minWidth: 425,
        minHeight: 400,
        height: 500,
        modal: false,
        resizable: true
    });
    dialog.$el.addClass('suggested-modules');
    let queryCompatible;
    if (options.busToQuery) {
        queryCompatible = () =>
            getModuleGateway().getRequirers({
                provide: options.busToQuery.id,
                amount: options.busToQuery.getUsed()
            });
    }
    ReactDOM.render(<SuggestedModulesView recommendedModules={options.recommended}
                                          queryCompatibleModules={queryCompatible}
                                          message={options.message}
                                          workspace={options.workspace}/>, dialog.el);
    dialog.listenTo(events, SELECT_REQUIRE, closeDialog);
    // Only close the dialog on module add if this suggestion is meant for connecting a provide bus.
    if (queryCompatible) {
        dialog.listenTo(events, MODULE_PUT, closeDialog);
    }
}
