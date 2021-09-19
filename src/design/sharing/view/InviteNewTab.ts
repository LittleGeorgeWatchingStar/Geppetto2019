import {ViewOptions} from "backbone";
import * as Template from "templates/design_share/design_share_new";
import {ShareInputView} from "./ShareInputView";
import {Collaboration} from "../Collaboration";
import {CollaborationResource, DesignShareEmailResource} from "../api";
import validate from "../../../utils/validate";
import {CollaborationGateway} from "../CollaborationGateway";
import {Dialog} from "../../../view/Dialog";
import DialogManager from "../../../view/DialogManager";
import {DialogTab, Discardable} from "./DialogTab";
import UserController from "../../../auth/UserController";
import {DESIGN_SHARE_COMPLETE, DesignEvent} from "../../events";
import eventDispatcher from 'utils/events';

export interface InviteNewOptions extends ViewOptions<any> {
    collaborationGateway: CollaborationGateway,
    designDescription: string,
    designId: number,
    allowEditOption: boolean
}

/**
 * View to send emails to the potential collaborators of a design.
 */
export class InviteNewTab extends DialogTab<any> implements Discardable {

    private maxInvitees: number;
    private inviteeViews: ShareInputView[];
    private designId: number;
    private messageInput: JQuery;
    private collaborationGateway: CollaborationGateway;
    // You can always abandon work on this tab, so this value never needs to change:
    public hasUnsavedChanges = false;

    public initialize(options: InviteNewOptions) {
        /**
         * You can only send up to 10 emails at once. This maximum gets
         * reassigned when the server request finishes loading, so that
         * rendering the form doesn't have to wait.
         */
        this.maxInvitees = 10;
        this.designId = options.designId;
        this.inviteeViews = [];
        this.collaborationGateway = options.collaborationGateway;
        this.setElement(Template({
            allowEdit: options.allowEditOption
        }));
        this.initMessageInput(options.designDescription);
        this.createInvitee();
        return this;
    }

    public get buttonData(): string {
        return "invite-new";
    }

    public get buttonText(): string {
        return "Invite New";
    }

    /**
     * The server limits 20 total collaborators per design.
     * Restrict invites based on slots remaining, so that users won't find out the hard way.
     */
    public setData(collaborations: Collaboration[]): void {
        const totalServerSlots = 20;
        const remaining = totalServerSlots - collaborations.length;
        this.maxInvitees = Math.min(this.maxInvitees, remaining);
        this.renderInvitesLeft();
        if (this.maxInvitees <= 0) {
            this.renderUnavailableMessage();
        }
    }

    public showUnsavedWarning(): void {
        // No operation. This tab doesn't care if there are unsaved changes.
    }

    private initMessageInput(designDescription: string): void {
        this.messageInput = this.$('#share-email-message');
        this.messageInput.val(
           `--\nBoard Description:\n\n${designDescription}`
        );
    }

    private renderInvitesLeft(): void {
        // Only bother to show remaining inputs if we're running low.
        if (this.inputsRemaining > 5) {
            this.$('.add-collaboration').val(`+ Add Invitee`);
        } else {
            this.$('.add-collaboration').val(`+ Add Invitee (${this.inputsRemaining} left)`);
        }

        if (this.inputsRemaining > 0) {
            this.$('.add-collaboration').show();
        } else {
            this.$('.add-collaboration').hide();
        }
    }

    /**
     * The number of invitation input fields that the user is allowed to add.
     */
    private get inputsRemaining(): number {
        return this.maxInvitees - this.inviteeViews.length;
    }

    private createInvitee(): void {
        if (this.inputsRemaining === 0) {
            return;
        }
        const collaboration = new Collaboration({
            design_id: this.designId,
            permission: this.$('#share-permission').val() as string
        });
        this.addInvitee(collaboration);
        this.renderInvitesLeft();
    }

    private addInvitee(collaboration: Collaboration): void {
        const view = new ShareInputView({model: collaboration});
        this.inviteeViews.push(view);
        this.listenTo(view, 'remove', this.removeInvitee);
        this.$('.collaborations').append(view.el);
    }

    private removeInvitee(view: ShareInputView): void {
        if (this.inviteeViews.length <= 1) {
            return;
        }
        const index = this.inviteeViews.indexOf(view);
        this.inviteeViews.splice(index, 1);
        view.remove();
        this.renderInvitesLeft();
    }

    private submitCollaborations(event): void {
        if (!this.isValidForm()) {
            return;
        }
        const sendingDialog = DialogManager.create(Dialog, {title: "Sending"}).waiting();

        this.collaborationGateway.saveCollaborations(
            this.getEmailResource(),
            this.designId
        ).always(failedRecipients => {
            sendingDialog.close();
            this.trigger(DialogTab.CHANGES_SAVED);
            this.reviewSubmission(failedRecipients as CollaborationResource[]);
        });
        eventDispatcher.publishEvent(DESIGN_SHARE_COMPLETE,
            {designId: this.designId} as DesignEvent);
        this.cancelRedirect(event);
    }

    /**
     * If there were failures, repopulate the inputs with the failed recipients.
     */
    private reviewSubmission(failedRecipients: CollaborationResource[]): void {
        this.clearInvitees();
        if (failedRecipients.length === 0) {
            this.createSuccessDialog();
            this.createInvitee();
            return;
        }
        this.$('.invitees .error').html("Sorry, email couldn't be sent to the following recipients:");
        for (const collabResource of failedRecipients) {
            const collaboration = new Collaboration(collabResource);
            this.addInvitee(collaboration);
        }
    }

    private clearInvitees(): void {
        for (const view of this.inviteeViews) {
            view.remove();
        }
        this.inviteeViews = [];
    }

    private createSuccessDialog(): void {
        DialogManager.create(Dialog, {
            title: "Email sent successfully!",
            html: "Your collaborators should receive their invite soon."
        }).alert();
    }

    private isValidForm(): boolean {
        const isValid = this.validateInviteeFields() && this.validateMessageInput();
        this.$('.invalid-field-message').toggle(!isValid);
        return isValid;
    }

    private validateMessageInput(): boolean {
        const input = this.messageInput[0] as HTMLInputElement;
        const isValid = input.checkValidity();
        this.messageInput.toggleClass('ui-state-error', !isValid);
        return isValid;
    }

    private validateInviteeFields(): boolean {
        let isAllValid = true;
        const checkedEmails = [];
        for (const view of this.inviteeViews) {
            const emailValid = this.isEmailValid(view, checkedEmails);
            view.renderEmailValidity(emailValid);
            checkedEmails.push(view.emailInput);
            const isNameValid = this.checkNameValid(view);

            if (!emailValid || !isNameValid) {
                isAllValid = false;
            }
        }
        return isAllValid;
    }

    /**
     * Returns false if:
     * 1) The email fails the HTML5 validator.
     * 2) The user is sharing a design with themselves.
     * 3) The email is not unique.
     */
    private isEmailValid(view: ShareInputView, checkedEmails: string[]): boolean {
        const currentUserEmail = UserController.getUser().getEmail();
        return view.isEmailInputValid() &&
            view.emailInput !== currentUserEmail &&
            checkedEmails.indexOf(view.emailInput) === -1;
    }

    /**
     * Returns false if the name field is blank.
     */
    private checkNameValid(view: ShareInputView): boolean {
        const isNameValid = validate.isValid(view.nameInput);
        view.renderNameValidity(isNameValid);
        return isNameValid;
    }

    private getEmailResource(): DesignShareEmailResource {
        const collabResources = this.inviteeViews.map(view => view.getCollabResource());
        return {
            message: this.message,
            collaborations: collabResources
        } as DesignShareEmailResource;
    }

    private get message(): string {
        return this.messageInput.val() as string;
    }

    private updatePermissions(): void {
        const permission = this.$('#share-permission').val() as string;
        for (const view of this.inviteeViews) {
            view.setPermission(permission);
        }
    }

    private renderUnavailableMessage(): void {
        this.$el.html(
            `<div class="unavailable-container">
                <div>
                    <p>You've reached the maximum number of invitations.</p>
                    <p>Click 'Manage Existing' to view your collaborators.</p>
                </div>
            </div>`);
    }

    private cancelRedirect(event): void {
        event.preventDefault();
    }

    remove() {
        this.clearInvitees();
        return super.remove();
    }

    events() {
        return {
            'click .add-collaboration': () => this.createInvitee(),
            'click .send-email': event => this.submitCollaborations(event),
            'change #share-permission': () => this.updatePermissions(),
            'submit #design-share-form': event => this.cancelRedirect(event)
        }
    }
}