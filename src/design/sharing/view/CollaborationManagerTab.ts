import * as Backbone from "backbone";
import {DesignRevision} from "../../DesignRevision";
import * as ManagerTemplate from "templates/design_share/collaboration_manager";
import * as ResendEmailTemplate from "templates/design_share/resend_email";
import {CollaborationGateway} from "../CollaborationGateway";
import {Collaboration} from "../Collaboration";
import DialogManager from "../../../view/DialogManager";
import {Dialog} from "../../../view/Dialog";
import {CollaborationResource, DesignShareEmailResource, UpdateCollaborationResource} from "../api";
import {CollaborationView, CollaborationViewOptions} from "./CollaborationView";
import {DialogTab, Discardable} from "./DialogTab";
import DialogOptions = JQueryUI.DialogOptions;
import {ServerID} from "../../../model/types";


export interface CollaborationManagerOptions extends Backbone.ViewOptions<any> {
    collaborationGateway: CollaborationGateway;
    designId: number;
    allowEditOption: boolean;
}

/**
 * View to manage the existing collaborations for a design.
 */
export class CollaborationManagerTab extends DialogTab<any> implements Discardable {

    private collaborations: Collaboration[];
    private collaborationViews: CollaborationView[];
    private designId: ServerID;
    private collaborationGateway: CollaborationGateway;
    private readonly paginate = 10;
    private numPages: number;
    private currentPage: number;
    private allowEditOption: boolean;
    public hasUnsavedChanges: boolean;

    public initialize(options: CollaborationManagerOptions) {
        this.designId = options.designId;
        this.collaborationGateway = options.collaborationGateway;
        this.allowEditOption = options.allowEditOption;
        this.collaborations = [];
        this.collaborationViews = [];
        return this;
    }

    public get className(): string {
        return "manage-collaborations";
    }

    public get buttonData(): string {
        return "manage-existing";
    }

    public get buttonText(): string {
        return `Manage Existing (${this.collaborations.length}/20)`;
    }

    public showUnsavedWarning(desiredDestination: Function): void {
        this.$('.unsaved-changes').show();
        this.$('.reset').hide();
        this.$('.save-changes').fadeOut(100);
        this.$('.save-changes').fadeIn(200);
        this.$('.discard').off('click').on('click', () => {
            this.resetAll();
            desiredDestination();
        });
    }

    public setData(collaborations: Collaboration[]): void {
        this.hasUnsavedChanges = false;
        this.collaborations = this.sort(collaborations);
        this.render();
    }

    /**
     * Sends deletion/update information to the server.
     */
    private saveChanges(): void {
        if (!this.hasUnsavedChanges) {
            return;
        }

        this.collaborationGateway.updateCollaborations(
            this.designId,
            {collaborations: this.getCollaborationsToUpdate()} as UpdateCollaborationResource
        ).then(() => {
            this.trigger(DialogTab.CHANGES_SAVED);
            this.hasUnsavedChanges = false;
        });
    }

    /**
     * Sort collaborations from newest to oldest by date.
     */
    private sort(collaborations: Collaboration[]): Collaboration[] {
        return collaborations.sort((a, b) => {
            return b.compareCreated(a);
        });
    }

    render(): this {
        this.removeCollabViews();
        if (this.collaborations.length > 0) {
            this.renderCollaborations();
        } else {
            this.renderEmptyMessage();
        }
        return this;
    }

    private renderCollaborations(): void {
        this.$el.html(ManagerTemplate({
            allowEdit: this.allowEditOption
        }));
        this.numPages = 0;
        this.currentPage = 0;
        let counter = 0;
        for (const collaboration of this.collaborations) {
            if (counter % this.paginate === 0) {
                this.addPage();
            }
            counter++;
            this.addCollabView(collaboration);
            this.listenTo(collaboration, 'change', () => this.checkChanges());
        }
        if (this.numPages === 1) {
            this.$('.navigation').hide();
        }
        this.showCurrentPage();
        this.displayWidgetsDefault();
    }

    private renderEmptyMessage(): void {
        this.$el.html(
            `<div class='unavailable-container'>
                <div>
                    <p>This design currently has no collaborators</p>
                    <p>Click 'Share New' to start inviting others</p>
                </div>
             </div>`
        );
    }

    private addPage(): void {
        this.$('table').append(`<tbody data-page="${this.numPages}"></tbody>`);
        this.numPages++;
    }

    private flipPage(direction: number): void {
        const desiredIndex = this.currentPage + direction;
        if (!this.canFlipPage(desiredIndex)) {
            return;
        }
        $('.select-all input').prop('checked', false);
        this.currentPage = desiredIndex;
        this.showCurrentPage();
    }

    private showCurrentPage(): void {
        this.$('table tbody').hide();
        const currentPage = this.currentPageView;
        currentPage.show();
        const showingIndex = (this.currentPage) * this.paginate;
        const numShowing = showingIndex + currentPage.find('tr').length;
        // Eg. "Showing 0-10 of 15"
        this.$('.navigation span').html(`${showingIndex}-${numShowing} of ${this.collaborations.length}`);
    }

    private get currentPageView(): JQuery {
        return this.$('[data-page="' + this.currentPage.toString() + '"]');
    }

    private canFlipPage(desiredIndex: number): boolean {
        return desiredIndex >= 0 && desiredIndex < this.numPages;
    }

    private nextPage(): void {
        this.flipPage(1);
    }

    private previousPage(): void {
        this.flipPage(-1);
    }

    private removeCollabViews(): void {
        for (const view of this.collaborationViews) {
            view.remove();
        }
        this.collaborationViews = [];
    }

    private addCollabView(collaboration: Collaboration): void {
        const view = new CollaborationView({
            model: collaboration,
            allowEditOption: this.allowEditOption
        } as CollaborationViewOptions);

        // Uncheck the 'select all' input when an individual collaboration has been toggled.
        this.listenTo(view, 'selected', () => {
            this.$('.select-all input').prop('checked', false)
        });
        this.collaborationViews.push(view);
        this.$('table tbody').last().append(view.$el);
    }

    private toggleSelectCurrentPage(event): void {
        const $clickedElement = $(event.target);
        const batchSelectInput = this.$('.select-all input');

        // Allow toggle by clicking the area surrounding the checkbox.
        if (!$clickedElement.is('input')) {
            const isChecked = batchSelectInput.prop('checked');
            batchSelectInput.prop('checked', !isChecked);
        }

        const isChecked = batchSelectInput.prop('checked');
        this.currentPageView.find('input[type=checkbox]').prop('checked', isChecked);
    }

    private checkChanges(): void {
        this.hasUnsavedChanges = this.collaborations.some(collaboration => collaboration.hasChanges());
        if (this.hasUnsavedChanges) {
            this.displayWidgetsChanged();
        } else {
            this.displayWidgetsDefault();
        }
        this.trigger('change');
    }

    private displayWidgetsChanged(): void {
        this.$('.save-changes').val('Save changes').addClass('available');
        this.$('.reset').show();
        this.$('.unsaved-changes').hide();
    }

    private displayWidgetsDefault(): void {
        this.$('.reset').hide();
        this.$('.unsaved-changes').hide();
        this.$('.save-changes').val('No changes yet').removeClass('available');
        this.$('.batch-actions .error').hide();
    }

    /**
     * Update is a patch replacement, so we exclude collaborations staged for deletion.
     */
    private getCollaborationsToUpdate(): CollaborationResource[] {
        return this.collaborations
            .filter(collaboration => !collaboration.isDelete)
            .map(collaboration => collaboration.toJSON());
    }

    private resetAll(): void {
        for (const collab of this.collaborationViews) {
            collab.reset();
        }
        this.hasUnsavedChanges = false;
        this.displayWidgetsDefault();
    }

    private applyBatchAction(): void {
        if (this.getSelected().length === 0) {
            this.displayActionError('No collaborators have been selected.');
            return;
        }
        this.$('.batch-actions .error').hide();

        switch (this.$('.batch-actions select').val()) {
            case 'email':
                this.openResendDialog();
                break;
            case 'remove':
                this.applyBatchDelete();
                break;
            case 'view':
                this.applyBatchPermission('view');
                break;
            case 'edit':
                this.applyBatchPermission('edit');
                break;
        }
    }

    private displayActionError(error: string): void {
        this.$('.batch-actions .error').html(error).show();
    }

    private openResendDialog(): void {
        const collaborations = this.collaborationViews
            .filter(view => view.isSelected)
            .map(view => view.collaboration);

        // Server-side limit for emails is 10.
        if (collaborations.length > 10) {
            this.displayActionError(
                `Please select up to 10 collaborators. (${collaborations.length} currently selected.)`
            );
            return;
        }

        new ResendEmailDialog({
            recipients: collaborations,
            collaborationGateway: this.collaborationGateway,
            designId: this.designId
        } as ResendEmailOptions);
    }

    private applyBatchPermission(permission: string): void {
        for (const collabView of this.getSelected()) {
            collabView.unsetDelete();
            collabView.setPermission(permission);
        }
    }

    private applyBatchDelete(): void {
        for (const collabView of this.getSelected()) {
            collabView.setDelete();
        }
    }

    private getSelected(): CollaborationView[] {
        return this.collaborationViews.filter(collab => collab.isSelected);
    }

    remove() {
        this.removeCollabViews();
        return super.remove();
    }

    events() {
        return {
            'click .save-changes': this.saveChanges,
            'click .reset': this.resetAll,
            'click .select-all': this.toggleSelectCurrentPage,
            'click .apply': this.applyBatchAction,
            'click .back': this.previousPage,
            'click .next': this.nextPage
        }
    }
}


export interface ResendEmailOptions extends DialogOptions {
    collaborationGateway: CollaborationGateway;
    recipients: Collaboration[];
    designId: ServerID;
}


export class ResendEmailDialog extends Dialog {
    private recipients: Collaboration[];
    private collaborationGateway: CollaborationGateway;
    private designId: ServerID;

    initialize(options: ResendEmailOptions) {
        super.initialize(options);
        this.collaborationGateway = options.collaborationGateway;
        this.recipients = options.recipients;
        this.designId = options.designId;
        this.alert();
        this.title('Resend Email');
        this.option({
            width: 425,
            minHeight: 400
        });
        this.$el.append(ResendEmailTemplate());
        this.displayRecipients();
        return this;
    }

    /**
     * Displays up to 5 recipients, after which it hides the rest.
     */
    private displayRecipients(): void {
        const max = 5;
        const displayed = this.recipients.map(recipient => recipient.email).slice(0, max);
        this.$('.recipients').append(displayed.join(', '));

        if (this.recipients.length > max) {
            const numOthers = this.recipients.length - max;
            this.$('.recipients').append(`, and ${numOthers} others`);
        }
    }

    private sendEmail(): boolean {
        const sendingDialog = DialogManager.create(Dialog, {title: "Sending"}).waiting();
        this.close();

        this.collaborationGateway.sendEmail(
            this.getEmailResource(),
            this.designId
        ).always((failedRecipients) => {
            this.checkSuccessfulEmail(failedRecipients as CollaborationResource[]);
            sendingDialog.close();
        });

        return false;  // Do not redirect
    }

    private checkSuccessfulEmail(failedRecipients: CollaborationResource[]): void {
        const numFailed = failedRecipients.length;
        const unsuccessfulEmails = failedRecipients.map(recipient => recipient.collaboration_email);
        if (numFailed === 0) {
            DialogManager.create(Dialog, {
                title: "Email sent!",
                html: "Your collaborators should receive their invite soon."
            }).alert();
        } else {
            DialogManager.create(Dialog, {
                title: "Warning",
                html: `<p>We've tried to send your email, but the following addresses were unsuccessful:</p>
                ${unsuccessfulEmails.join('<br/>')}`
            }).alert();
        }
    }

    private getEmailResource(): DesignShareEmailResource {
        const collabResources = this.recipients.map(recipient => recipient.toJSON());
        return {
            message: this.message,
            collaborations: collabResources
        } as DesignShareEmailResource;
    }

    private get message(): string {
        return this.$('textarea').val() as string;
    }

    events() {
        return {
            'click .send-email': this.sendEmail
        }
    }
}