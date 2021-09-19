import {Design} from "../../design/Design";
import {Library} from "../../module/Library";
import * as React from "react";
import * as Config from "Config";
import * as Backbone from "backbone";
import events from "../../utils/events";
import {DASHBOARD_ACTION, DashboardActionEvent} from "../events";
import UserController from "../../auth/UserController";
import {DesignController} from "../../design/DesignController";
import DialogManager from "../DialogManager";
import SaveOrDiscardDialog from "../SaveOrDiscardDialog";
import {TabNavigation} from "../TabNavigation";
import {checkPermission} from "../../router";


export interface DesignPreviewProps {
    design: Design;
    /**
     * The URL path that this preview falls under.
     */
    url: string;

    /**
     * Used to show the COM/Processor(s) of the design.
     * Only exists when modules have been loaded.
     */
    library: Library | undefined;

    /**
     * Used for Partner design page only, check if displaying the order button
     */
    canOrder?: boolean;
}

export class DesignPreview extends React.Component<DesignPreviewProps> {

    constructor(props) {
        super(props);
    }

    render() {
        const user = UserController.getUser();
        const design = this.props.design;
        const imgUrl = design.getImageUrl() ? design.getImageUrl() : `${Config.STATIC_URL}/image/ImageMissing.png`;
        return (
            <li key={design.id}>
                <div className="design-preview-container">
                    <div className="design-preview" onClick={this.expandPreview}>

                        <div className="header">
                            <div className="name">{design.getTitle()}</div>

                            {!design.isOwnedBy(user) &&
                            <div className="info">
                                <div className="owner"> by {design.getCreatorFirstName()}</div>

                                {design.getProductUrl() &&
                                <div className="product">
                                    <a href={design.getProductUrl()}
                                       target="_blank">
                                        {design.getProductPrice() && design.getProductPrice() != 0 ? "$" + design.getProductPrice() : "Check Price ↗"}
                                    </a>
                                </div>
                                }
                            </div>}
                        </div>

                        <div className="preview">
                            <img className="preview-image"
                                 src={imgUrl}
                                 alt={`Preview for ${design.getTitle()}`}/>
                            <div className="icons">
                                {this.props.library && this.getCOMProcessorIcons()}
                            </div>
                        </div>

                        <div className="description-text">{design.getDescription()}</div>
                    </div>
                    {this.props.canOrder &&
                    <p>* Manufactured board is available in store.</p>
                    }
                    <div className="actions">
                        {design.isOwnedBy(user) &&
                        <div className={`public ${user.isEngineer() ? 'public-engineer' : ''}`}>
                            {design.isPublic() &&
                            <a rel="license"
                               target="_blank"
                               href="//creativecommons.org/publicdomain/zero/1.0/">
                                <img src="//i.creativecommons.org/p/zero/1.0/80x15.png"
                                     alt="CC0"
                                     style={{borderStyle: "none"}}/>
                            </a>
                            }
                        </div>
                        }
                        {this.props.canOrder &&
                        <>
                            {design.getProductUrl() &&
                            <button className="action-button cta"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.open(design.getProductUrl());
                                    }}>
                                Buy In Store
                            </button>}
                            <button className="action-button open cta"
                                    onClick={() => this.openButton()}>
                                Free Template
                            </button>
                        </>
                        }
                        {!this.props.canOrder &&
                        <button className="action-button open cta"
                                onClick={() => this.openButton()}>
                            Open design
                        </button>}
                    </div>
                </div>
            </li>);
    }


    private getCOMProcessorIcons(): JSX.Element[] {
        const checked = {};
        const icons = [];
        let key = 0;
        for (const id of this.props.design.moduleIds) {
            if (checked[id]) {
                continue;
            }
            checked[id] = true;
            const module = this.props.library.findByModuleId(id);
            if (module && module.isCOMorProcessor && module.icon) {
                icons.push(<img src={module.icon}
                                className="icon"
                                alt="COM or processor icon"
                                title={`This design includes ${module.name}`}
                                key={key}/>);
                ++key;
            }
        }
        return icons;
    }

    private openButton(): void {
        if (!DesignController.hasUnsavedChanges()) {
            this.openDesign();
            return;
        }
        DialogManager.create(SaveOrDiscardDialog, {
            title: 'Open Design',
            callBack: () => this.openDesign(),
            action: 'to open an existing design'
        });
    }

    private openDesign(): void {
        TabNavigation.openWorkspace();
        checkPermission(this.props.design);
    }

    /**
     * Router handles the design preview expand.
     */
    private expandPreview = () => {
        const design = this.props.design;
        Backbone.history.navigate(`!/${this.props.url}/preview/${design.id}`, {trigger: true});
        events.publishEvent(DASHBOARD_ACTION, {
            action: `Open design preview`,
            label: `${design.id} - ${design.getTitle()}`
        } as DashboardActionEvent);
    };
}