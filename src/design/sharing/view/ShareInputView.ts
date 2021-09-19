import * as Backbone from "backbone";
import {Collaboration} from "../Collaboration";
import * as Template from "templates/design_share/collaboration_input";
import {CollaborationResource} from "../api";

/**
 * An input entry for adding an invitee to InviteNewTab.
 */
export class ShareInputView extends Backbone.View<Collaboration> {

    get className() {
        return 'collaboration';
    }

    get tagName() {
        return 'tr';
    }

    initialize() {
        this.$el.html(Template());
        this.$('.collaborator-name').val(this.collaboration.name);
        this.$('.collaborator-email').val(this.collaboration.email);
        this.render();
        return this;
    }

    public get collaboration(): Collaboration {
        return this.model;
    }

    public getCollabResource(): CollaborationResource {
        return this.collaboration.toJSON();
    }

    public get nameInput(): string {
        return this.$('.collaborator-name').val().toString();
    }

    public get emailInput(): string {
        return this.$('.collaborator-email').val().toString();
    }

    /**
     * The HTML5 e-mail input checks for an '@' in the field. The :valid pseudo-class is false when '@' is absent.
     * Not a comprehensive validator.
     */
    public isEmailInputValid(): boolean {
        return this.$('.collaborator-email').is(':valid');
    }

    public renderEmailValidity(isValid: boolean): void {
        this.$('input[type=email]').toggleClass('ui-state-error', !isValid);
    }

    public renderNameValidity(isValid: boolean): void {
        this.$('input[type=text]').toggleClass('ui-state-error', !isValid);
    }

    public setPermission(permission: string): void {
        this.model.setPermission(permission);
    }

    private updateName(event): void {
        this.collaboration.setName(event.target.value);
    }

    private updateEmail(event): void {
        this.collaboration.setEmail(event.target.value);
    }

    private triggerRemove(): void {
        this.trigger('remove', this);
    }

    events() {
        return {
            'click .remove-collaboration': this.triggerRemove,
            'change .collaborator-name': this.updateName,
            'change .collaborator-email': this.updateEmail
        }
    }
}