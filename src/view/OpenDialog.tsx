import {AbstractDialog} from 'view/Dialog';
import {Design} from "../design/Design";
import {OpenDialogContent} from "../design/OpenDialogContent";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface OpenDialogOptions extends Backbone.ViewOptions<Design> {
    designs: Design[]
}

/**
 * The dialog for opening a design belonging to the current user.
 */
export default class OpenDialog extends AbstractDialog<Design> {
    private designs: Design[];

    initialize(options: OpenDialogOptions) {
        super.initialize(options);
        this.designs = options.designs.sort((design, other) => other.compareUpdated(design));
        this.option({
            height: 400,
            minWidth: 600
        });

        this.title('Open Design');
        this.renderDialogContent();

        return this;
    }

    private renderDialogContent(): void {
        ReactDOM.render(<OpenDialogContent designs={this.designs}
                                           closeDialog={this.close}/>, this.el);
    }
}
