import {LoginController} from "../../src/controller/Login";
import {LoginPromptDialog} from "../../src/view/LoginPromptDialog";
import * as ReactTestUtils from "react-dom/test-utils";
import {USER_CHANGED} from "../../src/auth/events";
import {DesignController} from "../../src/design/DesignController";
import events from "../../src/utils/events";

describe('LoginPromptDialog', () => {
    it('clicking the log-in button triggers login', () => {
        const loginController = new LoginController();
        loginController.init('http://login.url');
        LoginController.setInstance(loginController);
        const loginSpy = spyOn(LoginController.getInstance(), 'login').and.callFake(() => {});

        const dialog = new LoginPromptDialog({});
        ReactTestUtils.Simulate.click(dialog.el.querySelector('.log-in'));
        expect(loginSpy).toHaveBeenCalled();
    });

    it('user changed triggers DesignController save', () => {
        const saveSpy = spyOn(DesignController, 'save').and.callFake(() => {});
        new LoginPromptDialog({});
        events.publish(USER_CHANGED);
        expect(saveSpy).toHaveBeenCalled();
    });
});
