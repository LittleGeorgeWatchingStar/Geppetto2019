import * as ReactDOM from "react-dom";
import * as React from "react";
import {AbstractDialog} from "../view/Dialog";
import {CompiledCadDialogComponent} from "./CompiledCadDialogComponent";
import DialogManager from "../view/DialogManager";
import {DesignController} from "../design/DesignController";

export function openCompiledCadDialog(renderType: string | null): void {
    const dialog = DialogManager.create(CompiledCadDialog, {});
    ReactDOM.render(
        <CompiledCadDialogComponent designRevision={DesignController.getCurrentDesign()}
                                    closeDialog={() => dialog.close()}
                                    renderType={renderType}/>,
        dialog.el);
}

class CompiledCadDialog extends AbstractDialog<any> {
    initialize(options) {
        super.initialize(options);
        this.option({
            width: 550,
            height: 260,
        });
        this.title('Compiled Design');
        return this;
    }

    public get className(): string {
        return 'compiled-cad-dialog';
    }
}
