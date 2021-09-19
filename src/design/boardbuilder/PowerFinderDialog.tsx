import {AbstractDialog, DialogOptions} from "../../view/Dialog";
import {DesignRevision} from "../DesignRevision";
import {PowerFinder, PowerFinderResults} from "./PowerFinder";
import eventDispatcher from "utils/events";
import {Module} from "../../module/Module";
import {POWER_BOARD, PowerBoardEvent} from "../../workspace/events";
import {RemoveModules} from "../../module/actions";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {powerFinderDialog} from "../../toolbar/WorkspaceWidgets";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {PowerFinderDialogContent} from "./PowerFinderDialogContent";
import {PowerPromptDialogContent} from "./PowerPromptDialogContent";


export interface PowerFinderOptions extends DialogOptions<any> {
    designRevision: DesignRevision;
    powerFinder: PowerFinder;
    open3D: boolean;
}

export function openPowerPrompt(): void {
    new PowerPromptDialog({
        modal: false,
        position: {
            my: 'left',
            at: 'center',
            of: '#board'
        }
    }).alert();
}

export class PowerPromptDialog extends AbstractDialog<any> {
    initialize(options) {
        super.initialize(options);
        this.title('Power requirements found');
        this.renderDialogContent();
        return this;
    }

    private renderDialogContent(): void {
        ReactDOM.render(<PowerPromptDialogContent openPowerFinder={() => this.openPowerFinder()}/>, this.el);
    }

    private openPowerFinder(): void {
        powerFinderDialog(true);
        this.close();
    }
}

export class PowerFinderDialog extends AbstractDialog<any> {

    private designRev: DesignRevision;
    private powerFinder: PowerFinder;
    private powerFinderResults: PowerFinderResults;

    /**
     * Removes existing power modules before recalculating a tree with PowerFinder.
     */
    private removePower: RemoveModules;

    /**
     * This controls whether existing power modules are restored on dialog abort.
     * False when the form is submitted.
     */
    private inProgress: boolean;

    /**
     * Should we open the 3D view window after power finding is complete?
     */
    private open3D: boolean;

    initialize(options: PowerFinderOptions) {
        super.initialize(options);
        this.designRev = options.designRevision;
        this.powerFinder = options.powerFinder;
        this.open3D = options.open3D;
        this.inProgress = false;
        this.title('Power Your Modules (Beta)');
        this.renderDialogContent();
        return this;
    }

    private renderDialogContent(): void {
        ReactDOM.render(<PowerFinderDialogContent designRevision={this.designRev}
                                                  powerFinder={this.powerFinder}
                                                  powerFinderResults={this.powerFinderResults}
                                                  closeDialog={this.close}
                                                  setRemoveModules={m => this.setRemoveModules(m)}
                                                  setInProgress={() => this.setInProgress()}
                                                  addPower={s => this.addPower(s)}/>, this.el);
    }

    get className(): string {
        return 'power-finder-dialog';
    }

    onClose(): void {
        if (this.inProgress) {
            this.removePower.reverse();
        }
    }

    private setRemoveModules(modules: PlacedModule[]): void {
        this.removePower = new RemoveModules(modules);
    }

    private setInProgress(): void {
        this.removePower.execute();
        this.inProgress = true;
        this.powerFinder.findPower().then(results => {
            this.powerFinderResults = results;
            this.renderDialogContent();
            this.resize();
        });
    }

    private resize(): void {
        this.option({
            minWidth: 800,
            minHeight: 550
        });
    }

    private addPower(selection: Module[]): void {
        this.inProgress = false;
        this.close();
        // Small delay allows the user to see that something has changed.
        setTimeout(() => {
            eventDispatcher.publishEvent(POWER_BOARD, {
                modules: selection,
                designRevision: this.designRev,
                removeExisting: this.removePower,
                open3D: this.open3D
            } as PowerBoardEvent);
        }, 250);
    }
}