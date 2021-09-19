import {AbstractDialog} from "./Dialog";
import {Design} from "../design/Design";
import {getDesignGateway} from "../design/DesignGateway";
import {DESIGN_DELETE_COMPLETE} from "../design/events";
import events from "../utils/events";
import errorHandler from "controller/ErrorHandler";
import {DesignController} from "../design/DesignController";
import {ServerID} from "../model/types";

/**
 * The dialog for deleting a design.
 */
export default class DeleteDialog extends AbstractDialog<Design> {

    initialize(options) {
        super.initialize(options);
        this.option({
            maxHeight: 300,
            minWidth: 400
        });

        this.title('Delete Design');
        this.text(`Are you sure you want to delete "${this.model.getTitle()}"?
        This action will also remove any collaborators you've invited to the design.`);
        this.buttons([
            this.makeButton('Delete', this.delete, this),
            this.makeButton('Cancel')
        ]);
        return this;
    }

    private get designId(): ServerID {
        return this.model.id;
    }

    private delete(): void {
        const designGateway = getDesignGateway();
        const designDeleting = designGateway.deleteDesign(this.designId);
        designDeleting
            .done(() => {
                DesignController.checkDeletedDesign(this.designId);
                events.publishEvent(DESIGN_DELETE_COMPLETE, {id: this.designId});
            })
            .fail(errorHandler.onFail)
            .always(this.close);
    }
}