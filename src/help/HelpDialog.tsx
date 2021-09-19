import * as Backbone from "backbone";
import * as $ from "jquery";
import * as ReactDOM from 'react-dom';
import {UserManual, UserManualTab} from "./UserManual";
import * as React from "react";

export default class HelpDialog extends Backbone.View<any> {
    public initialize() {
        this.$el.dialog({
            resizable: false,
            title: 'Geppetto User Manual',
            width: 700,
            height: $(window).height() * 0.7,
            autoOpen: false
        });

        this.renderManualContent(UserManualTab.HOME);
        return this;
    }

    public open(selection: string): void {
        this.renderManualContent(selection);
        this.$el.dialog('open');
    }

    private renderManualContent(selection: string): void {
        ReactDOM.render(<UserManual openWithSelection={selection}
                                    scrollTop={this.scrollTop}/>, this.el);
    }

    private scrollTop(): void {
        document.getElementById('dialog-help').scrollTop = 0;
    }
}
