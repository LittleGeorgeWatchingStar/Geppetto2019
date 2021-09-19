import {DesignRevision} from "../design/DesignRevision";
import events from "utils/events";
import {CAD_DATA} from "../toolbar/events";

/**
 * Controller for CAD data requests.
 */

function init(){
    events.subscribe(CAD_DATA, getCadData)
}

function getCadData(event: ModelEvent<DesignRevision>) {
    generate(event.model);
}

function generate(designRevision: DesignRevision): void {
    if (designRevision.isDirty() || designRevision.isNew()) {
        alert('Please save your design first.');
        return;
    }

    const url = `/api/v3/design/revision/${designRevision.getId()}/cad/`;
    window.open(url, '_blank');
}

export default {
    init: init,
}
