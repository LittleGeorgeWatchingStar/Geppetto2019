import {DesignRevision} from "../../src/design/DesignRevision";
import {DesignRevisionBuilder} from "./DesignRevisionBuilder";
import {DesignController} from "../../src/design/DesignController";
import events from "../../src/utils/events";
import {CURRENT_DESIGN_SET} from "../../src/design/events";

DesignController.createNewDesign();

export function overrideDesignRevision(designRev?: DesignRevision): DesignRevision {
    const rev = designRev ? designRev : new DesignRevisionBuilder().build();
    spyOn(DesignController, 'getCurrentDesign').and.returnValue(rev);
    // TODO needed to inform the WorkspaceView that we're looking at a new DesignRevision:
    events.publish(CURRENT_DESIGN_SET);
    return rev;
}