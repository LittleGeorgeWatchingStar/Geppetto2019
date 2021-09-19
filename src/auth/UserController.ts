import * as Config from 'Config';
import {model} from 'model';
import events from 'utils/events';
import validate from 'utils/validate';
import OpenDialog, {OpenDialogOptions} from 'view/OpenDialog';
import {
    DASHBOARD_MENU_COLLAPSE,
    SERVER_lOGIN,
    SERVER_LOGOUT,
    USER_EDIT_FLAGS, USER_EDIT_PARTNER_THEME,
    USER_PROFILE,
    USER_TUTORIAL_TOGGLE
} from "./events";
import Auth from "./Auth";
import User from './User';
import {UserGateway} from "./UserGateway";
import DialogManager from "../view/DialogManager";
import {LOAD_DESIGN_DIALOG, THEME} from "../toolbar/events";
import {openFlagDialog} from "./openUserFlagEditor";
import * as Cookies from 'js-cookie';
import {Themes} from "../Themes";
import {openThemeControlDialog} from "./ThemeControl";

let profileWindow = null;

function getUser(): User {
    return model.user;
}

function checkTitle(title: string): string | null {
    const user = getUser();
    const existing_design = user.findDesignByTitle(title);

    if (!validate.isValid(title)) {
        return "Invalid title";
    } else if (existing_design) {
        return "Title already used";
    } else {
        return null;
    }
}

function checkDescription(description: string): string | null {
    if (!description || !description.trim().length) {
        return "Description is required";
    } else if (description.length > 500) {
        return "The description cannot be more than 500 characters."
    }
    return null;
}

function theme(): string {
    const theme_name = Cookies.get('theme');
    if (theme_name === 'blue'){
        events.publishEvent(THEME, {name: Themes.DEFAULT});
        return 'default';
    }
    return theme_name || 'default';
}

function isTutorialEnabled(): boolean {
    const hintsOn = Cookies.get('hints') || 'true';
    return hintsOn === 'true';
}

function toggleTutorial(): void {
    const newState = !isTutorialEnabled();
    Cookies.set('hints', newState.toString(), {expires: 10000, sameSite: 'lax'});
    events.publish(USER_TUTORIAL_TOGGLE);
}

function isDashboardMenuCollapsed(): boolean {
    const dashboard_menu_collapse = Cookies.get('menuCollapsed') || 'true';
    return dashboard_menu_collapse === 'true';
}

function toggleDashboardMenuCollapse(): void {
    const newState = !isDashboardMenuCollapsed();
    Cookies.set('menuCollapsed', newState.toString(), {expires: 10000, sameSite: 'lax'});
    events.publish(DASHBOARD_MENU_COLLAPSE);
}

/**
 * Event called when a user's profile is updated.
 */
function updateProfile() {
    const user = getUser();
    const gateway = new UserGateway();
    gateway.sync(user);
}

/**
 * Event fired when the 'Edit Profile' button is clicked.
 */
function profile() {
    if (profileWindow !== null) {
        profileWindow.close();
    }

    profileWindow = window.open(`${Config.AUTH_URL}/settings/?next=${Config.APP_URL}/profile_success.html`,
        '_blank',
        'width=500,height=600,scrollbars=yes');

    const polling = setInterval(() => {
        if (profileWindow.closed) {
            clearInterval(polling);
            updateProfile();
        }
    }, 100);
}

/**
 * When the 'Open' icon is clicked, open a dialog listing designs.
 */
function loadDesignDialog(): void {
    DialogManager.create(OpenDialog, {
        designs: getUser().getDesigns()
    } as OpenDialogOptions);
}

let initialized = false;
function init(user_data) {
    Auth.setGlobalUser(new User(user_data));
    if (initialized) {
        return;
    }
    initialized = true;
    events.subscribe(USER_PROFILE, profile);
    events.subscribe(USER_EDIT_FLAGS, () => openFlagDialog());
    events.subscribe(USER_EDIT_PARTNER_THEME, () => openThemeControlDialog());
    events.subscribe(LOAD_DESIGN_DIALOG, loadDesignDialog);
    events.subscribe(SERVER_lOGIN, Auth.login);
    events.subscribe(SERVER_LOGOUT, Auth.clearGlobalUser);
    getUser().fetchDesigns();
}

export default {
    init: init,
    theme: theme,
    isTutorialEnabled: isTutorialEnabled,
    toggleTutorial: toggleTutorial,
    isDashboardMenuCollapsed: isDashboardMenuCollapsed,
    toggleDashboardMenuCollapse: toggleDashboardMenuCollapse,
    checkTitle: checkTitle,
    checkDescription: checkDescription,
    profile: profile,
    getUser: getUser
}
