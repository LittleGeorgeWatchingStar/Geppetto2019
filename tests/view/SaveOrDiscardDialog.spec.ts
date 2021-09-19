import SaveOrDiscardDialog from "../../src/view/SaveOrDiscardDialog";
import events from "../../src/utils/events";
import DialogManager from "../../src/view/DialogManager";

describe("SaveOrDiscardDialog", function () {

    it("click discard and callBack", function () {
        let callBacked = false;
        events.subscribe('callBack', () => callBacked = true);
        const SaveOrDiscard = DialogManager.create(SaveOrDiscardDialog, {
            title: 'Warning',
            callBack: () => events.publish('callBack'),
            action: 'to a new design'
        });
        expect($('.ui-dialog-title:contains("Warning")').length).toBe(1);
        $('.ui-button:contains("Discard")').click();
        expect(callBacked).toEqual(true);
    });

    it("click cancel on save or discard dialog", function () {
        let callBacked = false;
        events.subscribe('callBack', () => callBacked = true);
        const SaveOrDiscard = DialogManager.create(SaveOrDiscardDialog, {
            title: 'Warning',
            callBack: () => events.publish('callBack'),
            action: 'to a new design'
        });
        expect($('.ui-dialog-title:contains("Warning")').length).toBe(1);
        $('.ui-button:contains("Cancel")').click();
        expect(callBacked).toEqual(false);
    });
});
