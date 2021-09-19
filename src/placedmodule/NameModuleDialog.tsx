import "lib/jquery-ui";
import {AbstractDialog, DialogOptions} from "view/Dialog";
import {PlacedModule} from "./PlacedModule";
import {getKeyName} from "../view/keys";
import {RenamePlacedModule} from "./actions";
import * as React from "react";
import * as ReactDOM from "react-dom";
import validate from "../utils/validate";


export class NameModuleDialog extends AbstractDialog<PlacedModule> {

    constructor(options) {
        super(options);
        this.title(`Rename module "${this.model.customName}"`);
        this.buttons({
            Save: () => this.save(),
            Cancel: this.close
        });
        this.render();
    }

    render(error=null): this {
        const element = (
            <div id={"custom-name-dialog"}>
                {error &&
                <div className={"error"}>
                    {error}
                </div>
                }
                <label>
                    <p>Enter a name for this module.</p>
                    <input id={"custom-module-name"}
                           type={"text"}
                           maxLength={100}
                           defaultValue={this.model.customName}
                           onKeyDown={(e) => this.keydown(e)}/>
                </label>
            </div>
        );
        ReactDOM.render(element, this.el);
        this.$el.find('input').focus();
        return this;
    }

    keydown(event) {
        if (getKeyName(event.which) === 'ENTER') {
            this.save();
        }
    }

    private save(): void {
        const customName = this.$el.find('#custom-module-name').val() as string;
        if (validate.isValid(customName)) {
            this.close();
            RenamePlacedModule.addToStack(this.model, customName);
        } else {
            this.render('Invalid name');
        }
    }
}