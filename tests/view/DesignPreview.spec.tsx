import {DesignBuilder} from "../design/DesignBuilder";
import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";
import DeleteDialog from "../../src/view/DeleteDialog";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import * as $ from "jquery";
import {DESIGN_DELETE_COMPLETE, DesignRequestEvent} from "../../src/design/events";
import {AUTODOC, DEVICE_TREE} from "../../src/toolbar/events";
import * as Backbone from "backbone";
import {overrideDesignRevision} from "../design/TestDesign";
import {
    ExpandedDesignDialog,
    ExpandedDesignDialogOptions
} from "../../src/design/designpreview/ExpandedDesignDialog";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {Library} from "../../src/module/Library";
import {PROCESSOR} from "../../src/module/Category";
import {MarketingFeature} from "../../src/module/api";
import * as React from "react";
import * as ReactTestUtils from "react-dom/test-utils";
import * as ReactDOM from "react-dom";
import {DesignPreview} from "../../src/view/dashboard/DesignPreview";
import eventDispatcher from "../../src/utils/events";
import {ModuleEvent} from "../../src/module/events";
import {DASHBOARD_ACTION} from "../../src/view/events";
import {LibraryController} from "../../src/module/LibraryController";
import {Module} from "../../src/module/Module";


export function getMarketingIcon(): MarketingFeature {
    return {
        name: 'Some emblem',
        image_uri: 'auehauhehauehauheauhue',
        value: '',
        description: ''
    } as MarketingFeature;
}

describe("DesignPreview", function () {

    function makeUser(): void {
        const u = new User();
        UserController.init(u);
    }

    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.clear();
    });

    function makeDesignPreview(design) {
        ReactDOM.render(<DesignPreview design={design}
                                       url={'dashboard/my-designs'}
                                       library={new Library()}/>,
            container);
    }

    it("defaults its image_url to the Design's image_url", function () {
        const design = new DesignBuilder().withImageUrl('cool-image.jpg').build();
        makeUser();
        makeDesignPreview(design);
        const url = container.querySelector('.preview-image').getAttribute('src');
        expect(url).toEqual('cool-image.jpg');
    });

    it("re-renders when its Design's image URL has changed", function () {
        const design = new DesignBuilder().withImageUrl('cool-image.jpg').build();
        makeUser();
        makeDesignPreview(design);
        design.set('image_url', "new.jpg");
        makeDesignPreview(design);
        const url = container.querySelector('.preview-image').getAttribute('src');
        expect(url).toEqual('new.jpg');
    });

    it("clicking the design preview can invoke its onClick callback", function () {
        const design = new DesignBuilder().withId(5).build();
        makeUser();
        makeDesignPreview(design);
        let called = false;
        eventDispatcher.subscribe(DASHBOARD_ACTION, (event: ModuleEvent) => {
            called = true;
        });
        ReactTestUtils.Simulate.click(container.querySelector('.design-preview'));
        expect(called).toBe(true);
    });

    describe("Set public", function () {
        it("updates correctly", function () {
            const design = new DesignBuilder().withImageUrl('cool-image.jpg').build();
            makeUser();
            makeDesignPreview(design);
            expect(container.querySelector('.public a')).toBeNull();
            design.set('public', true);
            makeDesignPreview(design);
            expect(container.querySelector('.public a')).not.toBeNull();
        });

        it("makes its onClick callback still available", function () {
            const design = new DesignBuilder()
                .withId(5)
                .build();
            makeUser();
            design.set('public', true);
            makeDesignPreview(design);
            let called = false;
            eventDispatcher.subscribe(DASHBOARD_ACTION, (event: ModuleEvent) => {
                called = true;
            });
            ReactTestUtils.Simulate.click(container.querySelector('.design-preview'));
            expect(called).toBe(true);
        });
    });

    describe("Open an existing design", function () {
        it("click open on a dirty design should not trigger call back", function () {
            const u = new User();
            UserController.init(u);
            overrideDesignRevision().setDirty();
            const design = new DesignBuilder()
                .withTitle('used')
                .build();
            makeDesignPreview(design);
            ReactTestUtils.Simulate.click(container.querySelector('.open'));
            expect($('.ui-dialog-title:contains("Open Design")').length).toBe(1);
            $('.ui-button:contains("Cancel")').click();
            // At this point, the invalid argument should not crash the test
            // because the execution got cancelled by clicking the cancel
            // button.
        });

        it("opens the workspace", function () {
            $('body').html('<div class="workspace tabview"></div>');
            const u = new User();
            UserController.init(u);
            overrideDesignRevision().clearDirty();
            const design = new DesignBuilder().build();
            makeDesignPreview(design);
            ReactTestUtils.Simulate.click(container.querySelector('.open'));
            expect($('.workspace').css('display')).not.toEqual('none');
        });
    });

    describe("COM/Processor icon", function () {
        it("can render if the design contains a COM/Processor with an icon address", function () {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            ReactDOM.render(<DesignPreview design={design}
                                           url='dashboard'
                                           library={new Library(modules)}/>, container);
            expect(container.querySelectorAll('.icons img').length).toEqual(1);
        });

        it("does not render if there are no modules in the library", function () {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            makeDesignPreview(design);
            expect(container.querySelectorAll('.icons img').length).toEqual(0);
        });

        it("renders on render() call", function () {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            const lib = new Library();
            lib.set(modules);
            ReactDOM.render(<DesignPreview design={design}
                                           url='dashboard'
                                           library={new Library(modules)}/>, container);
            expect(container.querySelectorAll('.icons img').length).toEqual(1);
        });
    });
});

describe("ExpandedDesignDialog", function () {

    let view = null;
    let getLibraryAsync;

    afterEach(() => {
        if (view) {
            view.remove();
            view = null;
            document.clear();
        }
    });

    function makeLibrary(modules: Module[] = []) {
        getLibraryAsync = new Promise(resolve => {
            resolve(new Library(modules));
        });
        spyOn(LibraryController, 'getLibraryAsync').and.returnValue(getLibraryAsync);
    }

    function makeExpandedDialog(design) {
        view = new ExpandedDesignDialog({
            designId: 1,
            url: 'blah',
            // model: design,
            // library: new Library(),
            showAutoBsp: true,
        } as ExpandedDesignDialogOptions);

        view.setDesign(design);
    }

    describe("Delete a design", () => {
        it("shows delete button if owner and not pushed", (done) => {
            const u = new User();
            UserController.init(u);
            const design = new DesignBuilder()
                .withOwnerId(u.id)
                .withProductUrl('') // Not having product url means it's not pushed
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.delete').length).toEqual(1);
                done();
            });
        });

        it("does not show delete button if not owner", (done) => {
            const u = new User();
            UserController.init(u);
            const design = new DesignBuilder()
                .withOwnerId(1505)
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.delete').length).toEqual(0);
                done();
            });
        });

        it("does not show delete button if is pushed", (done) => {
            const u = new User();
            UserController.init(u);
            const design = new DesignBuilder()
                .withOwnerId(u.id)
                .withProductUrl('https://fake.com') // Having product url means it's pushed
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.delete').length).toEqual(0);
                done();
            });
        });

        it("opens delete dialog when delete is clicked", (done) => {
            const u = new User();
            UserController.init(u);
            const dialogSpy = spyOn(DeleteDialog.prototype, 'initialize');
            const design = new DesignBuilder()
                .withOwnerId(u.id)
                .withProductUrl('') // Not having product url means it's not pushed
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                view.$('.delete').click();
                expect(dialogSpy.calls.count()).toEqual(1);
                done();
            });
        });
    });

    describe("on click AutoBSP", () => {
        it("publishes the DEVICE TREE event with the correct design revision ID", (done) => {
            let incomingID = null;
            eventDispatcher.subscribe(DEVICE_TREE, (event: DesignRequestEvent) => {
                incomingID = event.design_revision_id
            });
            const design = new DesignBuilder().withCurrentRevisionId(5).build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                view.$('.autobsp').click();
                expect(incomingID).toEqual(5);
                done();
            });
        });
    });

    describe("on click Autodoc", () => {
        it("publishes the AUTODOC event with the correct design revision ID", (done) => {
            let incomingID = null;
            eventDispatcher.subscribe(AUTODOC, (event: DesignRequestEvent) => {
                incomingID = event.design_revision_id
            });
            const design = new DesignBuilder().withCurrentRevisionId(5).build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                view.$('.autodoc').click();
                expect(incomingID).toEqual(5);
                done();
            });
        });
    });

    describe("Share design", () => {
        it("appears for designs owned by the user", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$el.find('.share').length).toEqual(1);
                done();
            });
        });

        it("does not appear for designs not owned by the user", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => false);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$el.find('.share').length).toEqual(0);
                done();
            });
        });

        it("triggers a share design dialog for the correct design", (done) => {
            $('body').empty(); // Remove previous dialogs etc.
            const design = new DesignBuilder()
                .withId(5)
                .withTitle("happy balloon world")
                .build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                view.$('.share').click();
                expect($('.design-share-dialog').length).toEqual(1);
                expect($('.ui-dialog-title').html()).toContain("happy balloon world");
                done();
            });
        });
    });

    describe("Save button", () => {
        it("renders for applicable previews", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.save').length).toEqual(1);
                done();
            });
        });

        it("doesn't render when you aren't the design owner", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => false);
            makeLibrary();
            makeExpandedDialog(design);
            getLibraryAsync.then(() => {
                expect(view.$('.save').length).toEqual(0);
                done();
            });
        });

        it("doesn't render when the design has been pushed", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isValidated').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.save').length).toEqual(0);
                done();
            });
        });
    });

    describe("Title", () => {
        it("renders an error when invalid", (done) => {
            makeLibrary();
            makeExpandedDialog(new DesignBuilder().build());

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = '<>';
                ReactTestUtils.Simulate.blur(input);
                const hasError = view.el.querySelector('.name').classList.contains('error');
                expect(hasError).toBe(true);
                done();
            });
        });

        it("resets if blank", (done) => {
            const design = new DesignBuilder()
                .withTitle('Lollipops and sunshine')
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = '';
                ReactTestUtils.Simulate.blur(input);
                expect(view.el.querySelector('.name').value).toEqual('Lollipops and sunshine');
                done();
            });
        });
    });

    describe("Description", () => {
        it("resets if blank", (done) => {
            const design = new DesignBuilder()
                .withDescription('Lollipops and sunshine')
                .build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.description-text');
                input.value = '';
                ReactTestUtils.Simulate.change(input);
                ReactTestUtils.Simulate.blur(input);
                expect(view.el.querySelector('.description-text').value).toEqual('Lollipops and sunshine');
                done();
            });
        });

        it("cannot be edited when the design has been validated", (done) => {
            const design = new DesignBuilder()
                .withProductUrl('cool-page.html') // A validated design has a URL.
                .build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.description-container').prop('tagName')).toBe("DIV");
                expect(view.$('.name-container').prop('tagName')).toBe("DIV");
                done();
            });
        });

        it("cannot be edited when the design doesn't belong to the user", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => false);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.description-container').prop('tagName')).toBe("DIV");
                expect(view.$('.name-container').prop('tagName')).toBe("DIV");
                done();
            });
        });

        it("can be edited for unvalidated designs belonging to the user", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.description-text').prop('tagName')).toBe("TEXTAREA");
                expect(view.$('.name').prop('tagName')).toBe("INPUT");
                done();
            });
        });

        it("has a title tag warning when the design has been validated and belongs to the user", (done) => {
            const design = new DesignBuilder()
                .withProductUrl('cool-page.html') // A validated design has a URL.
                .build();
            spyOn(design, 'isOwnedBy').and.callFake(() => true);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                expect(view.$('.description-container').prop('title')).toBeTruthy();
                done();
            });
        });

        it("does not have a title tag warning when the design doesn't belong to the user", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'isOwnedBy').and.callFake(() => false);
            makeLibrary();
            makeExpandedDialog(design);
            getLibraryAsync.then(() => {
                expect(view.$('.description-container').prop('title')).toBeFalsy();
                done();
            });
        });

        it("does not allow save when the title is invalid", (done) => {
            const design = new DesignBuilder().build();
            const saveSpy = spyOn(design, 'save').and.callThrough();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = '<>';
                ReactTestUtils.Simulate.change(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(saveSpy).not.toHaveBeenCalled();
                done();
            });
        });

        it("allows save when the title is the same as itself", (done) => {
            // In case the description is different.
            const design = new DesignBuilder().withTitle('Mootootoo').build();
            const saveSpy = spyOn(design, 'save').and.callThrough();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'mootootoo';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(saveSpy).toHaveBeenCalled();
                done();
            });
        });
    });

    describe("Details saved", () => {
        it("updates the matching DesignRevision description", (done) => {
            UserController.init(new User());
            const design = new DesignBuilder().withId(5).build();
            const designRev = new DesignRevisionBuilder().withDesignId(5).build();
            overrideDesignRevision(designRev);
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.description-text');
                input.value = 'A test description';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(designRev.getDescription()).toEqual('A test description');
                done();
            });
        });

        it("updates the matching DesignRevision name", (done) => {
            UserController.init(new User());
            const design = new DesignBuilder().withId(5).build();
            const designRev = new DesignRevisionBuilder().withDesignId(5).build();
            overrideDesignRevision(designRev);
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'Title';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(designRev.getDesignTitle()).toEqual('Title');
                done();
            });
        });

        it("doesn't update the DesignRevision if not matching", (done) => {
            UserController.init(new User());
            const design = new DesignBuilder().withId(5).build();
            const designRev = new DesignRevisionBuilder().withDesignId(4).build();
            overrideDesignRevision(designRev);
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'Title';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(designRev.getDesignTitle()).not.toEqual('Title');
                done();
            });
        });

        it("rerenders the design preview inputs", (done) => {
            const container = document.createElement('div');
            const design = new DesignBuilder().build();
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                ReactDOM.render(<DesignPreview design={design}
                                               url={'dashboard/my-designs'}
                                               library={new Library()}/>,
                    container);
                return def.promise();
            });
            ReactDOM.render(<DesignPreview design={design}
                                           url={'dashboard/my-designs'}
                                           library={new Library()}/>,
                container);
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'Title';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(container.querySelector('.name').innerHTML).toEqual('Title');
                ReactDOM.unmountComponentAtNode(container);
                done();
            });
        });

        it("disables the save button once more", (done) => {
            const design = new DesignBuilder().build();
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve();
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'Title';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect(view.el.querySelector('.save').hasAttribute('disabled')).toBe(true);
                done();
            });
        });

        it("updates the expanded view dialog title", (done) => {
            $('body').empty(); // Remove previous dialogs etc.
            const design = new DesignBuilder().build();
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                const input = view.el.querySelector('.name');
                input.value = 'A Miracle';
                ReactTestUtils.Simulate.blur(input);
                ReactTestUtils.Simulate.click(view.el.querySelector('.save'));
                expect($('.ui-dialog-title').html()).toContain("A Miracle");
                done();
            });
        });

        it("closes on DESIGN_DELETE_COMPLETE", (done) => {
            UserController.init(new User());
            const design = new DesignBuilder().withOwnerId(5).build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                eventDispatcher.publish(DESIGN_DELETE_COMPLETE);
                expect($('.ui-dialog').length).toEqual(0);
                done();
            });
        });
    });

    describe("Set public", () => {
        it("opens a confirmation dialog", (done) => {
            const user = new User();
            UserController.init(user);
            const design = new DesignBuilder().withOwnerId(user.id).build();
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                ReactTestUtils.Simulate.click(view.el.querySelector('.public'));
                expect(document.getElementsByClassName('cc-notice').length).toEqual(1);
                done();
            });
        });

        /**
         * TODO This test only seems to work in isolation due to some JQuery Dialog issue.
         */
        xit("updates the preview correctly when confirmed", (done) => {
            const user = new User();
            UserController.init(user);
            const design = new DesignBuilder().withOwnerId(user.id).build();
            spyOn(design, 'save').and.callFake((resource) => {
                design.set(resource);
                const def = $.Deferred().resolve(design);
                return def.promise();
            });
            makeLibrary();
            makeExpandedDialog(design);

            getLibraryAsync.then(() => {
                ReactTestUtils.Simulate.click(view.el.querySelector('.public'));
                // TODO public popup uses the default JQuery Dialog.
                const buttons = document.querySelectorAll('button.ui-button');
                const OK = Array.from(buttons).find(b => b.textContent.toLowerCase().includes('ok'));
                $(OK).trigger('click');
                expect(view.el.querySelector('.publish-details img')).not.toBeNull();
                done();
            });
        });
    });

    describe("Shareable link", () => {
        it("displays the current route", (done) => {
            const design = new DesignBuilder().withId(5).build();
            makeLibrary();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                expect(view.$('.shareable-link textarea').val()).toEqual(window.location.href);
                done();
            });
        });
    });

    describe("On close", () => {
        it("sets the URL path back to the tab's path", (done) => {
            const design = new DesignBuilder().build();
            Backbone.history.start();
            makeLibrary();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);
            const navigateSpy = spyOn(Backbone.history, 'navigate').and.callThrough();

            getLibraryAsync.then(() => {
                view.close();
                expect(navigateSpy).toHaveBeenCalledWith('!/popcorn');
                Backbone.history.stop();
                done();
            });
        });
    });

    describe("COM/processor icon", () => {
        it("can render if there is a processor with an icon address", (done) => {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            makeLibrary(modules);
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
                library: new Library(modules)
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                expect(view.$('.icons img').length).toEqual(1);
                done();
            });
        });
    });

    describe("Module list", () => {
        it("can render", (done) => {
            const modules = [
                new ModuleBuilder().withName("Tweedledee").build()
            ];
            makeLibrary(modules);
            const moduleIds = modules.map(m => m.moduleId);
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                expect(view.$el.html()).toContain("Tweedledee");
                done();
            });
        });

        it("does not render duplicate modules", (done) => {
            const modules = [
                new ModuleBuilder().withModuleId(2).build()
            ];
            const moduleIds = [2, 2, 2];
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            makeLibrary(modules);
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                expect(view.$('.module-list li').length).toEqual(1);
                done();
            });
        });

        it("is empty if there is no library", (done) => {
            makeLibrary();
            const design = new DesignBuilder().build();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                expect(view.$('.module-list').length).toEqual(0);
                done();
            });
        });

        it("render does not refresh the text inputs", (done) => {
            // Wiping possible user changes is not cool
            const u = new User();
            UserController.init(u);
            const design = new DesignBuilder().withOwnerId(u.id).build();
            makeLibrary();
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                const newText = "For the Horde!";
                view.$('input').val(newText);
                view.$('textarea').val(newText);
                view.render();
                expect(view.$('input').val()).toEqual(newText);
                expect(view.$('textarea').val()).toEqual(newText);
                done();
            });
        });

        it("can rerender the module list", (done) => {
            const modules = [
                new ModuleBuilder().withModuleId(3).build()
            ];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            makeLibrary(modules);
            view = new ExpandedDesignDialog({
                designId: design.getId(),
                url: 'popcorn',
                showLink: true,
            } as ExpandedDesignDialogOptions);
            view.setDesign(design);

            getLibraryAsync.then(() => {
                view.render();
                expect(view.$('.module-list').length).toEqual(1);
                done();
            });
        });
    });
});