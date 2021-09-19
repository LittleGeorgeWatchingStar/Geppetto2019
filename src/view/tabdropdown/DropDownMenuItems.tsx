import {DropDownMenuItem} from "./DropDownMenuItem";
import * as React from "react";
import events from "../../utils/events";
import {LOG_OUT, USER_EDIT_FLAGS, USER_EDIT_PARTNER_THEME, USER_PROFILE} from "../../auth/events";
import {Themes} from "../../Themes";
import {THEME, TUTORIAL_TOGGLE} from "../../toolbar/events";
import userController from "../../auth/UserController";
import {PartnerTheme, ThemeController} from "../../controller/ThemeController";
import {FeatureFlag} from "../../auth/FeatureFlag";

export function DropDownMenuItems(): React.ReactComponentElement<typeof DropDownMenuItem>[][] {
    return [
        [
            profile(),
        ],
        [
            tutorial(),
            darkMode(),
            dashboardMenuCollapse(),
            featureFlags(),
            themeControl(),
        ],
        [
            logout(),
        ]
    ];
}

function profile(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'edit-profile'}
        title={'Edit Profile'}
        onClick={() => events.publishEvent(USER_PROFILE)}
        tooltip={'Editing account infomation'}
    />
}

function tutorial(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'tutorial'}
        title={'Hints'}
        onClick={() => events.publish(TUTORIAL_TOGGLE)}
        tooltip={'Interface tutorial activation'}
        isToggle={true}
        checkActive={userController.isTutorialEnabled()}
    />
}

function darkMode(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'dark-mode'}
        title={'Dark Mode'}
        onClick={() => events.publishEvent(THEME, {name: Themes.BLACK})}
        tooltip={'Changing the theme to dark theme'}
        isToggle={true}
        default={() => events.publishEvent(THEME, {name: Themes.DEFAULT})}
        checkActive={userController.theme() === Themes.BLACK}
    />
}

function dashboardMenuCollapse(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'menu-collapse-toggle'}
        title={'Menu Expansion'}
        onClick={() => userController.toggleDashboardMenuCollapse()}
        tooltip={'Enable/Disable the dashboard menu expansion'}
        isToggle={true}
        checkActive={userController.isDashboardMenuCollapsed()}
    />
}

function featureFlags(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'feature-flags'}
        title={'Feature Flags'}
        onClick={() => events.publishEvent(USER_EDIT_FLAGS)}
        tooltip={'Features activation'}
        isVisible={isBetaTester()}
    />
}

function themeControl(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'theme-control'}
        title={'Theme Control'}
        onClick={() => events.publishEvent(USER_EDIT_PARTNER_THEME)}
        tooltip={'Switch between themes'}
        isVisible={isBetaTester()
        && ThemeController.getInstance().THEME === PartnerTheme.DEFAULT
        && userController.getUser().isFeatureEnabled(FeatureFlag.PARTNER_THEME_CONTROL)}
    />
}

function logout(): React.ReactComponentElement<typeof DropDownMenuItem> {
    return <DropDownMenuItem
        id={'logout'}
        title={'Logout'}
        onClick={() => events.publish(LOG_OUT)}
        tooltip={'Logout of the current account'}
    />
}

function isBetaTester(): boolean {
    const user = userController.getUser();
    if (user) {
        return user.isBetaTester();
    }
    return false;
}
