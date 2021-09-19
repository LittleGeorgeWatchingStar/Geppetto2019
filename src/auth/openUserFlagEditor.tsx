import {Dialog} from "../view/Dialog";
import * as React from "react";
import * as ReactDOM from "react-dom";
import UserController from "./UserController";
import {UserFlagEditor} from "./UserFlagEditor";
import {UserGateway} from "./UserGateway";
import {AVAILABLE_FLAGS, AVAILABLE_TOOL_FLAGS} from "./FeatureFlag";
import * as Config from 'Config';

let flagDialog = null;

export function openFlagDialog(): void {
    const flagDialog = createFlagEditDialog();
    const availableFlags = AVAILABLE_FLAGS.filter(flag => !Config.AUTO_ENABLED_FLAGS.includes(flag))
    const availableToolFlags = AVAILABLE_TOOL_FLAGS.filter(flag => !Config.AUTO_ENABLED_FLAGS.includes(flag))
    ReactDOM.render(
        <UserFlagEditor user={UserController.getUser()}
                        availableFlags={availableFlags}
                        availableToolFlags={availableToolFlags}
                        gateway={new UserGateway()}/>,
        flagDialog.el);
}

function createFlagEditDialog(): Dialog {
    if (flagDialog) {
        flagDialog.close();
    }
    const width = Math.min(600, $(window).width() * 0.5);
    flagDialog = new Dialog({
        title: 'User Flag Editor',
        width: width,
        height: $(window).height() * 0.55
    });
    flagDialog.$el.addClass('user-flag-editor');
    return flagDialog;
}

