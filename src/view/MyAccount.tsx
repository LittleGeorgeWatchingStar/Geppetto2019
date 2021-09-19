import * as $ from "jquery";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {MyAccountContent} from "../auth/MyAccountContent";

export class MyAccount {

    private constructor() {
    }

    public static init() {
        MyAccount.generateAuth();
    }

    private static generateAuth(): void {
        MyAccount.generateAccountContent(false);
        MyAccount.hideAccountMenuOnClickBind();
    }

    static generateAccountContent(isDropdownOpen: boolean, isUserLoggedIn?: boolean): void {
        const render = () => {
            const container = document.getElementById('user-account');
            let content;
            if (isUserLoggedIn) {
                content = <MyAccountContent isDropdownOpen={isDropdownOpen} isUserLoggedIn={isUserLoggedIn}/>;
            } else {
                content = <MyAccountContent isDropdownOpen={isDropdownOpen}/>;
            }
            ReactDOM.render(content, container);
        }
        render();
    }

    private static hideAccountMenuOnClickBind(): void {
        $(document).click((e) => {
            const target = $(e.target);
            if (target.closest('#account-menu-dropdown').length === 0
                && target.closest('.my-account-button ').length === 0) {
                MyAccount.generateAccountContent(false);
            }
        });
    }
}