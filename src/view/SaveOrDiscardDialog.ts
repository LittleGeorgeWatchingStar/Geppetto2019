import {Dialog} from 'view/Dialog';
import * as template from 'templates/saveordiscard';
import events from 'utils/events';
import {DISCARD_DESIGN, CANCEL} from "./events";
import {DesignController} from "../design/DesignController";

/**
 * The dialog that prompts the user to save or discard their
 * design before their action get executed.
 * Becare that the local callBack method/function maybe lost
 * while passing deeper.
 */
export default class SaveOrDiscardDialog extends Dialog {
    private action: string;
    initialize(data) {
        super.initialize(data);
        this.action = data.action;
        this.option({width: 400});
        this.buttons({
            Save: () => {
                DesignController.save(false, data.callBack);
                this.close();
            },
            Discard: () => {
                if (data.logout) {
                    events.publish(DISCARD_DESIGN);
                } else {
                    data.callBack();
                }
                this.close();
            },
            Cancel: () => {
                if (data.logout) {
                    events.publish(CANCEL);
                }
                this.close();
            }
        });

        return this.render();
    }

    render() {
        const html = template({
            design_title: DesignController.getCurrentDesign().getDesignTitle(),
            action: this.action
        });

        this.$el.html(html);
        return this;
    }

}
