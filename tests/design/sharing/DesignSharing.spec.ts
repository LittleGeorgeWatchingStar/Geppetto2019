import User from "../../../src/auth/User";
import UserController from "../../../src/auth/UserController";
import {
    DesignSharingOptions,
    openShareDialog
} from "../../../src/design/sharing/view/DesignShareDialog";
import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import {ShareInputView} from "../../../src/design/sharing/view/ShareInputView";
import {Collaboration} from "../../../src/design/sharing/Collaboration";
import {CollaborationView} from "../../../src/design/sharing/view/CollaborationView";

function makeUser(): void {
    const u = new User();
    UserController.init(u);
}

/**
 * Tests for DesignShare view behaviour, excluding those that depend on CollaborationGateway.
 * Otherwise, see CollaborationGateway.spec.
 */
describe("DesignShareDialog", function () {

    function makeDialog() {
        const designRev = new DesignRevisionBuilder()
            .withName("happy balloon world")
            .build();
        return openShareDialog({
            designId: designRev.getDesignId(),
            designTitle: designRev.getDesignTitle(),
            designDescription: designRev.getDescription()
        } as DesignSharingOptions, true);
    }

    let dialog;

    beforeEach(function () {
        makeUser();
        dialog = makeDialog();
    });

    it("has a Share New and Manage Existing tab", function () {
        const hasShareNew = dialog.$('.design-share').length === 1;
        const hasCollabManager = dialog.$('.manage-collaborations').length === 1;
        expect(hasShareNew && hasCollabManager).toBe(true);
    });

    it("shows the Share New tab by default", function () {
        expect(dialog.$('.design-share').is(':visible')).toBe(true);
    });

    it("shows Manage Existing when its tab button is clicked", function () {
        dialog.$('[data-nav="manage-existing"]').click();
        expect(dialog.$('.design-share').is(':visible')).toBe(false);
        expect(dialog.$('.manage-collaborations').is(':visible')).toBe(true);
    });

    it("shows Share New when its tab button is clicked", function () {
        dialog.$('.manage-existing').click();
        dialog.$('.invite-new').click();
        expect(dialog.$('.design-share').is(':visible')).toBe(true);
        expect(dialog.$('.manage-collaborations').is(':visible')).toBe(false);
    });

    it("displays the design title in the dialog title", function () {
        $('body').empty(); // Clear other dialogs first.
        makeDialog();
        expect($('.ui-dialog-title').html()).toContain("happy balloon world");
    });

    describe("Share New", function () {

        it("initializes with a Invitee input", function () {
            expect(dialog.$('.collaboration').length).toEqual(1);
        });

        it("can add invitees by clicking Add Invitee", function () {
            dialog.$('.add-collaboration').click();
            expect(dialog.$('.collaboration').length).toEqual(2);
        });

        it("can remove an invitee by clicking the respective remove button", function () {
            dialog.$('.add-collaboration').click();
            dialog.$('.remove-collaboration').last().click();
            expect(dialog.$('.collaboration').length).toEqual(1);
        });

        it("cannot remove an invitee if it's the only one", function () {
            dialog.$('.remove-collaboration').click();
            expect(dialog.$('.collaboration').length).toEqual(1);
        });

        it("can only have up to ten collaborators", function () {
            for (let i = 0; i < 11; ++i) {
                dialog.$('.add-collaboration').click();
            }
            expect(dialog.$('.collaboration').length).toEqual(10);
        });

        describe("ShareInputView", function () {
            it("can set the permission of the Collaboration", function () {
                const collab = new Collaboration();
                const view = new ShareInputView({
                    model: collab
                });
                view.setPermission('view');
                expect(collab.permission).toEqual('view');
            });

            it("can set the name and email of the Collaboration", function () {
                const collab = new Collaboration();
                const view = new ShareInputView({
                    model: collab
                });
                view.$('.collaborator-name').val('Tazdingo').trigger('change');
                view.$('.collaborator-email').val('tazdingo@yahoo.com').trigger('change');
                expect(collab.name).toEqual('Tazdingo');
                expect(collab.email).toEqual('tazdingo@yahoo.com');
            });
        });

        describe("form submission", function () {

            /**
             * Prevent real ajax requests from being sent.
             */
            beforeEach(function() {
                jasmine.Ajax.install();
            });
            afterEach(function() {
                jasmine.Ajax.uninstall();
            });

            it("shows an error if the name field is empty", function () {
                dialog.$('.send-email').click();
                expect(dialog.$('.collaborator-name').hasClass('ui-state-error')).toBe(true);
            });

            it("shows an error if the email address is missing @", function () {
                const collaboratorNameInput = dialog.$('.collaborator-name');
                const collaboratorEmailInput = dialog.$('.collaborator-email');
                collaboratorNameInput.val("Annoy-o-tron");
                collaboratorEmailInput.val("30000");
                dialog.$('.send-email').click();
                expect(collaboratorEmailInput.hasClass('ui-state-error')).toBe(true);
            });

            it("does not show an error if name and email have been filled sufficiently", function () {
                const collaboratorNameInput = dialog.$('.collaborator-name');
                const collaboratorEmailInput = dialog.$('.collaborator-email');
                collaboratorNameInput.val("Annoy-o-tron");
                collaboratorEmailInput.val("yallowyallowyallow@yallow.com");
                dialog.$('.send-email').click();
                expect(collaboratorNameInput.hasClass('ui-state-error')).toBe(false);
                expect(collaboratorEmailInput.hasClass('ui-state-error')).toBe(false);
            });

            it("shows an error if the message body is empty", function () {
                dialog.$('.collaborator-name').val("Annoy-o-tron");
                dialog.$('.collaborator-email').val("yallowyallowyallow@yallow.com");
                dialog.$('#share-email-message').val("");
                dialog.$('.send-email').click();
                expect(dialog.$('#share-email-message').hasClass('ui-state-error')).toBe(true);
            });

            it("shows an error if there are duplicate collaborators", function () {
                dialog.$('.add-collaboration').click(); // Two collaborators
                dialog.$('.collaborator-name').val("Annoy-o-tron");
                dialog.$('.collaborator-email').val("yallowyallowyallow@yallow.com");
                dialog.$('.send-email').click();
                expect(dialog.$('.collaborator-email').last().hasClass('ui-state-error')).toBe(true);
            });
        });
    });
});

/**
 * Tests for individual existing collaborator views under CollaborationManagerTab.
 */
describe("CollaborationView", function () {

    function getCollaboration(): Collaboration {
        return new Collaboration({
            collaboration_name: "J'Mo",
            collaboration_email: "jmotaz@gumstix.com",
            design_name: "ezpz",
            permission: "edit"
        });
    }

    function getView(collaboration = getCollaboration()): CollaborationView {
        return new CollaborationView({
            model: collaboration,
            allowEditOption: true
        });
    }

    function expectVisible($element: JQuery): void {
        expect($element.css('display')).not.toEqual('none');
    }

    function expectHidden($element: JQuery): void {
        expect($element.css('display')).toEqual('none');
    }

    it("does not show the removed message or undo button by default", function () {
        const view = getView();
        expectHidden(view.$('.removed-message'));
        expectHidden(view.$('.undo'));
    });

    describe("Remove state", function () {
        it("can be triggered by clicking Remove", function () {
            const collab = getCollaboration();
            const view = getView(collab);
            view.$('.remove-collaboration').click();
            expect(collab.isDelete).toBe(true);
        });

        it('appears inactive', function () {
            const view = getView();
            view.$('.remove-collaboration').click();
            expect(view.$el.hasClass('inactive-js')).toBe(true);
        });

        it('shows the removed label', function () {
            const view = getView();
            view.$('.remove-collaboration').click();
            expectVisible(view.$('.removed-message'));
            expectHidden(view.$('.permission'));
        });

        it('shows an undo button', function () {
            const view = getView();
            view.$('.remove-collaboration').click();
            expectVisible(view.$('.undo'));
            expectHidden(view.$('.remove-collaboration'));
        });

        describe("Undo", function () {
            it("can unstage deletion", function () {
                const collab = getCollaboration();
                const view = getView(collab);
                view.$('.remove-collaboration').click();
                view.$('.undo').click();
                expect(collab.isDelete).toBe(false);
            });

            it('no longer appears inactive', function () {
                const view = getView();
                view.$('.remove-collaboration').click();
                view.$('.undo').click();
                expect(view.$el.hasClass('inactive-js')).toBe(false);
            });

            it('reshows the permission', function () {
                const view = getView();
                view.$('.remove-collaboration').click();
                view.$('.undo').click();
                expectHidden(view.$('.removed-message'));
                expectVisible(view.$('.permission'));
            });

            it('reshows the remove-collaboration button', function () {
                const view = getView();
                view.$('.remove-collaboration').click();
                view.$('.undo').click();
                expectHidden(view.$('.undo'));
                expectVisible(view.$('.remove-collaboration'));
            });
        });
    });
});