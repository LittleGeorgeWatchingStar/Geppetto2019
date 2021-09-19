import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {PushDialog, PushDialogOptions} from "../../../src/design/PushDialog";
import * as ReactTestUtils from 'react-dom/test-utils';
import * as $ from "jquery";
import UserController from "../../../src/auth/UserController";
import User from "../../../src/auth/User";

describe("PushDialog", function () {

    let dialog = null;

    afterEach(() => {
        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    });

    it("rerenders when the design image has changed", function () {
        const design = new DesignRevisionBuilder().withImage(null).build();
        dialog = new PushDialog({design: design} as PushDialogOptions);
        expect(dialog.el.innerHTML).toContain("No Preview Available");
        design.set('image_url', '/image/path');
        expect(dialog.el.innerHTML).toContain("/image/path");
    });

    describe("Override validation", function () {
        it("does not appear for regular users", function () {
            spyOn(UserController, 'getUser').and.returnValue(new User());
            const design = new DesignRevisionBuilder().build();
            dialog = new PushDialog({design: design} as PushDialogOptions);
            expect(dialog.el.innerHTML).not.toContain('Override Validation');
        });

        it("appears for engineers", function () {
            const engineer = new User();
            engineer.isEngineer = () => true;
            spyOn(UserController, 'getUser').and.returnValue(engineer);
            const design = new DesignRevisionBuilder().build();
            dialog = new PushDialog({design: design} as PushDialogOptions);
            expect(dialog.el.innerHTML).toContain('Override Validation');
        });
    });

    describe("Push button", function () {
        it("is disabled when there is no design image", function () {
            const design = new DesignRevisionBuilder().withImage(null).build();
            dialog = new PushDialog({design: design} as PushDialogOptions);
            expect(dialog.el.querySelector('.push').disabled).toBe(true);
        });

        it("becomes enabled when there is a design image", function () {
            const design = new DesignRevisionBuilder().withImage('/image/path').build();
            dialog = new PushDialog({design: design} as PushDialogOptions);
            expect(dialog.el.querySelector('.push').disabled).toBe(false);
        });

        it("triggers design push when clicked", function () {
            const design = new DesignRevisionBuilder().withImage('/image/path').build();
            const pushSpy = spyOn(design, 'push').and.callFake(() => {
                const deferred = $.Deferred();
                deferred.resolve();
                return deferred.promise();
            });
            dialog = new PushDialog({design: design} as PushDialogOptions);
            ReactTestUtils.Simulate.click(dialog.el.querySelector('.push'));
            expect(pushSpy).toHaveBeenCalled();
        });
    });
});