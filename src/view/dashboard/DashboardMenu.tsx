import * as React from "react";
import {ReactNode} from "react";
import {DashboardMenuItem} from "./DashboardMenuItem";
import {DashboardContent} from "./DashboardContent";
import * as Backbone from "backbone";
import UserController from "../../auth/UserController";
import {FeatureFlag} from "../../auth/FeatureFlag";
import {PartnerTheme, ThemeController} from "../../controller/ThemeController";


export class DashboardMenuProps {
    dashboardMenuItems: React.ReactComponentElement<typeof DashboardMenuItem>[];
    returnUrl: string | null;
    onSelectMenu: (menu: string) => void;
    menuSelection: string;
    url: string;
}

export class DashboardMenuState {
}

export class DashboardMenu extends React.Component<DashboardMenuProps, DashboardMenuState> {
    constructor(props: DashboardMenuProps) {
        super(props);
    }

    render(): ReactNode {
        const menuItem = [];
        this.props.dashboardMenuItems.forEach((item, i) => {
            if (this.props.menuSelection === item.props.tabSelection) {
                if (item.props.tabSelection === DashboardContent.DASHBOARD) {
                    menuItem.push(
                        <div key={item.props.id}
                             className="dashboard-menu-active"
                             onClick={() => {
                                 this.props.onSelectMenu(item.props.tabSelection);
                             }}>{item}</div>);
                } else {
                    menuItem.push(
                        <div key={item.props.id}
                             className="dashboard-menu-active"
                             onClick={() => {
                                 this.props.onSelectMenu(item.props.tabSelection);
                             }}>{item}</div>);
                }
            } else {
                if (item.props.tabSelection === DashboardContent.DASHBOARD) {
                    menuItem.push(
                        <div key={item.props.id}
                             onClick={() => {
                                 this.props.onSelectMenu(item.props.tabSelection);
                             }}>{item}</div>);
                } else if (item.props.tabSelection === 'WORKSPACE') {
                    menuItem.push(
                        <div key={item.props.id}
                             onClick={() => {
                                 Backbone.history.navigate(`!/workspace/`, true);
                             }}>{item}</div>);
                } else {
                    menuItem.push(
                        <div key={item.props.id}
                             onClick={() => {
                                 this.props.onSelectMenu(item.props.tabSelection);
                             }}>{item}</div>);
                }
            }
        });

        /**
         * The dashboard menu collapse will be temporarily disable to gain user feedback
         */
        const isCollapsed = UserController.isDashboardMenuCollapsed() === false ? 'dashboard-sidebar-force-collapsed' : '';
        const newDashboardUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_DASHBOARD_UI) ? 'dashboard-sidebar-new-ui' : '';

        return (
            <aside className={`dashboard-sidebar ${isCollapsed} ${newDashboardUI}`}>
                {menuItem}
                {this.props.returnUrl &&
                <div key="dashboard-back"
                     className="dashboard-menu-item">
                    <a href={this.props.returnUrl} target="_blank">
                        <div className="dashboard-meu-title-wrapper">
                            <span id="dashboard-back-icon" className="dashboard-menu-icon"/>
                            <span className="dashboard-menu-title">Back</span>
                        </div>
                    </a>
                </div>
                }
                {ThemeController.getInstance().THEME === PartnerTheme.ADLINK &&
                <div key="dashboard-request-module"
                     className="dashboard-menu-item">
                    <a href="mailto: info@adlinktech.com" target="_blank">
                        <div className="dashboard-meu-title-wrapper">
                            <span id="dashboard-mailto-icon" className="dashboard-menu-icon"/>
                            <span className="dashboard-menu-title">Request New Module</span>
                        </div>
                    </a>
                </div>
                }
            </aside>
        );
    }
}
