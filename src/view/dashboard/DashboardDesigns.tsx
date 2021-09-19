import * as React from "react";
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
import {DashboardContent} from "./DashboardContent";
import {PartnerTheme, ThemeController} from "../../controller/ThemeController";
import {ReactNode} from "react";


interface DashboardDesignsProps {
    url: string;

    library: Library;
    libraryLoading: boolean;

    userDesigns: Design[];
    sharedDesigns: Design[];
    cloneableDesigns: Design[];
    partnerDesigns: Design[];
    designsLoading: boolean;

    menuTabSelection: (selection: string) => void;
}

interface DashboardDesignsState {
    promotionMessage: string | null;
}

export class DashboardDesigns extends React.Component<DashboardDesignsProps, DashboardDesignsState> {
    static contextType = UserContext;
    context!: React.ContextType<typeof UserContext>;

    private subscriptions: Subscription[] = [];

    constructor(props: DashboardDesignsProps) {
        super(props);
        this.state = {
            ...this.fetchPromotionControllerState()
        };

        /**
         * React (especially tests) require binding this to maintain context.
         */
        this.boardBuilder = this.boardBuilder.bind(this);
        this.newDesign = this.newDesign.bind(this);
        this.openTab = this.openTab.bind(this);
    }

    private fetchPromotionControllerState(): DashboardDesignsState {
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
        const theme = ThemeController.getInstance().THEME;

        return [
            <div className="dashboard-top-container" key={0}>
                <div className="dashboard-top">
                    <div className="dashboard-header">
                        <h2>
                            {theme !== PartnerTheme.ADLINK &&
                            <img src={`${Config.STATIC_URL}/image/icons/${ThemeController.getInstance().GENERAL_LOGO}`}
                                 alt="Geppetto Logo"/>}
                            {user && user.getFirstName() ? `Welcome back, ${user.getFirstName()}` : "Welcome to Geppetto"}
                        </h2>
                    </div>
                    {this.state.promotionMessage &&
                    <div className="promotion">
                        <div className="alert alert-success"
                             dangerouslySetInnerHTML={{__html: this.state.promotionMessage}}/>
                    </div>
                    }
                    <div className="dashboard-row">
                        <div className="default-options-container">
                            <h3>Start a Design</h3>
                            <div className="default-options">
                                <a className="option"
                                   onClick={this.newDesign}>
                                    <div className="option-content new"/>
                                    <div>New Design</div>
                                </a>
                                <a className="option"
                                   onClick={this.boardBuilder}>
                                    <div className="option-content board-builder"/>
                                    <div>Quick Start: Builder</div>
                                </a>
                            </div>
                        </div>
                        <div className="clone-designs-container">
                            <div className="heading">
                                <h3>Featured Design Templates</h3>
                                {!this.props.designsLoading &&
                                <a onClick={() => this.props.menuTabSelection(DashboardContent.PARTNER)}>
                                    All Templates
                                </a>
                                }
                            </div>
                            {this.props.designsLoading &&
                            <div className="dashboard-designs clone-designs">Loading...</div>
                            }
                            {(!this.props.designsLoading && this.props.cloneableDesigns.length > 0) &&
                            // NOTE: COM icons require the library to be loaded, so those will most likely take a bit longer to appear than the designs.
                            <ul className="dashboard-designs clone-designs">
                                {this.getPreviews(this.props.cloneableDesigns)}
                            </ul>
                            }
                        </div>
                    </div>
                </div>
            </div>,
            <div className="dashboard-body-container" key={1}>
                <div className="dashboard-body">
                    <div className={`shutter shutter-${ThemeController.getInstance().THEME} dashboard-shutter`}/>
                    {this.latestPartnerDesign}
                    {this.recentDesignsSection}
                    {this.sharedDesignsSection}
                </div>
            </div>
        ];
    }

    private get latestPartnerDesign(): JSX.Element {
        if (!this.props.partnerDesigns) return null;
        return (
            <div className="dashboard-row latest-design-container">
                <div className="heading">
                    <h3>{ThemeController.getInstance().DESIGN_TEMPLATES_HEADER}</h3>
                    {(!this.props.designsLoading && this.props.partnerDesigns.length > 0) &&
                    <a onClick={() => this.props.menuTabSelection(DashboardContent.PARTNER)}>
                        All Templates
                    </a>
                    }
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
        } else if (!this.props.designsLoading) {
            content = <div className="preview-container">
                <ul className="dashboard-designs user-designs">
                    {this.getPreviews(this.props.userDesigns)}
                </ul>
            </div>
        } else {
            content = <div className="dashboard-designs user-designs">Loading...</div>
        }
        return (
            <div className="dashboard-row user-design-container">
                <div className="heading">
                    <h3>Your Recent Designs</h3>
                    {(!this.props.designsLoading && this.props.userDesigns.length > 0) &&
                    <a onClick={() => this.props.menuTabSelection(DashboardContent.MY_DESIGNS)}>
                        View all
                    </a>
                    }
                </div>
                {content}
            </div>
        );
    }

    private get sharedDesignsSection(): JSX.Element {
        if (!this.context.isLoggedIn()) {
            return null;
        }

        let content;
        if (!this.props.designsLoading && this.props.sharedDesigns.length === 0) {
            content = <div className="dashboard-message">
                <p>You do not have any designs shared with you yet.</p>
            </div>;
        } else if (!this.props.designsLoading) {
            content = <div className="preview-container">
                <ul className="dashboard-designs shared-designs">
                    {this.getPreviews(this.props.sharedDesigns)}
                </ul>
            </div>;
        } else {
            content = <div className="dashboard-designs shared-designs">Loading...</div>
        }
        return (
            <div className="dashboard-row shared-design-container">
                <div className="heading">
                    <h3>Shared with You</h3>
                    {(!this.props.designsLoading && this.props.sharedDesigns.length > 0) &&
                    <a onClick={() => this.props.menuTabSelection(DashboardContent.SHARED)}>
                        View all
                    </a>
                    }
                </div>
                {content}
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
        return designs.slice(0, 6).map(design =>
            <MiniDesignPreview
                design={design}
                url={this.props.url}
                library={this.props.library}
                key={design.id}/>);
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
