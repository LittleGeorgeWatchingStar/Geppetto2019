import * as $ from 'jquery';
import userController from 'auth/UserController';
import view from 'view';
import events from 'utils/events';
import * as Config from 'Config';
import * as Sentry from '@sentry/browser';
import {SERVER_lOGIN, USER_CHANGED} from "../auth/events";
import UserController from "../auth/UserController";
import {MyAccount} from "../view/MyAccount";

export class LoginController {
    private static instance: LoginController;

    private loginUrl: string;
    private popup: Window | null = null;

    public constructor() {}

    public static getInstance(): LoginController {
        if (!LoginController.instance) {
            LoginController.instance = new LoginController();
        }
        return LoginController.instance;
    }

    public static setInstance(instance: LoginController): void {
        this.instance = instance;
    }

    public init(loginUrl: string): void {
        this.loginUrl = loginUrl;
    }

    /**
     * Open login popup.
     */
    public login(): void {
        if (UserController.getUser().isLoggedIn()) {
            return;
        }

        if (this.popup !== null) {
            this.popup.close();
        }

        this.popup = window.open(this.getLoginPopupUrl(),
            '_blank',
            'width=790,height=580,scrollbars=yes');

        const polling = setInterval(() => {
            if (this.popup.closed) {
                clearInterval(polling);
                this.callback();
            }
        }, 100);
    }

    private getLoginPopupUrl(): string {
        const url = new URL(this.loginUrl);
        const params = new URLSearchParams(url.search);
        params.append('next', `${Config.APP_URL}/login_success.html`);
        return url.origin + url.pathname + '?' + params.toString();
    }

    private callback(): void {
        $.getJSON('/api/v3/auth/current-user/', auth => {
            if (auth.id > 0) {
                events.publish($.Event(SERVER_lOGIN, {auth: auth}));

                Sentry.configureScope(scope => {
                    scope.setUser({
                        email: auth.email,
                    });
                });

                $('#user-name').html(auth.first_name + ' ' + auth.last_name);
                $('#user-email').html(auth.email);
                view.setTheme(userController.theme());
                events.publish(USER_CHANGED);
                MyAccount.generateAccountContent(false, true);
            }
        });
    }
}
