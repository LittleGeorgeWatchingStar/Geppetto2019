import {downloadBlob} from "utils/download";
import {Dialog} from "../view/Dialog";
import events from "utils/events";
import {DEVICE_TREE} from "../toolbar/events";
import DialogManager from "../view/DialogManager";
import {ServerID} from "../model/types";
import {DesignRequestEvent} from "../design/events";

/**
 * Controller for device tree generation.
 */

function init(){
    events.subscribe(DEVICE_TREE, createDeviceTree)
}

function createDeviceTree(event: DesignRequestEvent) {
    generate(event.design_revision_id);
}

function generate(revisionId: ServerID): void {
    const waitDialog = _showWaitDialog(() => waitDialog.close());

    /* Fetch the device tree via AJAX; this allows us to ensure that it
     * succeeded before replacing the window href with the download URL. */
    const url = `/api/v3/device-tree/binaries/${revisionId}/`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob'; // jQuery can't do this.

    xhr.onload = function () {
        waitDialog.close();
        if (xhr.status === 200) {
            downloadBlob(xhr);
        } else {
            _handleError(xhr);
        }
    };

    xhr.send();
}

function _showWaitDialog(callback) {
    return DialogManager.create(Dialog, {
        title: 'Generating BSP',
        html: `<div><div class="loading"></div></div>`
    }).alert(callback);
}

function _handleError(xhr: XMLHttpRequest): void {
    try {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
            if (typeof reader.result === 'string') {
                const data = JSON.parse(reader.result as string);
                if ('message' in data) {
                    _showErrorDialog(data.message);
                } else {
                    _showErrorDialog(xhr.statusText);
                }
            } else {
                _showErrorDialog(xhr.statusText);
            }
        });
        reader.readAsText(xhr.response);
    } catch (e) {
        console.warn(e);
        _showErrorDialog(xhr.statusText);
    }
}

function _showErrorDialog(reason: string): void {
    DialogManager.create(Dialog, {
        title: 'Unable to generate BSP',
        html: `<p>${reason}</p>`
    }).alert();
}

export default {
    init: init,
}
