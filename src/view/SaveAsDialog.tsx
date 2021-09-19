import {AbstractDialog, DialogOptions} from "view/Dialog";
import {DesignRevision} from "../design/DesignRevision";
import {DesignSaver} from "../design/DesignController";
import * as ReactDOM from "react-dom";
import {SaveAsDialogContent} from "../design/SaveAsDialogContent";
import * as React from "react";

interface SaveAsDialogOptions extends DialogOptions<DesignRevision> {
    model: DesignRevision;
    callBack?: () => void;
    customMessage?: string;
    prompt3DSave?: boolean;
}

/**
 * Dialog for saving a design.
 */
export class SaveAsDialog extends AbstractDialog<DesignRevision> {

    private callback: () => void;
    private customMessage: string | null;
    private prompt3DSave: boolean;

    initialize(options: SaveAsDialogOptions) {
        options.title = 'Save As';
        this.callback = options.callBack;
        this.customMessage = options.customMessage ? options.customMessage : null;
        this.prompt3DSave = undefined !== options.prompt3DSave ? options.prompt3DSave : true;
        super.initialize(options);
        this.option({width: 400, minHeight: 350});
        this.renderDialogContent();
        return this;
    }

    private renderDialogContent(): void {
        const saveAndClose = () => {
            this.close();
            DesignSaver.of(this.design).initialDesignSave(this.prompt3DSave, this.callback);
        }
        ReactDOM.render(<SaveAsDialogContent design={this.design}
                                             customMessage={this.customMessage}
                                             saveClose={saveAndClose}/>, this.el);
    }

    private get design(): DesignRevision {
        return this.model;
    }
}
