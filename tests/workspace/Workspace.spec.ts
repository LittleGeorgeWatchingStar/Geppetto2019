import {Workspace} from "../../src/workspace/Workspace";
import * as $ from "jquery";

describe("Workspace", function () {

    describe("initial zoom", function () {
        it("is 0.6 by default", function () {
            const workspace = new Workspace(true, true);
            expect(workspace.getZoom()).toEqual(0.6);
        });

        it("is 0.8 when touch mode is available", function () {
            $('body').addClass('touch-mode-js');
            const workspace = new Workspace(true, true);
            expect(workspace.getZoom()).toEqual(0.8);
        });
    });

    describe("design revision", function () {
        it("is undefined by default", function () {
            const workspace = new Workspace(true, true);
            expect(workspace.hasOwnProperty('designRevision')).toBeFalsy();
        });
    });
});
