import {Dialog} from 'view/Dialog';
import events from 'utils/events';
import {AUTH_REQUIRED_DIALOG_CLOSED} from "../auth/events";

let openedDialog: Dialog = null;

/**
 * The dialog that prompts the that they have been logout
 * if sessions gets corrupted
 */
export class AuthRequiredDialog extends Dialog {

    private constructor(options) {
        super(options);
    }

    initialize(data) {
        super.initialize(data);

        this.option({width: 400});
        this.buttons({
            Ok: () => {
                this.close();
            }
        });
        return this.render();
    }

    render() {
        return this;
    }

    onClose() {
        openedDialog = null;
        events.publishEvent(AUTH_REQUIRED_DIALOG_CLOSED);
    }

    public static getInstance(options) {
        if (null === openedDialog) {
            openedDialog = new AuthRequiredDialog(options);
        }
        return openedDialog;
    }

}
