import {AuthRequiredDialog} from "../../src/view/AuthRequiredDialog";
import "lib/jquery-ui";

describe("AuthRequiredDialog", function () {
    it("getInstance returns same instance", function () {
        let oldDialog = AuthRequiredDialog.getInstance({
            title: 'Old dialog',
            html: "test"
        });

        let newDialog = AuthRequiredDialog.getInstance({
            title: 'New dialog',
            html: "test"
        })
        expect(oldDialog).toBe(newDialog);
    });
});