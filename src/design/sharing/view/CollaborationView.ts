import * as Backbone from "backbone";
import * as CollaborationTemplate from "templates/design_share/collaboration";
import {Collaboration} from "../Collaboration";


export interface CollaborationViewOptions extends Backbone.ViewOptions<Collaboration> {
    allowEditOption: boolean;
}

/**
 * Represents a single existing collaborator in the manager view.
 */
export class CollaborationView extends Backbone.View<Collaboration> {

    constructor(options: CollaborationViewOptions) {
        super(options);
    }

    initialize(options: CollaborationViewOptions) {
        this.setElement(CollaborationTemplate({
                collaboration: this.collaboration,
                allowEdit: options.allowEditOption
            })
        );
        this.setPermission(this.collaboration.originalPermission);
        return this.render();
    }

    public get isSelected(): boolean {
        return this.$('input[type=checkbox]').prop('checked');
    }

    public setPermission(permission: string) {
        this.$('select').val(permission);
        this.updatePermission();
    }

    public unsetDelete() {
        this.collaboration.setDelete(false);
        this.render();
    }

    public setDelete() {
        this.collaboration.setDelete(true);
        this.render();
    }

    public reset(): void {
        this.collaboration.setDelete(false);
        this.setPermission(this.collaboration.originalPermission);
        this.render();
    }

    public get collaboration(): Collaboration {
        return this.model;
    }

    /**
     * Allow toggling selection by clicking on the entire row rather than just the checkbox.
     */
    private toggleSelect(event): void {
        // Do not toggle if the user was changing the permission or removal state
        const clickedElement = $(event.target);
        if (this.isClickableTarget(clickedElement)) {
            return;
        }

        if (!clickedElement.is('input[type=checkbox]')) {
            this.setSelected(!this.isSelected);
        }
        this.trigger('selected');
    }

    private setSelected(isSelected: boolean): void {
        this.$('input[type=checkbox]').prop('checked', isSelected);
    }

    private isClickableTarget(target: JQuery): boolean {
        return target.is('select') || target.is('button');
    }

    private toggleDelete(): void {
        this.collaboration.setDelete(!this.collaboration.isDelete);
        this.render();
    }

    /**
     * Display this collaboration as staged for deletion or not.
     */
    render(): this {
        const isDelete = this.collaboration.isDelete;
        this.$el.toggleClass('inactive-js', isDelete);
        this.$('.removed-message').toggle(isDelete);
        this.$('.undo').toggle(isDelete);

        this.$('.permission').toggle(!isDelete);
        this.$('.remove-collaboration').toggle(!isDelete);
        return this;
    }

    private updatePermission(): void {
        const permission = this.$('select').val() as string;
        const validPermissions = [
            Collaboration.VIEW_PERMISSION,
            Collaboration.EDIT_PERMISSION
        ];
        if (validPermissions.indexOf(permission) !== -1) {
            this.collaboration.setPermission(permission);
        }
    }

    events() {
        return {
            click: this.toggleSelect,
            'click .remove-collaboration': this.toggleDelete,
            'click .undo': this.toggleDelete,
            'change select': this.updatePermission
        }
    }
}