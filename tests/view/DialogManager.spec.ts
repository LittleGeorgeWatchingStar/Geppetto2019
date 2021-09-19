import DialogManager from "../../src/view/DialogManager";
import "lib/jquery-ui";
import {Dialog} from "../../src/view/Dialog";

describe("DialogManager", function () {
    it("DialogManager returns openedDialog", function () {
        let dialogType = Dialog;
        let dialog = DialogManager.create(dialogType, {title: 'Test Dialog'});
        expect(dialog instanceof dialogType).toBe(true);
    });
});