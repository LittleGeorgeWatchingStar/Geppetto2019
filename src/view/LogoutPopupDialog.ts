import {Dialog} from "./Dialog";
import {Logout} from "../controller/Logout";

/**
 * The dialog that popup the logout window to get around the browser
 * popup blocking
 */
export default class LogoutPopupDialog extends Dialog {
    private logout: Logout;

    initialize(data) {
        super.initialize(data);

        this.logout = data.logout;
        this.option({width: 400});
        this.buttons({
            Logout: () => {
                this.close()
            },
        });

        return this;
    }

    onClose(): void {
        this.logout.openLogoutPopup(() => this.logout._completeLogout());
    }
}