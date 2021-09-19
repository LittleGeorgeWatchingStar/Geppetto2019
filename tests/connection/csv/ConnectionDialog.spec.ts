import {createConnection} from "../../../src/connection/Connection";
import * as downloadUtils from "../../../src/utils/download";
import {
    ConnectionDialog,
    UploadCSVDialog
} from "../../../src/connection/csv/ConnectionDialog";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";
import {busResource} from "../../bus/TestBus";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";
import UserController from "../../../src/auth/UserController";
import User from "../../../src/auth/User";


describe("ConnectionDialog", function () {

    function mockProvidedConnection(pm: PlacedModule): void {
        const require = pm.addRequire(busResource());
        const provide = pm.addProvide(busResource());
        spyOnProperty(pm, 'providedConnections').and.returnValue([
            createConnection({
                require: require,
                provide: provide
            })
        ]);
    }

    function mockRequiredConnection(pm: PlacedModule): void {
        const require = pm.addRequire(busResource());
        const provide = pm.addProvide(busResource());
        spyOnProperty(pm, 'requiredConnections').and.returnValue([
            createConnection({
                require: require,
                provide: provide
            })
        ]);
    }

    function mockVlogicConnection(pm: PlacedModule): void {
        const require = pm.addRequire(busResource({name: "VLOGIC"}));
        const provide = pm.addProvide(busResource({name: "VLOGIC"}));
        provide.implementsVlogicTemplate = () => true;
        spyOnProperty(pm, 'requiredConnections').and.returnValue([
            createConnection({
                require: require,
                provide: provide
            })
        ]);
    }

    let dialog = null;

    afterEach(() => {
        if (dialog) {
            dialog.close();
            dialog.remove();
            dialog = null;
        }
    });

    function makeDialog(pm: PlacedModule): ConnectionDialog {
        return new ConnectionDialog({
            model: pm
        });
    }

    describe('render', function () {
        it('disables the download button if there are no connections', function () {
            dialog = makeDialog(new PlacedModuleBuilder().build());
            const downloadButton = $('button:contains("Download CSV")');
            expect(downloadButton.attr('disabled')).toBeTruthy();
        });

        it('enables the download button if there are connections', function () {
            const pm = new PlacedModuleBuilder().build();
            mockProvidedConnection(pm);
            dialog = makeDialog(pm);
            const downloadButton = $('button:contains("Download CSV")');
            expect(downloadButton.attr('disabled')).toBeFalsy();
        });

        it('shows provided connection', function () {
            const pm = new PlacedModuleBuilder().build();
            mockProvidedConnection(pm);
            dialog = makeDialog(pm);
            const numDisplayedProvides = dialog.$('tbody tr').length;
            expect(numDisplayedProvides).toEqual(1);
        });

        it('shows required connection', function () {
            const pm = new PlacedModuleBuilder().build();
            mockRequiredConnection(pm);
            dialog = makeDialog(pm);
            const numDisplayedRequires = dialog.$('tbody tr').length;
            expect(numDisplayedRequires).toEqual(1);
        });

        it('shows the correct header for provided connections table', function () {
            const pm = new PlacedModuleBuilder().build();
            mockProvidedConnection(pm);
            dialog = makeDialog(pm);
            expect(dialog.$('thead').html()).toContain('Providing');
        });

        it('shows the correct header for required connections table', function () {
            const pm = new PlacedModuleBuilder().build();
            mockRequiredConnection(pm);
            dialog = makeDialog(pm);
            expect(dialog.$('thead').html()).toContain('Receiving');
        });

        it("doesn't show VLOGIC connections for regular users", function () {
            const user = new User();
            user.isEngineer = () => false;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const pm = new PlacedModuleBuilder().build();
            mockVlogicConnection(pm);
            dialog = makeDialog(pm);
            expect(dialog.el.innerHTML).not.toContain('VLOGIC');
        });

        it("shows VLOGIC connections for engineers", function () {
            const user = new User();
            user.isEngineer = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const pm = new PlacedModuleBuilder().build();
            mockVlogicConnection(pm);
            dialog = makeDialog(pm);
            expect(dialog.el.innerHTML).toContain('VLOGIC');
        });
    });

    it("attempts to download placed module's connections", function () {
        const pm = new PlacedModuleBuilder().build();
        mockProvidedConnection(pm);
        spyOn(downloadUtils, 'downloadString');
        dialog = makeDialog(pm);
        const downloadButton = $('button:contains("Download CSV")');
        downloadButton.click();
        expect(downloadUtils.downloadString).toHaveBeenCalled();
    });
});

describe('UploadCSVDialog', function () {

    function waitForUpload(): Promise<any> {
        return new Promise(resolve => {
            setTimeout(function () {
                resolve()
            }, 20)
        });
    }

    function getDialog(pm=new PlacedModuleBuilder().build()): UploadCSVDialog {
        return new UploadCSVDialog({
            model: pm,
            connectionDialog: new ConnectionDialog({model: pm})
        } as any);
    }

    function getTestFiles(): Blob[] {
        const testBlob = new Blob(['text']) as any;
        testBlob.name = 'somefile.csv';
        return [<File>testBlob];
    }

    let dialog = null;

    afterEach(() => {
        if (dialog) {
            dialog.close();
            dialog.remove();
            dialog = null;
        }
    });

    it("detects if uploaded file has correct '.csv' extension", function (done) {
        dialog = getDialog();

        spyOn(dialog, 'getUploadedFiles').and.returnValue(getTestFiles());
        const closeSpy = spyOn(dialog, 'close').and.callThrough();
        const submitButton = $('button:contains("Submit")');
        submitButton.click();
        // If the dialog closes, then it was successful.
        waitForUpload().then(() => {
            expect(closeSpy).toHaveBeenCalled();
            done();
        });
    });

    it('closes the ConnectionDialog upon upload completion', function (done) {
        const pm = new PlacedModuleBuilder().build();
        const connectionDialog = new ConnectionDialog({model: pm});
        dialog = new UploadCSVDialog({
            model: pm,
            connectionDialog: connectionDialog
        } as any);
        spyOn(dialog, 'getUploadedFiles').and.returnValue(getTestFiles());
        const closeSpy = spyOn(connectionDialog, 'close').and.callThrough();
        const submitButton = $('button:contains("Submit")');
        submitButton.click();
        waitForUpload().then(() => {
            expect(closeSpy).toHaveBeenCalled();
            connectionDialog.remove();
            done();
        });
    });

    it("displays an error if uploaded file has wrong '.csv' extension", function () {
        dialog = getDialog();
        const testBlob = new Blob(['text']) as any;
        testBlob.name = 'somefile.pdf';
        spyOn(dialog, 'getUploadedFiles').and.returnValue([<File>testBlob]);
        const submitButton = $('button:contains("Submit")');
        submitButton.click();

        expect(dialog.$('.error').html()).toContain('Only CSV files can be uploaded.');
        dialog.close();
    });

    it('displays an error if no file has been uploaded', function () {
        dialog = getDialog();
        const submitButton = $('button:contains("Submit")');
        submitButton.click();

        expect(dialog.$('.error').html()).toContain('Please choose a file.');
        dialog.close();
    });
});
