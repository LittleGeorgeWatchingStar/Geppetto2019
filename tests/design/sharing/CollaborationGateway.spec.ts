import Auth from "../../../src/auth/Auth";
import {CollaborationGateway, getCollaborationGateway} from "../../../src/design/sharing/CollaborationGateway";
import {Collaboration} from "../../../src/design/sharing/Collaboration";
import {openShareDialog} from "../../../src/design/sharing/view/DesignShareDialog";
import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import * as $ from "jquery";
import {
    CollaborationManagerOptions,
    CollaborationManagerTab, ResendEmailDialog, ResendEmailOptions
} from "../../../src/design/sharing/view/CollaborationManagerTab";
import {CollaborationResource} from "../../../src/design/sharing/api";
import User from "../../../src/auth/User";
import UserController from "../../../src/auth/UserController";
import {InviteNewTab, InviteNewOptions} from "../../../src/design/sharing/view/InviteNewTab";


const shareDesignUrl = 'http://geppetto.mystix.com/api/v3/design/share/1/';

function simulateAnonymousUser() {
    spyOn(Auth, "isLoggedIn").and.returnValue(false);
}

/**
 * Resources that imitate information retrieved from the server.
 */
const RESPONSE_DATA = [
    {
        collaboration_name: "J'Mo",
        collaboration_email: "jmotaz@gumstix.com",
        permission: "view",
        date: '2018-06-10'
    },
    {
        collaboration_name: "Huehue",
        collaboration_email: "huehue@hue.com",
        permission: "view",
        date: '2018-06-12'
    }
] as CollaborationResource[];

function mockSuccessfulResponse(): void {
    jasmine.Ajax
        .stubRequest(shareDesignUrl)
        .andReturn({
            status: 200,
            contentType: 'application/json',
            responseText: JSON.stringify(RESPONSE_DATA)
        });
}

function makeDialog() {
    $('body').empty();
    const designRev = new DesignRevisionBuilder()
        .withName("Hallo")
        .withDesignId(1)
        .build();
    return openShareDialog({
        designTitle: designRev.getDesignTitle(),
        designId: designRev.getDesignId(),
        designDescription: designRev.getDescription()
    }, true);
}

function makeInviteTab(collaborationGateway?: CollaborationGateway) {
    const designRev = new DesignRevisionBuilder()
        .withName("Hallo")
        .withDesignId(1)
        .build();
    return new InviteNewTab({
        designDescription: designRev.getDescription(),
        designId: designRev.getDesignId(),
        collaborationGateway: collaborationGateway || getCollaborationGateway(),
        allowEditOption: true
    } as InviteNewOptions);
}

function sendValidForm(collaborationGateway?: CollaborationGateway): InviteNewTab {
    const dialog = makeInviteTab(collaborationGateway);
    makeValidForm(dialog);
    dialog.$('.send-email').click();
    return dialog;
}

function makeValidForm(dialog): InviteNewTab {
    const user = new User({
        email: 'something@something.com'
    });
    UserController.init(user);
    dialog.$('.collaborator-name').val("Annoy-o-tron").trigger('change');
    dialog.$('.collaborator-email').val("yallowyallowyallow@yallow.com").trigger('change');
    dialog.$('#share-email-message').val("Helo ples open my design").trigger('change');
    return dialog;
}

/**
 * Returns Collaborator[] of a specified size for quantity tests.
 */
function getCollaborators(amount: number): Collaboration[] {
    const collabs = [];
    for (let i = 0; i < amount; ++i) {
        collabs.push(new Collaboration({
            collaboration_name: "J'Mo",
            collaboration_email: "jmotaz@gumstix.com",
            permission: "view",
            date: '2018-06-10'
        }));
    }
    return collabs;
}

describe("CollaborationGateway", function () {

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    describe("GET", function () {

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getCollaborationGateway();
            const xhr = gateway.getCollaborations(1);
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(shareDesignUrl).length).toEqual(1);
        });

        it('returns an array of Collaborations', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getCollaborationGateway();
            const designId = 1;
            gateway.getCollaborations(designId).done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(Collaboration));
                });
            });
        });
    });

    describe("POST from Share New Designs", function () {
        it('receives the right JSON', function () {
            const gateway = getCollaborationGateway();
            spyOn(gateway, 'saveCollaborations').and.callFake((emailResource) => {
                expect(emailResource.message).toEqual("Helo ples open my design");
                expect(emailResource.collaborations).toEqual([{
                    collaboration_name: 'Annoy-o-tron',
                    collaboration_email: 'yallowyallowyallow@yallow.com',
                    permission: 'view',
                    date: ''
                }]);
                const def = $.Deferred().resolve([]);
                return def.promise();
            });
            sendValidForm(gateway);
        });

        describe("Successful send", function () {
            function sendSuccessful(): InviteNewTab {
                const gateway = getCollaborationGateway();
                spyOn(gateway, 'saveCollaborations').and.callFake(() => {
                    const def = $.Deferred().resolve([]);
                    return def.promise();
                });
                return sendValidForm(gateway);
            }

            it("reloads with a single empty invitation entry", function () {
                const tab = sendSuccessful();
                expect(tab.$el.find('.collaborator-name').first().val()).toEqual("");
                expect(tab.$el.find('.collaborator-email').first().val()).toEqual("");
            });
        });

        describe("Failed send", function () {

            function sendFailed(): InviteNewTab {
                const gateway = getCollaborationGateway();
                spyOn(gateway, 'saveCollaborations').and.callFake(() => {
                    const def = $.Deferred().resolve([{
                        collaboration_name: "J'Mo",
                        collaboration_email: "jmotaz@gumstix.com",
                        design_title: "ezpz",
                        permission: "view",
                        date: "2018-06-10"
                    }]);
                    return def.promise();
                });
                // The form and response collaborator doesn't match here, but
                // we're just checking that the dialog repopulates inputs.
                return sendValidForm(gateway);
            }

            it("can display failed recipients", function () {
                const tab = sendFailed();
                expect(tab.$el.find('.collaborator-name').first().val()).toEqual("J'Mo");
                expect(tab.$el.find('.collaborator-email').first().val()).toEqual("jmotaz@gumstix.com");
            });

            it("can display an error if there are failed recipients", function () {
                const tab = sendFailed();
                expect(tab.$el.find('.error').html()).toBeTruthy();
            });
        });
    });

    describe("POST from resend email dialog", function () {
        it("receives the right JSON", function () {
            const gateway = getCollaborationGateway();
            const recipient = {
                collaboration_name: 'Annoy-o-tron',
                collaboration_email: 'yallowyallowyallow@yallow.com',
                permission: 'view',
                date: "2018-06-10"
            };
            spyOn(gateway, 'sendEmail').and.callFake((emailResource) => {
                expect(emailResource.message).toEqual("");
                expect(emailResource.collaborations).toEqual([recipient]);
                const def = $.Deferred().resolve([]);
                return def.promise();
            });
            const dialog = new ResendEmailDialog({
                collaborationGateway: gateway,
                recipients: [new Collaboration(recipient)],
                designId: 1
            } as ResendEmailOptions);
            dialog.$el.find('.send-email').click();
        });
    });
});

describe("Share New Tab", function () {

    it("creates Collaborations that innately know what permission they should have", function () {
        const gateway = getCollaborationGateway();
        spyOn(gateway, 'saveCollaborations').and.callFake((emailResource) => {
            const collab = emailResource.collaborations[0];
            expect(collab.permission === Collaboration.EDIT_PERMISSION);
            const def = $.Deferred().resolve([]);
            return def.promise();
        });
        const dialog = makeInviteTab(gateway);
        dialog.$('#share-permission').val('edit').trigger('change');
        makeValidForm(dialog);
        dialog.$('.send-email').click();
    });

    it("restricts the number of invitee inputs based on the server's remaining slots", function () {
        const dialog = makeInviteTab();
        const currentInvites = 15;
        dialog.setData(getCollaborators(currentInvites));
        for (let i = 0; i < 10; ++i) {
            dialog.$('.add-collaboration').click();
        }
        const serverSlots = 20; // Currently the max on the server
        expect(dialog.$('.collaborations tr').length).toEqual(serverSlots - currentInvites);
    });

    it("displays an unavailable page when there are no invites remaining", function () {
        const dialog = makeInviteTab();
        const currentInvites = 20; // Server max
        dialog.setData(getCollaborators(currentInvites));
        const unavailableMessageRendered = dialog.$('.unavailable-container').length === 1;
        expect(unavailableMessageRendered).toBe(true);
    });

    it("does not display an unavailable page when there are invites remaining", function () {
        const dialog = makeInviteTab();
        dialog.setData(getCollaborators(19));
        const unavailableMessageRendered = dialog.$('.unavailable-container').length === 1;
        expect(unavailableMessageRendered).toBe(false);
    });
});


/**
 * CollaborationManagerTab relies on the CollaborationGateway response to render collaborations.
 */
describe("CollaborationManagerTab", function () {

    beforeEach(() => {
        simulateAnonymousUser();
        mockSuccessfulResponse();
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function getManagerView(gateway?: CollaborationGateway): CollaborationManagerTab {
        const collabGateway = gateway ? gateway : getCollaborationGateway();
        const manager = new CollaborationManagerTab({
            designId: 1,
            collaborationGateway: collabGateway,
            allowEditOption: true
        } as CollaborationManagerOptions);
        collabGateway.getCollaborations(1).then((collabs) => {
            manager.setData(collabs);
        });
        manager.setActive(true); // Not loaded by default.
        return manager;
    }

    it('can render collaborations if the tab is opened', function () {
        const dialog = makeDialog();
        dialog.$('.manage-existing').click();
        expect(dialog.$('.manage-collaborations tbody tr').length).toEqual(2);
    });

    it('renders collaborations by newest date to oldest', function () {
        const dialog = makeDialog();
        dialog.$('.manage-existing').click();
        const firstListedName = dialog.$('.manage-collaborations tbody .name').first().html();
        const secondListedName = dialog.$('.manage-collaborations tbody .name').last().html();
        expect(firstListedName).toEqual('Huehue'); // Made on 2018-06-12
        expect(secondListedName).toEqual("J'Mo"); // Made on 2018-06-10
    });

    it('can paginate more than 10 collaborations', function () {
        const manager = new CollaborationManagerTab({
            designId: 1,
            collaborationGateway: getCollaborationGateway(),
            allowEditOption: true
        } as CollaborationManagerOptions);
        manager.setData(getCollaborators(12));
        expect(manager.$('tbody').length).toEqual(2);
    });

    it('rerenders properly after being updated', function () {
        const manager = new CollaborationManagerTab({
            designId: 1,
            collaborationGateway: getCollaborationGateway(),
            allowEditOption: true
        } as CollaborationManagerOptions);
        manager.setData(getCollaborators(12));
        manager.setData(getCollaborators(12));
        expect(manager.$('tbody').first().css('display')).not.toEqual('none');
    });

    describe("Save changes button", function () {

        it("appears disabled by default", function () {
            const manager = getManagerView();
            expect(manager.$('save-changes').hasClass('available')).toBe(false);
        });

        describe("On click", function () {
            it('does not send a request if there were no changes', function () {
                const gateway = getCollaborationGateway();
                const manager = getManagerView(gateway);

                const updateSpy = spyOn(gateway, 'updateCollaborations').and.callFake(() => {
                    const def = $.Deferred().resolve();
                    return def.promise();
                });
                manager.$('.save-changes').click();
                expect(updateSpy).not.toHaveBeenCalled();
            });

            it('can send a request to PATCH collaborations', function () {
                const gateway = getCollaborationGateway();
                const manager = getManagerView(gateway);

                const updateSpy = spyOn(gateway, 'updateCollaborations').and.callFake(() => {
                    const def = $.Deferred().resolve();
                    return def.promise();
                });
                manager.$('.remove-collaboration').first().click();
                manager.$('.save-changes').click();
                expect(updateSpy).toHaveBeenCalled();
            });

            it('outputs the right JSON in the PATCH request', function () {
                const gateway = getCollaborationGateway();
                const manager = getManagerView(gateway);

                spyOn(gateway, 'updateCollaborations').and.callFake((design_id, resource) => {
                    expect(resource.collaborations).toEqual([
                            {
                                collaboration_name: "J'Mo",
                                collaboration_email: "jmotaz@gumstix.com",
                                permission: "edit",
                                date: '2018-06-10'
                            }
                        ]
                    );
                    const def = $.Deferred().resolve();
                    return def.promise();
                });
                manager.$('tbody select').last().val('edit').trigger('change'); // Edit J'Mo
                manager.$('.remove-collaboration').first().click(); // Delete Huehue
                manager.$('.save-changes').click();
            });
        });
    });

    describe("Selection", function () {

        it('can select all collaborations with the Select All checkbox', function () {
            const manager = getManagerView();
            manager.$('.select-all input').click();
            expect(manager.$('input[type=checkbox]').prop('checked')).toBe(true);
        });

        it('can hide all collaborations by checking the Select All checkbox again', function () {
            const manager = getManagerView();
            manager.$('.select-all input').click();
            manager.$('.select-all input').click();
            expect(manager.$('input[type=checkbox]').prop('checked')).toBe(false);
        });

        it('Select All checkbox deselects itself when an individual option has changed', function () {
            const manager = getManagerView();
            manager.$('.select-all input').click();
            manager.$('tbody tr').first().click();
            expect(manager.$('.select-all input').prop('checked')).toBe(false);
        });
    });

    describe("Batch action", function () {

        it('can stage selected collaborators for removal', function () {
            const manager = getManagerView();
            manager.$('tbody tr').first().click();
            manager.$('.batch-actions select').val('remove').trigger('change');
            manager.$('.apply').click();
            expect(manager.$('tbody tr').first().hasClass('inactive-js')).toBe(true);
            // Check that it didn't affect the unselected collab:
            expect(manager.$('tbody tr').last().hasClass('inactive-js')).toBe(false);
        });

        it('can change the permission of selected collaborators', function () {
            const manager = getManagerView();
            manager.$('tbody tr').first().click();
            manager.$('.batch-actions select').val('edit').trigger('change');
            manager.$('.apply').click();
            expect(manager.$('.permission select').first().val()).toEqual('edit');
            // Check that it didn't affect the unselected collab:
            expect(manager.$('.permission select').last().val()).toEqual('view');
        });
    });

    describe("Unsaved changes state", function () {

        function getDirtyDialog() {
            const dialog = makeDialog();
            dialog.$('[data-nav="manage-existing"]').click();
            dialog.$('.remove-collaboration').click();
            return dialog;
        }

        it('is triggered by deleting a collaboration', function () {
            const manager = getManagerView();
            manager.$('.remove-collaboration').click();
            expect(manager.hasUnsavedChanges).toBe(true);
        });

        it('is triggered by changing a permission', function () {
            const manager = getManagerView();
            manager.$('select').val('edit').trigger('change');
            expect(manager.hasUnsavedChanges).toBe(true);
        });

        it('renders reset button and allows "Save changes" to become available', function () {
            const manager = getManagerView();
            manager.$('.remove-collaboration').click();
            expect(manager.$('.reset').css('display')).toEqual('block');
            expect(manager.$('.save-changes').hasClass('available')).toBe(true);
        });

        it('prevents navigation to the ShareNew tab', function () {
            const dialog = getDirtyDialog();
            dialog.$('.invite-new').click();
            expect(dialog.$('.design-share').css('display')).toEqual('none');
            expect(dialog.$('.manage-collaborations').css('display')).toEqual('block');
        });

        it('prevents closing the dialog', function () {
            getDirtyDialog();
            $('.ui-dialog-titlebar-close').click();
            const dialogExists = $('.design-share-dialog').length === 1;
            expect(dialogExists).toBe(true);
        });

        it('shows a warning when the user tries to navigate away', function () {
            const dialog = getDirtyDialog();
            $('.ui-dialog-titlebar-close').click();
            expect(dialog.$('.unsaved-changes').css('display')).toEqual('block');
        });

        it('can be reverted by changing the collaborations back to their original setting', function () {
            const manager = getManagerView();
            manager.$('.remove-collaboration').click();
            manager.$('.undo').click();
            manager.$('select').val('edit').trigger('change');
            // Fixture default is view permission:
            manager.$('select').val('view').trigger('change');
            expect(manager.hasUnsavedChanges).toBe(false);
            expect(manager.$('.unsaved-changes').css('display')).toEqual('none');
            expect(manager.$('.save-changes').hasClass('available')).toBe(false);
        });

        describe("Discard button click", function () {

            it("moves to the ShareNew tab if the user had tried to access it prior", function () {
                const dialog = getDirtyDialog();
                dialog.$('[data-nav="invite-new"]').click();
                dialog.$('.discard').click();
                expect(dialog.$('.design-share').css('display')).toEqual('block');
                expect(dialog.$('.manage-collaborations').css('display')).toEqual('none');
            });

            it("closes the dialog if the user had tried to close it prior", function () {
                const dialog = getDirtyDialog();
                $('.ui-dialog-titlebar-close').click();
                dialog.$('.discard').click();
                const dialogExists = $('.design-share-dialog').length > 0;
                expect(dialogExists).toBe(false);
            });
        });

        describe("Reset", function () {

            it('is invisible if there are no changes', function () {
                const manager = getManagerView();
                expect(manager.$('.reset').css('display')).toBe('none'); // Check visibility on initial render
                manager.$('.remove-collaboration').click();
                manager.$('.undo').click();
                expect(manager.$('.reset').css('display')).toBe('none');
            });

            it('undoes changes', function () {
                const manager = getManagerView();
                manager.$('.remove-collaboration').click();
                manager.$('select').val('edit').trigger('change');
                manager.$('.reset').click();
                expect(manager.hasUnsavedChanges).toBe(false);
                // Fixture default is view permission:
                expect(manager.$('select').val()).toEqual('view');
                expect(manager.$('.inactive-js').length).toEqual(0);
            });

            it('allows navigation to the ShareNew tab', function () {
                const dialog = getDirtyDialog();
                dialog.$('.reset').click();
                dialog.$('[data-nav="invite-new"]').click();
                expect(dialog.$('.design-share').css('display')).toEqual('block');
                expect(dialog.$('.manage-collaborations').css('display')).toEqual('none');
            });

            it('allows closing the dialog', function () {
                const dialog = getDirtyDialog();
                dialog.$('.reset').click();
                $('.ui-dialog-titlebar-close').click();
                const dialogExists = $('.design-share-dialog').length > 0;
                expect(dialogExists).toBe(false);
            });

            it('disables save changes button', function () {
                const gateway = getCollaborationGateway();
                const manager = getManagerView(gateway);

                const updateSpy = spyOn(gateway, 'updateCollaborations').and.callFake(() => {
                    const def = $.Deferred().resolve();
                    return def.promise();
                });
                manager.$('.remove-collaboration').click();
                manager.$('.reset').click();
                manager.$('.save-changes').click();
                expect(updateSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe("When empty", function () {
        it('renders an empty message', function () {
            const manager = getManagerView();
            manager.setData([]);

            const tableRendered = manager.$('.table').length > 0;
            const emptyMessageRendered = manager.$('.unavailable-container').length > 0;
            expect(tableRendered).toEqual(false);
            expect(emptyMessageRendered).toEqual(true);
        });
    });
});