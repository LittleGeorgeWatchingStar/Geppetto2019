import DialogManager from "../view/DialogManager";
import {Dialog, DialogOptions} from "../view/Dialog";
import userController from "../auth/UserController";
import MarketingDialog from "../view/MarketingDialog";
import * as creatingDialogTemplate from "templates/creating_dialog";
import * as errorTemplate from "templates/error_dialog";
import {openProductWindow} from "./ProductDialog";
import Response from "../utils/response";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {DesignRevision} from "./DesignRevision";
import events from "../utils/events";
import {DESIGN_PUSH_COMPLETE, SAVE3D} from "./events";
import * as Config from "Config";
import {Analytics} from "../marketing/Analytics";


export function openPushDialog(design: DesignRevision) {
    DialogManager.create(PushDialog, {
        design: design
    });
}

export interface PushDialogOptions extends DialogOptions<any> {
    design: DesignRevision;
}

/**
 * The confirmation and loading window when the user wants to create a store product page for their design.
 */
export class PushDialog extends Dialog {

    private design: DesignRevision;

    initialize(options: PushDialogOptions) {
        options.title = 'Order your design';
        options.width = 500;
        options.height = 475;
        this.design = options.design;
        this.listenTo(options.design, 'change:image_url', this.render);
        super.initialize(options);
        this.render();
        Analytics.validation.pushDialog();
        return this;
    }

    get className() {
        return 'push-dialog';
    }

    render() {
        const user = userController.getUser();
        const element = (
            <div>
                <h3>Create a product page for your design</h3>
                <p>This step enables you to review and order your
                    board from our store website. <a href={`${Config.WWW_URL}/ordering/geppetto-orders/`}
                       target="_blank">
                        More info↗
                    </a></p>
                <div className={"push-dialog__image-preview"}
                     onClick={() => events.publish(SAVE3D, {design_revision: this.design})}>
                    {this.designPreview}
                    <div>
                        <i>The current 3D image for your design. </i>
                        <span className={"cta-link"}>Change...</span>
                    </div>
                </div>
                <p>After this point, <b>your design will be locked</b>, but you
                    can always <b>Save As</b> to branch another design from it.</p>
                {!this.design.getImageUrl() &&
                <span className={"error"}>Please save a 3D image before proceeding.</span>
                }
                {this.design.getImageUrl() &&
                <p>Would you like to continue?</p>
                }
                <div className={"push-dialog__actions"}>
                    {user && user.isEngineer() &&
                    <span className={"cta-link"}
                          onClick={() => this.push(true)}>
                        Override Validation
                    </span>
                    }
                    <button className={"push cta"}
                            onClick={() => this.push()}
                            disabled={!this.design.getImageUrl()}>
                        Create Product Page
                    </button>
                </div>
            </div>
        );
        ReactDOM.render(element, this.el);
        return this;
    }

    private get designPreview(): JSX.Element {
        if (this.design.getImageUrl()) {
            return <img src={this.design.getImageUrl()}
                        alt={`Preview for ${this.design.getTitle()}`}/>
        }
        return <img src={`${Config.STATIC_URL}/image/ImageMissing.png`} alt="No Preview Available"/>
    }

    private push(override: boolean = false): void {
        const dialog = DialogManager.create(MarketingDialog, {
            title: 'Please wait',
            html: creatingDialogTemplate()
        });
        this.design.push(override)
            .always(dialog.close)
            .done(() => {
                events.publish(DESIGN_PUSH_COMPLETE);
                openProductWindow(this.design);
                Analytics.design.push();
            })
            .fail(pushFailDialog);
    }
}

function pushFailDialog(response: JQueryXHR): void {
    switch (response.status) {
        case 400:
            DialogManager.create(Dialog, {
                title: 'Error',
                html: errorTemplate({
                    errors: Response.parseMessages(response),
                }),
            }).alert();
            break;
        case 503:
            DialogManager.create(Dialog, {
                title: 'Service Temporarily Unavailable',
                html: 'Sorry! The service you are currently trying to access is down for maintenance. Please try again later.',
                width: 5
            }).alert();
            break;
        default:
            DialogManager.create(Dialog, {
                title: 'Error',
                html: 'Sorry! There was an error processing your design. Please try again later.'
            }).alert();
    }
}
