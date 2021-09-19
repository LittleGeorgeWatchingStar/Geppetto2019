import {MyAccount} from "../../src/view/MyAccount";
import * as $ from "jquery";
import UserController from "../../src/auth/UserController";
import * as ReactTestUtils from "react-dom/test-utils";
import {LoginController} from "../../src/controller/Login";
import User from "../../src/auth/User";
import {LOG_OUT, USER_PROFILE} from "../../src/auth/events";
import {THEME, TUTORIAL_TOGGLE} from "../../src/toolbar/events";
import eventDispatcher from 'utils/events';

function makeDomNodes(): void {
    $('body').html('<div id="user-account"></div>');
}

function makeUser(): void {
    const user = new User();
    user.isLoggedIn = () => true;
    spyOn(UserController, 'getUser').and.returnValue(user);
}

export function makeMyAccount(): void {
    makeDomNodes();
    MyAccount.generateAccountContent(false);
}

describe('My Account (Including Login)', function () {

    describe('user login button', function () {
        it('click to open login auth', function () {
            const loginController = new LoginController();
            loginController.init('http://login.url');
            LoginController.setInstance(loginController);
            const loginSpy = spyOn(LoginController.getInstance(), 'login').and.callFake(() => {
            });
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('.my-account-login'));
            expect(loginSpy).toHaveBeenCalled();
        });
    });

    describe('my account button', function () {
        it('click to show dropdown menu list', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            expect(document.querySelector('#account-menu-dropdown').children).not.toBeNull();
        });

        it('click twice to hide dropdown menu list', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            expect(document.querySelector('#account-menu-dropdown').children.length).toEqual(0);
        });
    });

    describe("My account drop down menu", function () {

        it('has a Edit Profile button that triggers the USER_PROFILE event when clicked', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            let eventFired = false;
            eventDispatcher.subscribe(USER_PROFILE, () => eventFired = true);
            ReactTestUtils.Simulate.click(document.querySelector('#edit-profile'));
            expect(eventFired).toBe(true);
        });

        it('has a Dark Mode buttons that switch theme to dark when clicked', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            let eventFired = false;
            eventDispatcher.subscribe(THEME, () => eventFired = true);
            ReactTestUtils.Simulate.click(document.querySelector('#dark-mode'));
            expect(eventFired).toBe(true);
        });

        it('has a Hint buttons that active tutorial when clicked', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            let eventFired = false;
            eventDispatcher.subscribe(TUTORIAL_TOGGLE, () => eventFired = true);
            ReactTestUtils.Simulate.click(document.querySelector('#tutorial'));
            expect(eventFired).toBe(true);
        });

        it('has a Menu Expension buttons that lock the dashboard menu when clicked', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            const jobSpy = spyOn(UserController, 'toggleDashboardMenuCollapse').and.callFake(() => {
            });
            ReactTestUtils.Simulate.click(document.querySelector('#menu-collapse-toggle'));
            expect(jobSpy).toHaveBeenCalled();
        });

        it('has a Logout button that logs out user when click', function () {
            makeUser();
            makeMyAccount();
            ReactTestUtils.Simulate.click(document.querySelector('#my-account-content button'));
            let eventFired = false;
            eventDispatcher.subscribe(LOG_OUT, () => eventFired = true);
            ReactTestUtils.Simulate.click(document.querySelector('#logout'));
            expect(eventFired).toBe(true);
        });
    });
});