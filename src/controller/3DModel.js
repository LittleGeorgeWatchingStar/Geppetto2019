import events from 'utils/events';
import ThreeDView from '3dboard/3DModel';
import {REVISION_LOADED, SAVE3D} from "../design/events";
import {PREVIEW3D} from "../toolbar/events";
import Auth from "../auth/Auth";
import {DesignController} from "../design/DesignController";

function capture() {
    "use strict";

    ThreeDView.openDialog({
        title: 'Save Design Image',
        width: 400,
        height: 300,
        resizable: true,
        buttons: {
            Save: ThreeDView.captureImage,
            Close: ThreeDView.closeDialog,
            'Export STL': ThreeDView.getExportString
        }
    });
    ThreeDView.buildboard();
    ThreeDView.center_camera();
}


function preview() {
    "use strict";

    if (DesignController.getCurrentDesign().isNew()) {
        ThreeDView.openDialog({
            title: '3D View',
            resizable: true,
            buttons: {
                'Save Design': () => {
                    DesignController.save();
                    if (Auth.isLoggedIn()) {
                        close();
                    }
                },
                'Export STL': () => {
                    if (Auth.isLoggedIn()) {
                        ThreeDView.getExportString();
                    } else {
                        alert('To download the STL, please log in first. \nYou can log in in the upper right hand corner.');
                    }
                },
            }
        });
        ThreeDView.buildboard();
        ThreeDView.center_camera();
    } else {
        capture();
    }
}

function close() {
    "use strict";

    ThreeDView.closeDialog();
}

function init() {
    "use strict";

    events.subscribe(SAVE3D, capture);
    events.subscribe(REVISION_LOADED, close);
    events.subscribe(PREVIEW3D, preview);
}

export default {
    init: init
}
