import * as React from "react";
import {ReactNode} from "react";
import * as Config from "Config";
import {TabNavigation} from "../TabNavigation";
import {LoginController} from "../../controller/Login";
import {Design} from "../../design/Design";
import {MiniDesignPreview} from "../../design/designpreview/MiniDesignPreview";
import * as Backbone from "backbone";
import events from "../../utils/events";
import {DASHBOARD_ACTION, DashboardActionEvent} from "../events";
import * as $ from "jquery";
import {Library} from "../../module/Library";
import {UserContext} from "../../auth/UserContext";
import {PromotionController} from "../../promotions/PromotionController";
import {Subscription} from "rxjs";
import {FeatureFlag} from "../../auth/FeatureFlag";

const STATIC_DESIGNS = [
    new Design({
        id: 3701,
        current_revision_id: 9062,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000000697W5G_top_1.png",
        title: "Voice AI",
    }),
    new Design({
        id: 5473,
        current_revision_id: 6116,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000001074_top.png",
        title: "Air Quality",
    }),
    new Design({
        id: 6154,
        current_revision_id: 7134,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000001185_top.jpg",
        title: "Sixteen Cameras",
    }),
    new Design({
        id: 2586,
        current_revision_id: 4088,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000000603_top.png",
        title: "Robot",
    }),
    new Design({
        id: 6244,
        current_revision_id: 7366,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000001198_top.jpg",
        title: "NVIDIA Xavier",
    }),
    new Design({
        id: 158,
        current_revision_id: 4320,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG300100_overview.png",
        title: "Touchscreen Computer",
    }),
    new Design({
        id: 3062,
        current_revision_id: 4600,
        image_url: "https://store.gumstix.com/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/P/K/PKG900000000691_top.png",
        title: "Drone",
    }),
];

export enum FilterType {
    AEROSPACE = 'AEROSPACE',
    IOT_GATEWAY = 'IoT GATEWAY',
    ROBOTICS = 'ROBOTICS',
    GPS_SYSTEM = 'GPS SYSTEM',
    LIGHTING = 'LIGHTING'
}

interface NewDashboardDesignsProps {
    url: string;

    library: Library;
    libraryLoading: boolean;

    userDesigns: Design[];
    sharedDesigns: Design[];
    partnerDesigns: Design[];
    designsLoading: boolean;

    menuTabSelection: (selection: string) => void;
}

interface NewDashboardDesignsState {
    promotionMessage: string | null;
    designTypeFilter: string;
}

export class NewDashboardDesigns extends React.Component<NewDashboardDesignsProps, NewDashboardDesignsState> {
    static contextType = UserContext;
    context!: React.ContextType<typeof UserContext>;

    private subscriptions: Subscription[] = [];

    constructor(props: NewDashboardDesignsProps) {
        super(props);
        this.state = {
            designTypeFilter: '',
            ...this.fetchPromotionControllerState()
        };

        /**
         * React (especially tests) require binding this to maintain context.
         */
        this.boardBuilder = this.boardBuilder.bind(this);
        this.newDesign = this.newDesign.bind(this);
        this.openTab = this.openTab.bind(this);
    }

    private fetchPromotionControllerState(): Pick<NewDashboardDesignsState, 'promotionMessage'> {
        return {
            promotionMessage: PromotionController.getInstance().dashboardMessage,
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(PromotionController.getInstance().subscribe(() => {
            this.setState(this.fetchPromotionControllerState)
        }));
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): ReactNode {
        const user = this.context;
        const bannerImageClass = !this.state.designTypeFilter ? 'new-dashboard-banner-main' : `new-dashboard-banner-${this.state.designTypeFilter.replace(' ', '-').toLowerCase()}`;
        const newDashboardUIDesignAutoplay = user.isFeatureEnabled(FeatureFlag.NEW_DASHBOARD_UI_AUTOPLAY);

        return (
            <>
                <div className="new-dashboard-header">
                    <div className="masthead">
                        <h2>
                            {user && user.getFirstName() ? `Welcome back, ${user.getFirstName()}` : "Welcome to Geppetto"}
                            {this.state.promotionMessage &&
                            <span className="promotion alert alert-success"
                                  dangerouslySetInnerHTML={{__html: this.state.promotionMessage}}/>
                            }
                        </h2>
                    </div>
                </div>
                <div className="new-dashboard-banner">
                    <div className={`new-dashboard-banner-content  ${bannerImageClass}`}>
                        <div className="new-dashboard-banner-text">
                            {!this.state.designTypeFilter &&
                            <>
                                <h1>MAKE <b>ANYTHING</b></h1>
                                <span>IMAGE CREDIT: <b>NASA</b></span>
                            </>
                            }
                            {this.state.designTypeFilter &&
                            <>
                                <p onClick={() => this.setState({designTypeFilter: ''})}>Back</p>
                                <h1>{this.state.designTypeFilter}</h1>
                            </>
                            }
                        </div>
                    </div>
                </div>
                {!this.state.designTypeFilter
                && user.isFeatureEnabled(FeatureFlag.NEW_DASHBOARD_CATEGORES) &&
                <div className="new-dashboard-filter">
                    <div className="filter-container">
                        <div
                            className={`new-dashboard-filter-button ${FilterType.AEROSPACE.replace(' ', '-').toLowerCase()}-filter-button-background`}>
                            <h3>{FilterType.AEROSPACE}</h3>
                        </div>
                        <div
                            className={`new-dashboard-filter-button ${FilterType.IOT_GATEWAY.replace(' ', '-').toLowerCase()}-filter-button-background`}>
                            <h3>{FilterType.IOT_GATEWAY}</h3>
                        </div>
                        <div
                            className={`new-dashboard-filter-button ${FilterType.ROBOTICS.replace(' ', '-').toLowerCase()}-filter-button-background`}>
                            <h3>{FilterType.ROBOTICS}</h3>
                        </div>
                        <div
                            className={`new-dashboard-filter-button ${FilterType.GPS_SYSTEM.replace(' ', '-').toLowerCase()}-filter-button-background`}>
                            <h3>{FilterType.GPS_SYSTEM}</h3>
                        </div>
                        <div
                            className={`new-dashboard-filter-button ${FilterType.LIGHTING.replace(' ', '-').toLowerCase()}-filter-button-background`}>
                            <h3>{FilterType.LIGHTING}</h3>
                        </div>
                    </div>
                </div>}
                <div className="new-dashboard-designs">
                    {!this.state.designTypeFilter && !newDashboardUIDesignAutoplay && this.designTemplates}
                    {!this.state.designTypeFilter && newDashboardUIDesignAutoplay && this.designTemplatesAutoplay}
                    {!this.state.designTypeFilter && this.recentDesignsSection}
                    {this.state.designTypeFilter && this.filteredDesignsSection}
                    {this.tutorialSection}
                </div>
            </>
        );
    }

    private get designTemplates(): JSX.Element {
        if (!this.props.partnerDesigns) return null;
        return (
            <div className="dashboard-row design-templates-container">
                <div className="preview-container">
                    {/*{this.props.designsLoading &&*/}
                    {/*<div className="dashboard-designs shared-designs">Loading...</div>*/}
                    {/*}*/}
                    <ul className="dashboard-designs" id="template-designs">
                        {this.getPreviews(STATIC_DESIGNS)}
                    </ul>
                </div>
            </div>
        );
    }

    private get designTemplatesAutoplay(): JSX.Element {
        if (!this.props.partnerDesigns) return null;

        const totalDisplayDesigns = STATIC_DESIGNS.length * 2; //doulbe the size to make it loop
        const individualDesignWidth = 200;
        const individualDesignMargin = 20;

        const totalWidth = totalDisplayDesigns * (individualDesignWidth + individualDesignMargin) - individualDesignMargin; // deduct margin for the last child

        return (
            <div className="dashboard-row design-templates-container">
                <div className="preview-container-autoplay">
                    <ul className="dashboard-designs" id="template-designs-autoplay"
                        style={{'width': `${totalWidth}px`}}>
                        {this.getPreviews(STATIC_DESIGNS)}
                        {this.getPreviews(STATIC_DESIGNS)}
                    </ul>
                </div>
            </div>
        );
    }

    private get recentDesignsSection(): JSX.Element {
        if (!this.context.isLoggedIn()) {
            return this.loginRequired;
        }
        let content;
        if (!this.props.designsLoading && this.props.userDesigns.length === 0) {
            content = <div className="dashboard-message">
                <p>You haven't saved a design yet. <br/>
                    To get started, create a new design, or try the Builder.</p>
            </div>;
        } else {
            content = <div className="preview-container">
                <ul className="dashboard-designs user-designs">
                    {this.getPreviews(this.props.userDesigns)}
                </ul>
            </div>
        }
        return (
            <div className="dashboard-row user-design-container">
                {/*The title will be hide for testing */}
                {/*<div className="heading">*/}
                {/*    <h3>YOUR DESIGNS</h3>*/}
                {/*</div>*/}
                {content}
            </div>
        );
    }

    private get filteredDesignsSection(): JSX.Element {
        if (!this.props.partnerDesigns) return null;
        return (
            <div className="dashboard-row filtered-design-container">
                <div className="heading">
                    <h3>{this.state.designTypeFilter} DESIGNS</h3>
                </div>
                <div className="preview-container">
                    {this.props.designsLoading &&
                    <div className="dashboard-designs shared-designs">Loading...</div>
                    }
                    {!this.props.designsLoading &&
                    <ul className="dashboard-designs shared-designs">
                        {this.getPreviews(this.props.partnerDesigns)}
                    </ul>}
                </div>
            </div>
        );
    }

    private get tutorialSection(): ReactNode {
        return (
            <div className="dashboard-row tutorial-container">
                <div className="preview-container">
                    <ul className="dashboard-tutorial">
                        <li>
                            <iframe width="400" height="240"
                                    src="https://www.youtube.com/embed/j49Euoe7t8E">
                            </iframe>
                        </li>
                        <li>
                            <iframe width="400" height="240"
                                    src="https://www.youtube.com/embed/xg9Gz3b_vcA">
                            </iframe>
                        </li>
                        <li>
                            <iframe width="400" height="240"
                                    src="https://www.youtube.com/embed/ba8OxX04A-8">
                            </iframe>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    private get loginRequired(): JSX.Element {
        return (
            <div className="dashboard-row">
                <div className="heading">
                    <h3>Your Recent Designs</h3>
                </div>
                <div className="dashboard-message">
                    <p>To view your saved designs, please log in.</p>
                    <button
                        className="cta log-in"
                        onClick={() => LoginController.getInstance().login()}>
                        Log in
                    </button>
                </div>
            </div>
        );
    }

    private getPreviews(designs: Design[]): JSX.Element[] {
        return designs.slice(0, 7).map(design =>
            <MiniDesignPreview
                design={design}
                url={this.props.url}
                library={this.props.library}
                key={design.id}
                newMiniView={true}/>);
    }

    private newDesign(): void {
        this.showLoaderSplash();
        Backbone.history.navigate('#!/new', {trigger: true});
        events.publishEvent(DASHBOARD_ACTION, {
            action: 'Start Design',
            label: 'New'
        } as DashboardActionEvent);
    }

    private boardBuilder(): void {
        this.showLoaderSplash();
        Backbone.history.navigate('#!/workspace/boardbuilder', {trigger: true});
        events.publishEvent(DASHBOARD_ACTION, {
            action: 'Start Design',
            label: 'Board Builder'
        } as DashboardActionEvent);
    }

    private showLoaderSplash(): void {
        const $logo = $(`<div class="splash">
                            <img src="${Config.STATIC_URL}/image/geppetto-shutter.png" alt="Geppetto Logo">
                         </div>`);
        $('body').append($logo);
        $logo.fadeIn(100, () =>
            setTimeout(() => {
                $logo.fadeOut(400, $logo.remove);
            }, 50)
        );
    }

    private openTab(tabName: string): void {
        TabNavigation.openTab(tabName);
        events.publishEvent(DASHBOARD_ACTION, {
            action: 'Open tab',
            label: tabName
        } as DashboardActionEvent);
    }
}
