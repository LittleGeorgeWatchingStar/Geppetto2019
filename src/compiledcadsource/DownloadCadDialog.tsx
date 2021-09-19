import * as ReactDOM from "react-dom";
import * as React from "react";
import {AbstractDialog} from "../view/Dialog";
import {DownloadCadDialogComponent} from "./DownloadCadDialogComponent";
import DialogManager from "../view/DialogManager";
import {DesignController} from "../design/DesignController";

export function openDownloadCadDialog(): void {
    const dialog = DialogManager.create(DownloadCadDialog, {});
    ReactDOM.render(
        <DownloadCadDialogComponent designRevision={DesignController.getCurrentDesign()}
                                    closeDialog={() => dialog.close()}/>,
        dialog.el);
}

class DownloadCadDialog extends AbstractDialog<any> {
    initialize(options) {
        super.initialize(options);
        this.option({
            width: 550,
            height: 460,
        });
        this.title('Download CAD');
        return this;
    }

    public get className(): string {
        return 'download-cad-dialog';
    }
}
