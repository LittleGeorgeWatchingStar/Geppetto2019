import {Dialog} from "../view/Dialog";
import {DesignRevision} from "./DesignRevision";
import * as ReactDOM from "react-dom";
import * as React from "react";
import DialogManager from "../view/DialogManager";
import UserController from "../auth/UserController";
import {DesignRequestEvent, OPEN_DESIGN_SCHEMATIC} from "./events";
import events from "../utils/events";


export function openProductWindow(design: DesignRevision): void {
    DialogManager.create(ProductDialog, {
        design: design
    });
}

/**
 * After the user has validated a design, this dialog shows links to the various products.
 */
export class ProductDialog extends Dialog {
    private design: DesignRevision;

    constructor(options) {
        super(options);
        this.design = options.design;
        this.title('Products');
        this.option({
            width: 500,
            height: UserController.getUser().isBetaTester() ?  600 : 380
        });
        this.render();
    }

    get className() {
        return 'validation-dialog';
    }

    render() {
        const el = this.getTemplate();
        ReactDOM.render(el, this.$el.get(0));
        return this;
    }

    private getTemplate() {
        return (<div className="validation-dialog-content">
            <h3>Products for {this.design.getDesignTitle()}</h3>
            <div className="validation-design-container">
                <a href={this.design.getProductUrl()}
                   target="_blank">
                    <img className="validation-preview-image"
                         src={this.design.getImageUrl()}
                         alt={`Preview for ${this.design.getDesignTitle()}`}/>
                </a>
                <div className="validation-board-link-container">
                    <a className="cta"
                       href={this.design.getProductUrl()}
                       target="_blank">View board in-store ↗</a>
                </div>
            </div>
            {this.getSchematics()}
        </div>)
    }

    private getSchematics(): JSX.Element | null {
        if (!UserController.getUser().isBetaTester()) {
            return null;
        }

        const onClick = () => {
            events.publishEvent(OPEN_DESIGN_SCHEMATIC, {
                design_revision_id: this.design.getId()
            } as DesignRequestEvent);
            return false; // Prevent click from focusing on this dialog
        };
        return this.getSoftwareItem({
            title: 'Schematic Preview',
            description: 'Preview the schematic for your design.',
            onClick: onClick,
        });
    }

    private getSoftwareItem(data): JSX.Element {
        const elClass = data.title.toLowerCase().replace(' ', '-');
        return <div>
            <div className={`software-item ${elClass}`}
               onClick={data.onClick}>
                <div className="software-item-icon-container">
                    <div className={`software-item-icon ${elClass}-icon`}/>
                </div>
                <div className="software-item-content">
                    <h3 className="software-item-header">{data.title} ↗</h3>
                    <p>{data.description}</p>
                </div>
            </div>
        </div>
    }
}
