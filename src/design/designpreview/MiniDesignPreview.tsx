import * as Backbone from "backbone";
import {Design} from "../Design";
import {Library} from "../../module/Library";
import * as Config from "Config";
import events from "../../utils/events";
import {DASHBOARD_ACTION, DashboardActionEvent} from "../../view/events";
import * as React from "react";
import {ReactNode} from "react";
import {DesignController} from "../DesignController";
import DialogManager from "../../view/DialogManager";
import SaveOrDiscardDialog from "../../view/SaveOrDiscardDialog";
import {TabNavigation} from "../../view/TabNavigation";
import {checkPermission} from "../../router";


export interface MiniDesignPreviewProps {
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

    //check if is the new dashboard mini view
    newMiniView?: boolean;
}

/**
 * A clickable design preview inside the Dashboard.
 */
export class MiniDesignPreview extends React.Component<MiniDesignPreviewProps> {

    constructor(props) {
        super(props);
    }

    public render(): ReactNode {
        const design = this.props.design;
        const imgUrl = design.getImageUrl() ? design.getImageUrl() : `${Config.STATIC_URL}/image/ImageMissing.png`;

        if (this.props.newMiniView == true) {
            return (<li className="new-design-preview-mini-container"
                        onClick={() => this.openButton()}
                        key={design.getId()}>
                <div className="new-design-preview-mini">
                    <div className="preview">
                        <img className="preview-image"
                             src={imgUrl}
                             alt={`Preview for ${design.getTitle()}`}/>
                        <div className="icons">
                            {this.props.library && this.getCOMProcessorIcons()}
                        </div>
                    </div>
                    <div className="header">
                        <div className="name">{design.getTitle()}</div>
                    </div>
                </div>
            </li>);
        }

        return (<li className="design-preview-mini-container"
                    onClick={this.expandPreview}
                    key={design.getId()}>
            <div className="design-preview-mini">
                <div className="header">
                    <div className="name">{design.getTitle()}</div>
                </div>
                <div className="preview">
                    <img className="preview-image"
                         src={imgUrl}
                         alt={`Preview for ${design.getTitle()}`}/>
                    <div className="icons">
                        {this.props.library && this.getCOMProcessorIcons()}
                    </div>
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
        if (this.props.newMiniView) {
            window.open(`#!/design/${this.props.design.getId()}`);
        } else {
            TabNavigation.openWorkspace();
            checkPermission(this.props.design);
        }
    }
}
