import DialogManager from "../../src/view/DialogManager";
import {UploadLogoDialog} from "../../src/logo/UploadLogoDialog";
import {testSvgData} from "../placedlogo/PlacedLogoBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {DesignRevision} from "../../src/design/DesignRevision";

describe('UploadLogoDialog', function () {

    function createDialog(designRev?: DesignRevision): UploadLogoDialog {
        designRev = designRev ? designRev : new DesignRevisionBuilder().build();
        dialog = DialogManager.create(UploadLogoDialog, {
            designRev: designRev,
            modulePosition: {x: 0, y: 0}
        });
        return dialog;
    }

    let dialog = null;

    afterEach(() => {
        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    });

    describe('valid svg file', function () {

        it('adds the logo to the design', function (done) {
            const designRev = new DesignRevisionBuilder().build();
            createDialog(designRev);
            const testFile = new Blob([testSvgData], {type: 'image/svg+xml'});
            spyOn(dialog, 'getUploadedFiles').and.returnValue([testFile]);
            dialog.uploadFile().then(() => {
                expect(designRev.getPlacedLogos().length).toEqual(1);
                done();
            });
        });
    });

    describe('when svg cleaner gives an error', function () {

        it('show a dialog with the error', function (done) {
            spyOn(window, 'alert');
            createDialog();

            // This svg cannot be parsed in to a SVGSVGElement and svg cleaner will give an error
            const testFile = new Blob(['<div></div>'], {type: 'image/svg+xml'});

            spyOn(dialog, 'getUploadedFiles').and.returnValue([testFile]);
            dialog.uploadFile().then(() => {
                expect(window.alert).toHaveBeenCalledWith(jasmine.any(Error));
                done();
            });
        });

    });

    describe('not svg file', function () {
        beforeEach(function () {
            spyOn(window, 'alert');
            createDialog();
        });

        it('detects if file is wrong MIME type', function (done) {
            const testFile = new Blob(['text'], {type: 'text/html'});
            spyOn(dialog, 'getUploadedFiles').and.returnValue([testFile]);
            dialog.uploadFile().then(() => {
                expect(window.alert).toHaveBeenCalledWith('Only SVG files can be uploaded.');
                done();
            });
        });

        it('detects if no file has been uploaded', function (done) {
            dialog.uploadFile().then(() => {
                expect(window.alert).toHaveBeenCalledWith('Please choose a file.');
                done();
            });
        });
    });
});

