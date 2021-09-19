import {downloadBlob} from "utils/download";
import {Dialog} from "view/Dialog";
import events from "utils/events";
import {AUTODOC} from "../toolbar/events";
import DialogManager from "../view/DialogManager";
import {DesignRequestEvent} from "../design/events";
import {ServerID} from "../model/types";

/**
 * Controller for generating the autodoc datasheet.
 * TODO be wary when writing tests that can trigger this functionality, as it doesn't yet get stubbed.
 */
function init() {
    events.subscribe(AUTODOC, createAutodoc);
}

function createAutodoc(event: DesignRequestEvent) {
    generate(event.design_revision_id);
}

function generate(revisionId: ServerID): void {
    const waitDialog = _showWaitDialog(() => waitDialog.close());

    /* Fetch the datasheet via AJAX; this allows us to ensure that it
     * succeeded before replacing the window href with the download URL. */
    const url = `/api/v3/design/revision/${revisionId}/datasheet/`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob'; // jQuery can't do this.

    xhr.onload = function () {
        waitDialog.close();
        if (xhr.status === 200) {
            downloadBlob(xhr);
        } else {
            _showErrorDialog(xhr.statusText);
        }
    };

    xhr.send();
}

function _showWaitDialog(callback) {
    return DialogManager.create(Dialog,{
        title: 'Generating datasheet',
        html: `<div><div class="loading"></div></div>`
    }).alert(callback);
}

function _showErrorDialog(errorThrown: string): void {
    DialogManager.create(Dialog,{
        title: 'Error generating datasheet',
        html: `<h2>${errorThrown}</h2>
            <p>Datasheet generation failed.</p>
            <p>Please try again later.</p>`
    }).alert();
}

export default {
    init: init,
};
