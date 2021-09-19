import {DesignRevision} from "./DesignRevision";
import DialogManager from "../view/DialogManager";
import {openReviewDialog} from "./review/ReviewDialog";
import {DesignController} from "./DesignController";
import * as React from "react";
import {openProductWindow} from "./ProductDialog";
import {SaveAsDialog} from "../view/SaveAsDialog";


/**
 * The process of pushing a design to the store for purchase.
 * This is for checking issues that block the user from pushing a design to the store.
 * Contrast with DesignReview, which reviews best practices for the user's design.
 */
export class DesignValidator {
    constructor(private readonly design: DesignRevision) {
    }

    public static of(design: DesignRevision): DesignValidator {
        return new DesignValidator(design);
    }

    public validate(): void {
        if (!this.hasError()) {
            openReviewDialog(this.design);
        }
    }

    private hasError(): boolean {
        if (this.design.isPushed()) {
            openProductWindow(this.design);
            return true;
        }
        if (this.design.isNew()) {
            this.promptSaveAs();
            return true;
        }
        if (this.design.isDirty()) {
            // False for 3D image prompt: Push dialog will check that you have a preview image.
            DesignController.save(false, () => openReviewDialog(this.design));
            return true;
        }
        return false;
    }

    private promptSaveAs(): void {
        DialogManager.create(SaveAsDialog, {
            model: this.design,
            customMessage: 'Please save your design first.',
            callBack: () => openReviewDialog(this.design),
            prompt3DSave: false
        });
    }
}
