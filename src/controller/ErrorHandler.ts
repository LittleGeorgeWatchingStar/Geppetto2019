import events from 'utils/events';
import Response from 'utils/response';
import {Dialog as ErrorDialog} from 'view/Dialog';
import {AUTH_REQUIRED} from "../auth/events";
import {AuthRequiredDialog} from "../view/AuthRequiredDialog";
import DialogManager from "../view/DialogManager";

/**
 * This module is used to handle error responses return from the server
 */
function _getStatusMessage($response) {
    if ($response.status === 400 || $response.status === 403) {
        return Response.parseMessage($response);
    } else if ($response.status === 401) {
        return 'Your session has expired.';
    } else if ($response.status === 404) {
        return 'Not found.';
    }
    return 'Oops! An error occurred.';
}

function fail($response) {
    const message = _getStatusMessage($response);
    if ($response.status === 401) {
        createAuthRequiredDialog(message);
    } else {
        DialogManager.create(ErrorDialog, {
            title: 'Error',
            html: message
        }).alert();
    }
}

function createAuthRequiredDialog(message = 'Your session has expired.'): void {
    events.publish(AUTH_REQUIRED);
    AuthRequiredDialog.getInstance({
        title: 'Error',
        html: message,
    });
}

export default {
    onFail: fail,
    createAuthRequiredDialog: createAuthRequiredDialog,
}

