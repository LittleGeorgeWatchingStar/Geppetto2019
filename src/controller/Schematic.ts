/**
 * Controller for generating the stitched schematic.
 */
import events from "../utils/events";
import {DesignRequestEvent, OPEN_DESIGN_SCHEMATIC} from "../design/events";
import DialogManager from "../view/DialogManager";
import DesignSchematicDialog, {DesignSchematicDialogOptions} from "../design/DesignSchematicDialog";
import ModuleSchematicDialog, {ModuleSchematicDialogOptions} from "../module/ModuleSchematicDialog";
import {getDesignRevisionGateway} from "../design/DesignRevisionGateway";
import {downloadBlob} from "../utils/download";
import * as Config from "Config";
import {ModuleRequestEvent, OPEN_MODULE_SCHEMATIC} from "../module/events";
import {getModuleGateway} from "../module/ModuleGateway";

export interface SchematicInfo {
    sheet_count: number;
    sheets: SheetSummary[];
}

interface SheetSummary {
    title: string;
}

const designRevisionGateway = getDesignRevisionGateway();
const moduleRevisionGateway = getModuleGateway();

function init() {
    events.subscribe(OPEN_DESIGN_SCHEMATIC, openDesignSchematicDialog);
    events.subscribe(OPEN_MODULE_SCHEMATIC, openModuleSchematicDialog);
}

function openDesignSchematicDialog(event: DesignRequestEvent) {
    const id = event.design_revision_id;
    DialogManager.create(DesignSchematicDialog, {
        previewUrl: `${Config.API_URL}/api/v3/design/revision/${id}/eagle/schematic/preview/`,
        getStatus: () => designRevisionGateway.getDesignRevisionSchematicStatus(id),
        requestStitch: () => designRevisionGateway.postDesignRevisionSchematicJob(id),
        getSchematicInfo:() => designRevisionGateway.getDesignRevisionSchematicInfo(id),
        downloadSchematic: () => {
            const url = `${Config.API_URL}/api/v3/design/revision/${id}/eagle/download/`;
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.withCredentials = true;

            xhr.onload = () => {
                if (xhr.status === 200) {
                    downloadBlob(xhr);
                }
            };

            xhr.send();
        }
    } as DesignSchematicDialogOptions);
}

function openModuleSchematicDialog(event: ModuleRequestEvent) {
    const id = event.id;
    DialogManager.create(ModuleSchematicDialog, {
        previewUrl: `${Config.API_URL}/api/v3/module/revisions/${id}/eagle/schematic/preview/`,
        getSchematicInfo:() => moduleRevisionGateway.getSchematicInfo(id),
    } as ModuleSchematicDialogOptions);
}

export default {
    init: init,
};
