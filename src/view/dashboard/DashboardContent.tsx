import * as React from "react";
import {UserContext} from "../../auth/UserContext";
import UserController from "../../auth/UserController";
import {DashboardMenuItems} from "./DashboardMenuItems";
import {DashboardMenu} from "./DashboardMenu";
import {DashboardDesigns} from "./DashboardDesigns";
import {Library} from "../../module/Library";
import {Design} from "../../design/Design";
import * as Config from 'Config';
import {LatestModules} from "./LatestModules";
import {DesignPreviews} from "./DesignPreviews";
import {Module} from "../../module/Module";
import {DesignsTab} from "../DesignsTab";
import {ThemeController} from "../../controller/ThemeController";
import {ReactNode} from "react";
import {ServerID} from "../../model/types";
import {NewDashboardDesigns} from "./NewDashboardDesigns";
import {FeatureFlag} from "../../auth/FeatureFlag";

interface DashboardContentProps {
    library: Library;
    libraryLoading: boolean;

    url: string;

    menuSelection: string;
    onSelectMenu: (menu: string) => void;

    userDesigns: Design[];
    sharedDesigns: Design[];
    partnerDesigns: Design[];
    communityDesigns: Design[];
    cloneableDesigns: Design[];
    designsLoading: boolean;

    selectedModuleIds: Set<ServerID>;
    onClearSelectedModuleIds: () => void;
    onSelectModule: (module: Module) => void;

    dashboardTab: DesignsTab;
}

interface DashboardContentState {
}

export class DashboardContent extends React.Component<DashboardContentProps, DashboardContentState> {

    public static DASHBOARD = 'dashboard';
    public static LATEST_MODULES = 'latest-modules';
    public static MY_DESIGNS = 'my-designs';
    public static PARTNER = ThemeController.getInstance().PARTNER_NAME.toLowerCase();
    public static COMMUNITY = 'community';
    public static SHARED = 'shared';

    private userDesigns: Design[];
    private cloneableDesigns: Design[];
    private sharedDesigns: Design[];
    private latestDesigns: Design[];

    constructor(props: DashboardContentProps) {
        super(props);

        this.userDesigns = this.props.userDesigns;
        this.cloneableDesigns = this.props.cloneableDesigns;
        this.sharedDesigns = this.props.sharedDesigns;
        this.latestDesigns = this.props.partnerDesigns;
    }

    static get dashboardMenuUrls(): string[] {
        const urls: string [] = [];
        DashboardMenuItems().forEach((item, i) => {
            item.props.tabSelection !== DashboardContent.DASHBOARD ? urls.push(item.props.tabSelection) : '';
        });
        return urls;
    }

    componentWillReceiveProps(nextProps: Readonly<DashboardContentProps>) {

        const displayResults = 7;
        this.cloneableDesigns = nextProps.cloneableDesigns;
        this.userDesigns = nextProps.userDesigns.slice(0, displayResults);
        this.sharedDesigns = nextProps.sharedDesigns.slice(0, displayResults);
        if (nextProps.partnerDesigns) this.latestDesigns = nextProps.partnerDesigns.slice(0, displayResults);

        this.setState({menuSelection: nextProps.menuSelection});
    }

    render(): ReactNode {
        let pageTitle = '';
        let designs = [];
        if (this.props.menuSelection === DashboardContent.MY_DESIGNS) {
            pageTitle = "My Designs";
            designs = this.props.userDesigns;
        } else if (this.props.menuSelection === DashboardContent.PARTNER) {
            pageTitle = `Designed By ${ThemeController.getInstance().PARTNER_NAME}`;
            designs = this.props.partnerDesigns;
        } else if (this.props.menuSelection === DashboardContent.COMMUNITY) {
            pageTitle = "Community Designs";
            designs = this.props.communityDesigns;
        } else if (this.props.menuSelection === DashboardContent.SHARED) {
            pageTitle = "Shared with Me";
            designs = this.props.sharedDesigns;
        }

        const newDashboardUI = UserController
            .getUser()
            .isFeatureEnabled(FeatureFlag.NEW_DASHBOARD_UI);

        return (
            <div className="dashboard-container">
                <UserContext.Provider value={UserController.getUser()}>
                    <DashboardMenu dashboardMenuItems={DashboardMenuItems()}
                                   menuSelection={this.props.menuSelection}
                                   onSelectMenu={this.props.onSelectMenu}
                                   url={this.props.url}
                                   returnUrl={ThemeController.getInstance().RETURN_URL}/>
                    <div className="dashboard-content">
                        {this.props.menuSelection === DashboardContent.DASHBOARD && !newDashboardUI &&
                        <DashboardDesigns
                            cloneableDesigns={this.cloneableDesigns}
                            sharedDesigns={this.sharedDesigns}
                            userDesigns={this.userDesigns}
                            partnerDesigns={this.latestDesigns}
                            library={this.props.library}
                            libraryLoading={this.props.libraryLoading}
                            url={this.props.url}
                            designsLoading={this.props.designsLoading}
                            menuTabSelection={(menu) => this.props.onSelectMenu(menu)}/>
                        }
                        {this.props.menuSelection === DashboardContent.DASHBOARD && newDashboardUI &&
                        <NewDashboardDesigns
                            sharedDesigns={this.sharedDesigns}
                            userDesigns={this.userDesigns}
                            partnerDesigns={this.props.partnerDesigns}
                            library={this.props.library}
                            libraryLoading={this.props.libraryLoading}
                            url={this.props.url}
                            designsLoading={this.props.designsLoading}
                            menuTabSelection={(menu) => this.props.onSelectMenu(menu)}/>
                        }
                        {this.props.menuSelection === DashboardContent.LATEST_MODULES &&
                        <LatestModules library={this.props.library}
                                       libraryLoading={this.props.libraryLoading}/>
                        }
                        {(this.props.menuSelection !== DashboardContent.DASHBOARD && this.props.menuSelection !== DashboardContent.LATEST_MODULES) &&
                        <DesignPreviews library={this.props.library}
                                        libraryLoading={this.props.libraryLoading}
                                        url={this.props.url + '/' + this.props.menuSelection}
                                        pageTitle={pageTitle}
                                        designType={this.props.menuSelection}
                                        designs={designs}
                                        selectedModuleIds={this.props.selectedModuleIds}
                                        onClearSelectedModuleIds={() => this.props.onClearSelectedModuleIds()}
                                        onSelectModule={(module) => this.props.onSelectModule(module)}
                                        isDesignsLoading={this.props.designsLoading}/>
                        }
                    </div>
                </UserContext.Provider>
            </div>
        );
    }
}
