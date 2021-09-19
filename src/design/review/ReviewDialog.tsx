import {AbstractDialog, DialogOptions} from "../../view/Dialog";
import {DesignRevision} from "../DesignRevision";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {openPushDialog} from "../PushDialog";
import DialogManager from "../../view/DialogManager";
import {getModuleRecommendations} from "../helper/DesignRecommendationsGateway";
import {generateDesignWarnings} from "./generateDesignWarnings";
import {DESIGN_HELPER} from "../../view/events";
import events from "../../utils/events";


export function openReviewDialog(design: DesignRevision): void {
    getModuleRecommendations().then(recommendations => {
        const warnings = generateDesignWarnings(design, recommendations);
        DialogManager.create(ReviewDialog, {
            model: design,
            warnings: warnings
        });
    });
}

interface ReviewDialogOptions extends DialogOptions<DesignRevision> {
    warnings: string[];
}

/**
 * Shows warnings about the design to the user.
 *
 * These warnings will not prevent the user from ordering the design --
 * they're more like recommendations or best practices.
 */
export class ReviewDialog extends AbstractDialog<DesignRevision> {

    private warnings: string[];

    get className() {
        return 'design-review';
    }

    initialize(options: ReviewDialogOptions) {
        options.title = 'Order your design';
        options.width = 500;
        options.height = 475;
        this.warnings = options.warnings;
        super.initialize(options);
        this.renderValidation();
        return this;
    }

    private renderValidation(): void {
        this.center();
        if (this.warnings.length === 0) {
            this.confirmPush();
        } else {
            ReactDOM.render(this.warningList(), this.el);
            this.center();
        }
    }

    private warningList(): JSX.Element {
        return (
            <div>
                <h3>Before you order...</h3>
                <p>Please review the following checklist
                    to ensure it does not reflect possible errors:</p>
                <div>
                    <div className={"design-review__warnings-container"}>
                        <ul>
                            {this.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                        <button data-test="openDesignHelper"
                                className={"cta-link"}
                                onClick={() => this.onClickOpenHelper()}>
                            Open Design Helper
                        </button>
                    </div>
                    You can still proceed if you're satisfied with your design.
                    <div className={"design-review__actions"}>
                        <span className={"cta-link design-review__cta"}
                              onClick={() => this.confirmPush()}>
                            Next Step: Create Product Page
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    private confirmPush(): void {
        openPushDialog(this.model);
        this.close();
    }

    private onClickOpenHelper(): void {
        this.close();
        events.publish(DESIGN_HELPER);
    }
}
