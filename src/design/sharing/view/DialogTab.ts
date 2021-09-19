import * as Backbone from "backbone";
import {Collaboration} from "../Collaboration";


/**
 * A dialog tab with discardable fields.
 * @deprecated
 */
export interface Discardable {

    /**
     * Whether a change has been staged. If true, it will prevent closing the dialog.
     * Note that this check should only be used if you implement a way to cancel your changes:
     * @see showUnsavedWarning.
     */
    hasUnsavedChanges: boolean;

    /**
     * If there are unsaved changes in the tab, implement a way to discard them.
     */
    showUnsavedWarning: (desiredDestination: Function) => void;
}

/**
 * Has requirements to proceed to the other steps/tabs.
 * @deprecated
 */
export interface Proceedable {
    canProceed: () => boolean;
}


/**
 * Represents a tab in a MultiTabDialog.
 * @see MultiTabDialog
 * @deprecated I regret everything about this file. Just go make a new object then see if you really,
 * really need an abstraction like this.
 */
export abstract class DialogTab<T extends any> extends Backbone.View<any> {

    private active: boolean;

    /**
     * A trigger event for when data has been sent to the server.
     */
    public static CHANGES_SAVED = 'changesSaved';

    /**
     * Is this view visible? As opposed to the other tab(s) in the same dialog.
     */
    public isActive(): boolean {
        return this.active;
    }

    public setActive(isActive: boolean): void {
        this.active = isActive;
        this.$el.toggle(this.active);
    }

    /**
     * Optional. Called by the top-level view to dispense server data to this tab.
     * Currently used to set collaborations in DesignShareDialog.
     */
    public setData(data: any): void {}

    /**
     * Returns a button for rendering in the top navigation.
     */
    public get navigationButton(): JQuery {
        return $(`<button data-nav=${this.buttonData}>
                       ${this.buttonText}
                  </button>`);
    }

    /**
     * Used to map the tab to its navigation button.
     */
    public abstract get buttonData(): string;

    /**
     * The content of the navigation button.
     */
    protected abstract get buttonText(): string;
}
