import * as Backbone from "backbone";
import {DialogTab} from "../design/sharing/view/DialogTab";
import {AbstractDialog} from "./Dialog";


export interface MultiTabDialogOptions extends Backbone.ViewOptions<any> {
    tabs: DialogTab<any>[];
}

/**
 * Dialog that renders multiple tab views, and allows the user to switch between them.
 */
export abstract class MultiTabDialog extends AbstractDialog<any> {

    protected tabs: DialogTab<any>[];
    protected currentTab: DialogTab<any>;

    /**
     * For retrieving the DialogTab when navigating with tab buttons.
     * @see getTabFromButton
     */
    private tabButtonMap: { [buttonData: string]: DialogTab<any> };

    initialize(options: MultiTabDialogOptions): this {
        super.initialize(options);
        this.initializeTabs(options.tabs);
        return this;
    }

    /**
     * If there are unsaved changes on a DialogTab, potentially block the user from leaving.
     */
    protected abstract checkUnsavedChanges();

    /**
     * An action to perform when changes have been sent to the server, eg. close the dialog.
     */
    protected abstract onChangesSaved();

    /**
     * Rerenders navigation buttons completely.
     */
    protected renderTabButtons(): void {
        const tabButtons = this.$('.tab-buttons');
        tabButtons.empty();
        for (const tab of this.tabs) {
            tabButtons.append(this.makeTabButton(tab));
        }
    }

    protected openTab(tab: DialogTab<any>): void {
        this.hideTabs();
        this.currentTab = tab;
        tab.setActive(true);
    }

    protected getTabFromButton($button: JQuery): DialogTab<any> {
        const buttonData = $button.data('nav');
        return this.tabButtonMap[buttonData];
    }

    protected highlightTabButton($button: JQuery): void {
        this.dehighlightTabButtons();
        $button.addClass('current-active');
    }

    protected highlightButtonFromData(data: string): void {
        const button = this.$(`button[data-nav="${data}"]`);
        this.highlightTabButton(button);
    }

    private initializeTabs(tabs: DialogTab<any>[]): void {
        this.tabButtonMap = {};
        this.$el.append('<div class="tab-buttons"></div>');
        this.tabs = tabs;

        for (const tab of this.tabs) {
            this.tabButtonMap[tab.buttonData] = tab;
            this.addTab(tab);
        }
        this.openTab(this.tabs[0]);
        this.renderTabButtons();
    }

    private dehighlightTabButtons(): void {
        this.$('.tab-buttons button').removeClass('current-active');
    }

    private makeTabButton(tab: DialogTab<any>): JQuery {
        const button = tab.navigationButton;
        if (tab.isActive()) {
            button.addClass('current-active');
        }
        return button;
    }

    private addTab(tab: DialogTab<any>): void {
        tab.setActive(false);
        this.$el.append(tab.$el);
        this.listenTo(tab, 'change', this.checkUnsavedChanges);
        this.listenTo(tab, DialogTab.CHANGES_SAVED, this.onChangesSaved);
    }

    private hideTabs(): void {
        for (const tab of this.tabs) {
            tab.setActive(false);
        }
    }

    remove() {
        for (const tab of this.tabs) {
            tab.remove();
        }
        return super.remove();
    }
}
