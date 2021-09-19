/*!
 * © 2014-2018 Gumstix, Inc. All rights reserved.
 */

/**
 * Main application controller.
 */

"use strict";
import {app} from "app";
import * as Config from "Config";
import threeDModel from "controller/3DModel";
import common from "controller/Common";
import notice from "notice/NoticeController";
import user from "auth/UserController";
import UserController from "auth/UserController";
import customDebug from "customDebug";
import autodoc from "controller/Autodoc";
import * as $ from "jquery";
import "jquery-mousewheel";
import "lib/extensions";

import "lib/jquery-ui";
import logos from "./logo/LogoController";
import * as bodyTemplate from "templates/body";
import tutorial from "tutorial/TutorialController";
import view from "view";
import {UserResource} from "./auth/api";
import {getSettings} from "./settings";
import DeviceTree from "./controller/DeviceTree";
import CadData from "./controller/CadData";
import {actions} from "core/action";
import {TabNavigation} from "./view/TabNavigation";
import {Router} from "./router";
import {Logout} from "./controller/Logout";
import Schematic from "./controller/Schematic";
import WorkspaceView, {WorkspaceViewOptions} from "./workspace/WorkspaceView";
import {Panel} from "./view/librarypanel/Panel";
import {Workspace} from "./workspace/Workspace";
import {DesignController} from "./design/DesignController";
import {LibraryController} from "./module/LibraryController";
import {Analytics} from "./marketing/Analytics";
import BoardController from "./board/BoardController";
import {ServerConfig} from "./core/server-config/server-config";
import {CompiledCadSourceJobController} from "./compiledcadsource/CompiledCadSourceJobController";
import {LoginController} from "./controller/Login";
import {DashboardContent} from "./view/dashboard/DashboardContent";
import {MyAccount} from "./view/MyAccount";


function initApp(serverConfig: ServerConfig, user_data: UserResource) {
    (window as any).debug = Config.DEBUG ? customDebug : {};
    user.init(user_data);
    LoginController.getInstance().init(serverConfig.loginUri);
    new Logout().init();

    $('#body').html(bodyTemplate({
        www_url: Config.WWW_URL,
        static_url: Config.STATIC_URL,
        partner_footer: Config.PARTNER_FOOTER,
        partner_terms_url: Config.PARTNER_TERMS_URL,
        partner_privacy_url: Config.PARTNER_PRIVACY_URL,
        current_year: (new Date()).getFullYear(),
    }));

    const workspace = new Workspace(serverConfig.storeFront, serverConfig.autoBsp);
    const panel = new Panel(workspace);
    const workspaceView = new WorkspaceView({
        model: workspace,
        panel: panel,
        renderBetaFeatures: () => UserController.getUser().isBetaTester(),
    } as WorkspaceViewOptions);
    DesignController.createNewDesign();
    CompiledCadSourceJobController.getInstance(); // Initialize the controller.
    TabNavigation.initialize(
        serverConfig.autoBsp,
        serverConfig.featuredTemplates,
        $("#tabbuttons"),
        $("#alltabcontainer"),
        workspaceView
    );
    MyAccount.init();
    new Router(TabNavigation.designTabs, DashboardContent.dashboardMenuUrls);
    startTimeCount();
    BoardController.loadUnitPrice();
    LibraryController.load(library => {
        TabNavigation.onModulesLoaded();
        panel.onModulesLoaded(library, app.settings.defaultOpenCategory);
        stopTimeCount();
        setUpUnsavedChanges();
    });
    view.init();
    threeDModel.init();
    logos.init();
    common.init();
    Analytics.init();
    notice.init();
    tutorial.init();
    autodoc.init();
    DeviceTree.init();
    CadData.init();
    Schematic.init();
    actions.init();

    removeLoader();
}

let time = 0;
let appStartCounter = null;

function startTimeCount() {
    const ms = 100;
    appStartCounter = setInterval(() => time += ms, ms);
}

function stopTimeCount(): void {
    Analytics.modulesLoaded(time);
    clearInterval(appStartCounter);
}

/**
 * Remove the initial loader screen, revealing the content.
 */
export function removeLoader(): void {
    const $loader = $("#loading");
    if ($loader.length > 0) {
        $loader.remove();
        Analytics.loaderRemoved(time);
    }
}

/*
 * The main entry point after the loader.
 */
function init(serverConfig: ServerConfig, user_data: UserResource) {
    const link = $('link[name="theme"]');

    app.user = user;
    app.settings = getSettings(Config);

    /*
     * Load theme CSS
     */
    link.attr({href: `${Config.CSS_URL}/themes/${user.theme()}.css`});
    // Wait for the CSS to load to avoid a design glitch during initial load
    // Also, 'one' instead of 'on' so that we initialize the app only once.
    // Changing the CSS source as we do when switching themes causes Firefox
    // to send further 'load' events way after the page's initial load. This
    // has caused a problem with invoking Backbone.History.start() multiple
    // times during the router initialization. Instead of worrying about all
    // the possible problems resulting from initializing multiple times,
    // let's simply make sure we don't initialize multiple times.
    link.one('load', function () {
        $('link[name="initial"]').detach();
        initApp(serverConfig, user_data);
    });

    console.info('Geppetto web version:', Config.RELEASE);
}

function setUpUnsavedChanges(): void {
    if (!Config.DEBUG) {
        window.onbeforeunload = () => {
            if (DesignController.hasUnsavedChanges()) {
                return "You are about to leave Geppetto. Any unsaved work will be lost.";
            }
        };
    }
}

export default {
    init: init
}
