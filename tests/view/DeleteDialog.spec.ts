import {DesignBuilder} from "../design/DesignBuilder";
import DialogManager from "../../src/view/DialogManager";
import DeleteDialog from "../../src/view/DeleteDialog";
import * as $ from "jquery";
import eventDispatcher from "../../src/utils/events";
import {DESIGN_DELETE_COMPLETE} from "../../src/design/events";

describe("DeleteDialog", function () {

    const designUrl = 'http://geppetto.mystix.com/api/v3/design/design/';

    function mockSuccessfulResponse() {
        jasmine.Ajax
            .stubRequest(`${designUrl}1/`)
            .andReturn({
                status: 200,
                contentType: 'application/json',
                responseText: JSON.stringify([])
            });
    }

    beforeEach(function() {
        jasmine.Ajax.install();
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();
    });

    it("sends delete request on click", function () {
        const design = new DesignBuilder()
            .build();
        design.id = 1;

        DialogManager.create(DeleteDialog, {model: design});
        $('.ui-button:contains("Delete")').click();

        expect(jasmine.Ajax.requests.count()).toEqual(1);
        expect(jasmine.Ajax.requests.mostRecent().url).toEqual(`${designUrl}1/`);
        expect(jasmine.Ajax.requests.mostRecent().method).toEqual('DELETE');
    });

    it("triggers delete event on successful delete", function () {
        mockSuccessfulResponse();
        let eventFired = false;
        eventDispatcher.subscribe(DESIGN_DELETE_COMPLETE, () => eventFired = true);

        const design = new DesignBuilder()
            .build();
        design.id = 1;

        DialogManager.create(DeleteDialog, {model: design});
        $('.ui-button:contains("Delete")').click();

        expect(eventFired).toBe(true);
    });
});