import * as React from "react";
import * as Config from 'Config';
import {DashboardMenuItem} from "./DashboardMenuItem";
import {DashboardContent} from "./DashboardContent";
import UserController from "../../auth/UserController";
import {FeatureFlag} from "../../auth/FeatureFlag";
import {ThemeController} from "../../controller/ThemeController";

export function DashboardMenuItems(): React.ReactComponentElement<typeof DashboardMenuItem>[] {
    return [
        workspace(),
        home(),
        latestModule(),
        myDesign(),
        partnerDesign(),
        community(),
        shared(),
    ];
}

function home() {
    return <DashboardMenuItem
        id={'dashboard-home'}
        title={'My Dashboard'}
        tabSelection={DashboardContent.DASHBOARD}
    />
}

function workspace() {
    const title = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_DASHBOARD_UI) ? 'Playground' : 'Workspace';

    return <DashboardMenuItem
        id={'workspace'}
        title={title}
        tabSelection={'WORKSPACE'}
        specialTheme={ThemeController.getInstance().THEME}
    />
}

function latestModule() {
    return <DashboardMenuItem
        id={'dashboard-latest-module'}
        title={'Latest Modules'}
        tabSelection={DashboardContent.LATEST_MODULES}
    />
}

function myDesign() {
    return <DashboardMenuItem
        id={'dashboard-my-designs'}
        title={'My Designs'}
        tabSelection={DashboardContent.MY_DESIGNS}
    />
}

function partnerDesign() {
    return <DashboardMenuItem
        id={`dashboard-${ThemeController.getInstance().PARTNER_NAME.toLowerCase()}`}
        title={`${ThemeController.getInstance().PARTNER_NAME} Designs`}
        tabSelection={DashboardContent.PARTNER}
    />
}

function community() {
    return <DashboardMenuItem
        id={'dashboard-community'}
        title={'Community Designs'}
        tabSelection={DashboardContent.COMMUNITY}
    />
}

function shared() {
    return <DashboardMenuItem
        id={'dashboard-shared'}
        title={'Shared With Me'}
        tabSelection={DashboardContent.SHARED}
    />
}
