import UserController from "auth/UserController";
import * as Backbone from "backbone";
import errorHandler from "controller/ErrorHandler";
import {Design} from "design/Design";
import {DesignRevisionGateway, getDesignRevisionGateway} from "./DesignRevisionGateway";
import {DesignRevision} from "design/DesignRevision";
import {
    CURRENT_DESIGN_SET,
    DIRTY_STATUS_CHANGED,
    DESIGN_CLONE,
    DESIGN_NEW,
    DESIGN_OPEN,
    DESIGN_SAVE_COMPLETE,
    DesignRequestEvent,
    REVISION_LOADED,
    SAVE3D,
    SAVING_STATE_CHANGED, DESIGN_UPREV_COMPLETE
} from "design/events";
import * as lockedTemplate from "templates/locked";
import {START_UPREV} from "toolbar/events";
import events from "utils/events";
import {Dialog} from "view/Dialog";
import {SaveAsDialog} from "view/SaveAsDialog";
import DialogManager from "../view/DialogManager";
import {ServerID} from "../model/types";
import {getDesignGateway} from "./DesignGateway";
import {FetchDesignParams} from "./api";
import {DesignValidator} from "./DesignValidator";
import {LoginPromptDialog} from "../view/LoginPromptDialog";
import {ACTION_EXECUTED, ACTION_REVERSED} from "../placedmodule/events";


let currentDesign: DesignRevision = null;
let orderTimeout;

/**
 * Methods to create designs. (Actually DesignRevision, but Geppetto Web is only concerned with the
 * latest revision of a design.)
 *
 * There is only ever one design open at once.
 */
export class DesignController {
    static getCurrentDesign(): DesignRevision | null {
        return currentDesign;
    }

    static isSaving(): boolean {
        const design = DesignController.getCurrentDesign();
        return design && design.isSaving();
    }

    static hasUnsavedChanges(): boolean {
        const design = DesignController.getCurrentDesign();
        return design && design.isDirty();
    }

    static isDesignUnsaved(): boolean {
        const design = DesignController.getCurrentDesign();
        return design && (design.isDirty() || design.isNew());
    }

    static fetchDesigns(parameters: FetchDesignParams): JQuery.jqXHR<Design[]> {
        return getDesignGateway().getDesigns(parameters);
    }

    static fetchDesign(id: ServerID): JQuery.jqXHR<Design> {
        return getDesignGateway().getDesign(id);
    }

    static createNewDesign(): void {
        const design = new DesignRevision();
        setCurrentDesign(design);
        design.initializePlacedItems();
        design.dimensionBoard();
        events.publish(DESIGN_NEW);
    }

    static validate(): void {
        DesignValidator.of(DesignController.getCurrentDesign()).validate();
    }

    /**
     * Overwrite the currently opened design.
     */
    static save(saving3D?: boolean, callback?): void {
        DesignSaver.of(DesignController.getCurrentDesign()).save(saving3D, callback);
        DesignController.getCurrentDesign().updateEmptySavedDesignStatus();
        savedCorrectDesignOrderIndicator();
    }

    static saveAs(): void {
        DesignSaver.of(DesignController.getCurrentDesign()).promptSaveAs();
    }

    /**
     * If the DesignPreview title or description has been changed, make sure the current DesignRevision
     * is up to date (if it matches the design in question).
     */
    static checkRevisionDetailsUpdate(updatedDesign: Design): void {
        const current = DesignController.getCurrentDesign();
        if (updatedDesign.getId() === current.getDesignId()) {
            current.setDesignTitle(updatedDesign.getTitle());
            current.setDescription(updatedDesign.getDescription());
        }
    }

    /**
     * If a deleted design was the currently open one, create a new design.
     */
    static checkDeletedDesign(deletedId: ServerID): void {
        if (deletedId === DesignController.getCurrentDesign().getDesignId()) {
            DesignController.createNewDesign();
        }
    }
}


/**
 * For opening or cloning a design (revision).
 */
export class DesignLoader {
    constructor(private readonly revisionId: ServerID | string,
                private readonly gateway: DesignRevisionGateway) {
    }

    public static of(revisionId: ServerID | string,
                     gateway = getDesignRevisionGateway()): DesignLoader {
        return new DesignLoader(revisionId, gateway);
    }

    public open(): void {
        const dialog = DialogManager.create(Dialog, {title: 'Opening'}).waiting();
        const design = DesignController.getCurrentDesign();
        if (design) {
            design.unload();
        }
        const onLoadFinish = designRev => {
            this.publishDesignEvent(DESIGN_OPEN);
            Backbone.history.navigate(`!${designRev.getPermalinkBase()}`);
            dialog.close();
            if (designRev.hasMissingModule()) {
                DesignLoader.missingDialog();
            } else if (designRev.hasUpgradedModule()) {
                DesignLoader.upgradedDialog();
            }
        };
        this.loadDesignRevision(onLoadFinish);
    }

    public clone(): void {
        const dialog = DialogManager.create(Dialog, {
            title: 'Copying the design to your workspace',
        }).waiting();
        const onLoadFinish = designRev => {
            this.publishDesignEvent(DESIGN_CLONE);
            dialog.title('Copied the design to your workspace');

            let message = 'Please remember to save your design.';
            const isCreatedBeforePathSpecs = designRev.isCreatedBeforePathSpecs();
            if (isCreatedBeforePathSpecs) {
                message += ' The path constraints feature has been implemented since the original design was created, this may affect your design.';
            }
            dialog.textAndOk(message);

            designRev.markAsNew();
            designRev.setPublic(false);
            setDirtyDesign();

            if (isCreatedBeforePathSpecs) {
                designRev.computePathIntersections();
            }
        };
        this.loadDesignRevision(onLoadFinish);
    }

    /**
     * Loads design revision from gateway and sets to design revision currently being edited.
     */
    private loadDesignRevision(onLoadFinish: (DesignRevision) => void): void {
        this.gateway.getDesignRevision(this.revisionId).then(revision => {
            setCurrentDesign(revision);
            revision.initializePlacedItems().then(() => {
                onLoadFinish(revision);
                events.publish(REVISION_LOADED);
            });
        });
    }

    private publishDesignEvent(eventName: string): void {
        events.publishEvent(eventName, {
            design_revision_id: this.revisionId
        } as DesignRequestEvent);
    }

    private static missingDialog(): void {
        DialogManager.create(Dialog, {
            title: 'Warning',
            html: 'Some modules are obsolete and were not loaded.'
        }).alert();
    }

    private static upgradedDialog(): void {
        DialogManager.create(Dialog, {
            title: 'Warning',
            html: 'Some modules have been updated to the latest revision.'
        }).alert();
    }
}


/**
 * For overwriting, branching, or first-time saving a design.
 */
export class DesignSaver {

    constructor(private readonly design: DesignRevision) {
    }

    public static of(design: DesignRevision): DesignSaver {
        return new DesignSaver(design);
    }

    public save(saving3D?: boolean, callback?: () => void) {
        if (this.hasSaveError(saving3D, callback)) {
            return;
        }
        const proceed = () => {
            setSaving(this.design);
            const dialog = DialogManager.create(Dialog, {title: 'Saving'}).waiting();
            this.design.save()
                .done(() => {
                    if (callback) {
                        callback();
                    }
                    this.completeSave();
                })
                .fail(errorHandler.onFail)
                .always(() => {
                    dialog.close();
                    clearSaving(this.design);
                });
        };
        if (this.design.isOwner(UserController.getUser())) {
            proceed();
            return;
        }
        DialogManager.create(Dialog, {
            title: 'Warning',
            html: 'This design does not belong to you. Overwrite anyway?'
        }).confirm(proceed, () => {
        });
    }

    public promptSaveAs(): void {
        if (!UserController.getUser().isLoggedIn()) {
            this.promptLogin();
            return;
        }
        const designRev = this.design.clone();
        designRev.markAsNew();
        DialogManager.create(SaveAsDialog, {
            model: designRev
        });
    }

    /**
     * When a user saves a design for the first time.
     * @param save3D: Should we open the 3D preview dialog? False if the user is logging out.
     */
    public initialDesignSave(save3D?: boolean, callback?: () => void): void {
        const design = this.design;
        setSaving(design);
        const dialog = DialogManager.create(Dialog, {title: 'Saving'}).waiting();
        const designSummary = this.initializeNewDesign(design);
        designSummary.save()
            .done(resource => {
                setCurrentDesign(design);
                design.setId(resource.current_revision.id);
                design.setDesignId(resource.id);
                Backbone.history.navigate(`!${design.getPermalinkBase()}`);
                if (design.getImageContents() || save3D) {
                    design.saveImage(design.getImageContents());
                }
                if (save3D) {
                    events.publish(SAVE3D, {design_revision: design});
                }
                if (callback) {
                    callback();
                }
                this.completeSave(true);
            })
            .fail(errorHandler.onFail)
            .always(() => {
                clearSaving(design);
                dialog.close();
            });
    }

    /**
     * True if anything would prevent immediate overwrite of the design.
     */
    private hasSaveError(saving3D?: boolean,
                         callback?: () => void): boolean {
        if (!UserController.getUser().isLoggedIn()) {
            this.promptLogin();
            return true;
        }
        const design = this.design;
        if (design.isNew()) {
            DialogManager.create(SaveAsDialog, {
                model: design,
                callBack: callback
            });
            return true;
        }
        if (design.isPushed()) {
            this.lockedDialog();
            return true;
        }
        if (!design.hasImage() && saving3D) {
            events.publish(SAVE3D, {design: design});
            return true;
        }
        return false;
    }

    /**
     *  When saving the first time, we have to save both a Design and design
     *  revision. This step is not needed on subsequent saves, as the design
     *  already exists.
     */
    private initializeNewDesign(designRev: DesignRevision): Design {
        const design = new Design();
        design.setTitle(designRev.getDesignTitle());
        design.setDescription(designRev.getDescription());
        design.setCurrentRevision(designRev);
        design.setPublic(designRev.getPublic());
        return design;
    }

    private completeSave(isNewDesign = false): void {
        events.publishEvent(DESIGN_SAVE_COMPLETE, {
            isNewDesign: isNewDesign,
        });
    }

    /**
     * Create a dialog that says this design has already been pushed to the store.
     */
    private lockedDialog(): void {
        const design = this.design;
        const dialog = DialogManager.create(Dialog, {
            title: 'Design Locked',
            html: lockedTemplate({
                title: design.getDesignTitle(),
                product_url: design.getProductUrl()
            }),
            model: design
        });
        dialog.buttons([
            dialog.makeButton('Save as', () => this.promptSaveAs()),
            dialog.makeButton('Cancel', dialog.close)
        ]);
    }

    private promptLogin(): void {
        DialogManager.create(LoginPromptDialog, {});
    }
}

function setCurrentDesign(design: DesignRevision): void {
    if (currentDesign) {
        currentDesign.off();
    }
    currentDesign = design;
    updateAppTitle();
    // TODO this could publish the revision alongside the event.
    events.publish(CURRENT_DESIGN_SET);
}

function setImage(event) {
    // If we don't have design revision id, do not allow
    // saving image as we need design revision id for saving.
    // Put unsaved image in 'queue', so image will be saved in
    // the background once we have design revision id
    const design = DesignController.getCurrentDesign();
    if (!design.id) {
        design.setImageContents(event.image);
        return;
    }
    const dialog = DialogManager.create(Dialog, {title: 'Saving'}).waiting();
    setSaving(design);
    design.saveImage(event.image)
        .always(() => {
            clearSaving(design);
            dialog.close();
        });
}

function setSaving(designRev: DesignRevision): void {
    designRev.setSaving();
    events.publish(SAVING_STATE_CHANGED);
}

function clearSaving(designRev: DesignRevision): void {
    designRev.clearSaving();
    events.publish(SAVING_STATE_CHANGED);
    clearDirtyDesign(designRev);
}

function upRev() {
    const dialog = DialogManager.create(Dialog, {title: 'Saving new revision'}).waiting();
    const design = DesignController.getCurrentDesign();
    design.upRev().fail(response => {
        dialog.close();
        errorHandler.onFail(response);
    }).done(() => {
        events.publish(DESIGN_UPREV_COMPLETE);
        dialog.close();
    });
}

function clearDirtyDesign(designRev: DesignRevision): void {
    designRev.clearDirty();
    updateAppTitle();
    events.publish(DIRTY_STATUS_CHANGED);
}

function setDirtyDesign(): void {
    const current = DesignController.getCurrentDesign();
    if (current) {
        current.setDirty();
        updateAppTitle();
        events.publish(DIRTY_STATUS_CHANGED);
    }
}

/**
 * When the user presses the uprev button.
 */
function confirmUpRev() {
    const cancel = () => { /* no op */
    };

    DialogManager.create(Dialog, {
        title: 'Are you sure?',
        html: `<p>Create a new revision of ${currentDesign.getDesignTitle()}?</p>`
    }).confirm(upRev, cancel);
}

function updateAppTitle(): void {
    const design = DesignController.getCurrentDesign();
    const title = design.getDesignTitle();
    const dirty = design.isDirty();
    const parts = ['Geppetto'];

    if (dirty) {
        parts.unshift('*');
    }
    if (title !== '') {
        parts.push('-', title);
    }
    document.title = parts.join(' ');
}

events.subscribe(START_UPREV, confirmUpRev);
events.subscribe({
    capture: setImage,
});
events.subscribe(ACTION_EXECUTED, setDirtyDesign);
events.subscribe(ACTION_REVERSED, setDirtyDesign);

/**
 * Function to display arrow pointing order button.
 * When the design has been saved & and board checker turns green
 * A pointer shows up towards order button
 */
function savedCorrectDesignOrderIndicator(): void {
    const boardEl = document.getElementById("board");
    const orderEl = document.getElementById("order");
    if (boardEl
        && boardEl.classList.contains("connected")
        && orderEl
        && document.querySelectorAll('#design > .module').length > 0) {
        orderEl.classList.add("order-direction");
        if (orderTimeout) {
            clearTimeout(orderTimeout);
        }
        orderTimeout = setTimeout(() => {
            orderEl.classList.remove("order-direction");
        }, 5000);
    }
}

