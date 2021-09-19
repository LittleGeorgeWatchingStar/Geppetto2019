import events from 'utils/events';
import Auth from "../auth/Auth";
import view from 'view';
import SaveOrDiscardDialog from 'view/SaveOrDiscardDialog';
import {Dialog as ErrorDialog} from 'view/Dialog';
import * as Config from 'Config';
import {AUTH_REQUIRED, AUTH_REQUIRED_DIALOG_CLOSED, LOG_OUT, SERVER_LOGOUT, USER_CHANGED} from "../auth/events";
import DialogManager from "../view/DialogManager";
import LogoutPopupDialog from "../view/LogoutPopupDialog";
import UserController from "../auth/UserController";
import {DesignController} from "../design/DesignController";
import {MyAccount} from "../view/MyAccount";

export class Logout {
    private loggingOut: boolean = false;
    private popup: Window = null;

    init() {
        events.subscribe({
            logoutSso: () => this.logoutSso(),
            saveComplete: () => this.saveComplete(),
            cancelLogout: () => this._cancelLogout()
        });
        events.subscribe(AUTH_REQUIRED, () => this._completeLogoutCorruptedSession());
        events.subscribe(AUTH_REQUIRED_DIALOG_CLOSED, () => this.clearCorruptedSession());
        events.subscribe(LOG_OUT, () => this.logout());
    }

    private logout(): void {
        if (!UserController.getUser().isLoggedIn()) {
            return;
        }
        if (DesignController.hasUnsavedChanges()) {
            this.loggingOut = true;
            DialogManager.create(SaveOrDiscardDialog, {
                title: 'Logout',
                logout: true,
                action: 'to log out'
            });
        } else {
            this.logoutSso();
        }
    }

    private saveComplete() {
        if (this.loggingOut) {
            this.logoutAfterSaved();
        }
    }

    private logoutAfterSaved() {
        events.publish('LogoutDialog.close');
        DialogManager.create(LogoutPopupDialog, {
            logout: this,
            title: 'Saved',
            html: 'Your design has been saved. Have a nice day!'
        });
    }

    logoutSso() {
        this.openLogoutPopup(() => this._completeLogout());
    }

    /**
     * Clears corrupted session from SSO by logging out
     */
    clearCorruptedSession() {
        this.openLogoutPopup(() => {
            /**
             * corrupted session AJAX requests responds with 401, call USER_CHANGED
             * after corrupted sessions is logged out so AJAX calls can be made again
             * with data instead of 401
             */
            events.publish(USER_CHANGED);
        });
    }

    openLogoutPopup(logoutSuccess: () => void) {
        if (this.popup) {
            this.popup.close();
        }

        this.popup = window.open(`${Config.AUTH_URL}/logout/?next=${Config.APP_URL}/logout_success.html`,
            '_blank',
            'width=790,height=580');
        if (!this.popup) {
            new ErrorDialog({
                title: 'Error',
                html: 'Our logout popup seems to have been blocked. Please enable popup windows for this site then try again.'
            }).alert();
            this.loggingOut = false;
            return;
        }
        const polling = setInterval(() => {
            if (this.popup.closed) {
                clearInterval(polling);
                logoutSuccess();
            }
        }, 100);
    }

    _cancelLogout() {
        this.loggingOut = false;
    }

    _completeLogout() {
        view.setTheme(UserController.theme());
        this.loggingOut = false;
        this._clearUser();
        DesignController.createNewDesign();
        this._refreshUser();
        MyAccount.generateAccountContent(false, false);
    }

    _completeLogoutCorruptedSession() {
        const isLoggedin = Auth.isLoggedIn();
        if (isLoggedin) {
            this._clearUser();
            this._refreshUser();
        }
    }

    _clearUser() {
        const user = UserController.getUser();
        events.publishEvent(SERVER_LOGOUT, {auth: user});
    }

    _refreshUser() {
        events.publish(USER_CHANGED);
    }
}
