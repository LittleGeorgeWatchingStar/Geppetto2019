import {AbstractDialog} from "../../../view/Dialog";
import {InviteNewTab, InviteNewOptions} from "./InviteNewTab";
import {CollaborationManagerOptions, CollaborationManagerTab} from "./CollaborationManagerTab";
import {CollaborationGateway, getCollaborationGateway} from "../CollaborationGateway";
import * as Backbone from "backbone";
import {ServerID} from "../../../model/types";
import {DialogTab, Discardable} from "./DialogTab";
import {MultiTabDialog} from "../../../view/MultiTabDialog";


export interface DesignSharingOptions extends Backbone.ViewOptions<any> {
    designId: ServerID;
    designTitle: string;
    designDescription: string;
}

/**
 * Public DI method for opening a design sharing dialog.
 * @param allowEditOption: Toggle widgets that allow the user to grant edit privileges. True in tests.
 */
export function openShareDialog(options: DesignSharingOptions,
                                allowEditOption=false): DesignShareDialog {

    const collaborationGateway = getCollaborationGateway();

    const shareNewTab = new InviteNewTab({
        designId: options.designId,
        designDescription: options.designDescription,
        collaborationGateway: collaborationGateway,
        allowEditOption: allowEditOption
    } as InviteNewOptions);

    const managerTab = new CollaborationManagerTab({
        designId: options.designId,
        collaborationGateway: collaborationGateway,
        allowEditOption: allowEditOption
    } as CollaborationManagerOptions);

    return new DesignShareDialog({
        tabs: [shareNewTab, managerTab],
        designId: options.designId,
        designTitle: options.designTitle,
        collaborationGateway: collaborationGateway
    } as ShareDialogOptions)
}


interface ShareDialogOptions extends Backbone.ViewOptions<any> {
    tabs: DialogTab<any>[];
    collaborationGateway: CollaborationGateway;
    designId: ServerID;
    designTitle: string;
}

/**
 * Top-level view that renders the tabs for sharing a design or editing collaborations,
 * and allows the user to switch between them.
 */
class DesignShareDialog extends MultiTabDialog {

    private designId: ServerID;
    private collaborationGateway: CollaborationGateway;
    protected currentTab: DialogTab<any> & Discardable;

    get className(): string {
        return 'design-share-dialog';
    }

    initialize(options: ShareDialogOptions) {
        super.initialize(options);
        this.collaborationGateway = options.collaborationGateway;
        this.designId = options.designId;
        this.title(`Share Design: ${options.designTitle}`);
        this.option({
            width: 650,
            minHeight: 550,
            maxHeight: 700,
        });
        this.loadCollaborations();
        return this;
    }

    private loadCollaborations(): void {
        this.collaborationGateway.getCollaborations(this.designId).done((collabs) => {
            for (const tab of this.tabs) {
                tab.setData(collabs);
            }
            this.renderTabButtons();
        });
    }

    protected onChangesSaved(): void {
        this.loadCollaborations();
    }

    protected checkUnsavedChanges(): void {
        this.option({
            beforeClose: () => {
                // Returning false prevents this dialog from closing.
                return this.canNavigate(this.close);
            }
        });
    }

    /**
     * Returns false if there are unsaved changes in the current tab.
     * @param desiredDestination: Callback to 1) close the dialog or 2) navigate to another tab,
     * depending on what the user is trying to do. Activated by discarding changes.
     */
    private canNavigate(desiredDestination: () => void): boolean {
        if (!this.currentTab.hasUnsavedChanges) {
            return true;
        }
        this.currentTab.showUnsavedWarning(desiredDestination);
        return false;
    }

    private onClickTabButton(event): void {
        const $button = $(event.target);
        const tab = this.getTabFromButton($button);
        const desiredDestination = () => {
            this.highlightTabButton($button);
            this.openTab(tab);
        };

        if (!tab.isActive() && this.canNavigate(desiredDestination)) {
            this.highlightTabButton($button);
            this.openTab(tab);
        }
    }

    events() {
        return {
            'click .tab-buttons button': event => this.onClickTabButton(event)
        }
    }
}