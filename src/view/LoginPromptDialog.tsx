import {Dialog} from "./Dialog";
import {LoginController} from "../controller/Login";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {USER_CHANGED} from "../auth/events";
import {DesignController} from "../design/DesignController";
import events from "../utils/events";

export class LoginPromptDialog extends Dialog {
    initialize(options) {
        super.initialize(options);
        this.title('Log-in Required');
        ReactDOM.render(this.content, this.$el.get(0));
        this.listenTo(events, USER_CHANGED, () => this.onUserChanged());
        return this;
    }

    private onUserChanged(): void {
        this.close();
        DesignController.save();
    }

    private get content(): JSX.Element {
        return (
            <div className="login-prompt-dialog">
                <p>To save your design, please log in first.</p>
                <button className="cta log-in"
                        onClick={() => LoginController.getInstance().login()}>
                    Log In
                </button>
            </div>
        );
    }
}