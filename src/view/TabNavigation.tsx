import * as $ from 'jquery';
import * as Backbone from 'backbone';
import events from 'utils/events';
import * as tabButtonTemplate from 'templates/tab_button';
import * as Config from 'Config';
import {TABBUTTON_CLICKED} from "./events";
import {
    DesignsTab,
    Tab
} from "./DesignsTab";
import {Dashboard} from "./dashboard/Dashboard";
import {FetchDesignParams} from "../design/api";
import {Library} from "../module/Library";
import WorkspaceView from "../workspace/WorkspaceView";
import {LibraryController} from "../module/LibraryController";
import userController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";
import {ModuleEditTab} from "../moduledataviewer/ModuleEditTab";
import {Subscription} from "rxjs";
import * as React from "react";
import {ThemeController} from "../controller/ThemeController";


/**
 * Navigation for tabbing between Workspace, My Account, etc.
 * Includes buttons to log in and log out.
 */
export class TabNavigation {

    /** Show auto BSP. */
    public static SHOW_AUTO_BSP: boolean;
    public static FEATURED_TEMPLATES: number[];

    /**
     * Identifiers for checking tabs/tab buttons. Doubles as a URL relative path.
     */
    public static WORKSPACE = 'workspace';
    public static UPVERTER = 'upvertor-editor';
    public static MODULES = 'modules';
    public static CAD_VIEWER = 'cad-viewer';
    public static MY_DESIGNS = 'my-designs';
    public static PARTNER = ThemeController.getInstance().PARTNER_NAME.toLowerCase();
    public static COMMUNITY = 'community';
    public static SHARED = 'shared';
    public static DASHBOARD = 'dashboard';
    private static TABS: { [TabUrl: string]: Tab } = {};
    private static TAB_BUTTONS_CONTAINER: JQuery | null = null;

    private static USER_CHANGE_FLAG_SUBCRIPTION: Subscription | null = null;

    private constructor() {
    }

    public static initialize(autoBsp: boolean,
                             featuredTemplates: number[],
                             $navContainer: JQuery,
                             $tabContainer: JQuery,
                             workspaceView: WorkspaceView): void {
        TabNavigation.SHOW_AUTO_BSP = autoBsp;
        TabNavigation.FEATURED_TEMPLATES = featuredTemplates;
        TabNavigation.TABS = {};
        TabNavigation.TAB_BUTTONS_CONTAINER = null;
        TabNavigation.TABS[TabNavigation.WORKSPACE] = workspaceView;
        $tabContainer.empty().append(workspaceView.$el);

        TabNavigation.generateTabNav($navContainer, $tabContainer);
        if (TabNavigation.USER_CHANGE_FLAG_SUBCRIPTION) {
            TabNavigation.USER_CHANGE_FLAG_SUBCRIPTION.unsubscribe();
        }
        TabNavigation.USER_CHANGE_FLAG_SUBCRIPTION = userController.getUser().changeFeatureFlags$.subscribe(() => {
            TabNavigation.generateTabNav($navContainer, $tabContainer);
        });
    }

    public static openDashboard(): void {
        this.openTab(TabNavigation.DASHBOARD);
    }

    public static openWorkspace(): void {
        this.openTab(TabNavigation.WORKSPACE);
    }

    public static openModules(id?: number): void {
        if (id) return this.openTab(TabNavigation.MODULES, id);
        this.openTab(TabNavigation.MODULES);
    }

    /**
     * Highlights and opens the selected tab.
     */
    public static openTab(url: string, id?: number): void {
        $('.tabbutton').removeClass('current');
        $(`.tabbutton.${url}`).addClass('current');
        for (const tabUrl in TabNavigation.TABS) {
            const tab = TabNavigation.TABS[tabUrl];
            if (url === TabNavigation.MODULES && id && tab.url === url) {
                return tab.onOpen(id);
            }
            if (tab.url === url) {
                tab.onOpen();
            } else {
                tab.onClose();
            }
        }
    }

    public static onModulesLoaded(): void {
        for (const tab of TabNavigation.designTabs) {
            tab.onModulesLoaded();
        }
    }

    public static get designTabs(): DesignsTab[] {
        const designTabs: DesignsTab[] = [];
        for (const tabUrl in TabNavigation.TABS) {
            const tab = TabNavigation.TABS[tabUrl];
            if (tab.url !== TabNavigation.WORKSPACE &&
                tab.url !== TabNavigation.MODULES &&
                tab.url !== TabNavigation.UPVERTER &&
                tab.url !== TabNavigation.CAD_VIEWER) {
                designTabs.push(tab as DesignsTab);
            }
        }
        return designTabs;
    }

    private static generateTabNav($navContainer: JQuery, $tabContainer: JQuery): void {
        let $buttonContainer;
        if (TabNavigation.TAB_BUTTONS_CONTAINER) {
            $buttonContainer = TabNavigation.TAB_BUTTONS_CONTAINER;
            $buttonContainer.empty();
        } else {
            $buttonContainer = this.buttonContainer;
            $buttonContainer.on('click', '.tabbutton', (event: MouseEvent) => {
                let $button = $(event.target);
                if (!$button.hasClass('tabbutton')) {
                    $button = $button.parent('.tabbutton');
                }
                const url = $button.data('url');
                events.publishEvent(TABBUTTON_CLICKED, {tab: url});
                this.openTab(url);
            });
            $buttonContainer.on('click', '#logo', (event: MouseEvent) => {
                events.publishEvent(TABBUTTON_CLICKED, {tab: TabNavigation.DASHBOARD});
                this.openTab(TabNavigation.DASHBOARD);
            });
        }

        const user = userController.getUser();
        this.generateLogo($buttonContainer);
        for (const spec of NAV_SPECS) {
            if (spec.featureFlag
                && !user.isFeatureEnabled(spec.featureFlag)) {
                if (TabNavigation.TABS.hasOwnProperty(spec.url)) {
                    TabNavigation.TABS[spec.url].$el.remove();
                    delete TabNavigation.TABS[spec.url];
                }
                continue;
            }
            const tabButton = $(tabButtonTemplate(spec));
            $buttonContainer.append(tabButton);


            if (!TabNavigation.TABS.hasOwnProperty(spec.url)) {
                const tabView = getTabView(spec);
                if (tabView) {
                    $tabContainer.append(tabView.$el);
                    TabNavigation.TABS[spec.url] = tabView;
                }
            }
        }

        if (!TabNavigation.TAB_BUTTONS_CONTAINER) {
            TabNavigation.TAB_BUTTONS_CONTAINER = $buttonContainer;
            $navContainer.append($buttonContainer);
        }
    }

    private static generateLogo($buttonContainer: JQuery): void {
        $buttonContainer.append(`<button id="logo"><img src="${getIconUrl(ThemeController.getInstance().GENERAL_LOGO)}"/></button>`);
    }

    private static get buttonContainer(): JQuery {
        return $('<div class="tabbutton-container"></div>');
    }
}

/**
 * Requirements of tab buttons.
 */
export interface NavSpec {
    title: string;
    url: string;
    icon: string;
    featureFlag?: FeatureFlag;
}

/**
 * Requirements of design tab views.
 */
export interface TabSpec extends Backbone.ViewOptions<any> {
    url: string;
    library: Library;
    pageTitle?: string; // The tab title masthead.
    parameters?: FetchDesignParams;
}


function getTabView(spec: NavSpec): Tab | undefined {


    switch (spec.url) {
        case TabNavigation.MODULES:
            return new ModuleEditTab({
                url: spec.url,
                pageTitle: 'Modules',
            } as TabSpec);

        case TabNavigation.DASHBOARD:
            const tab = new Dashboard({
                url: spec.url,
                library: LibraryController.getLibrary(),
            } as TabSpec);

            tab.setShowAutobsp(TabNavigation.SHOW_AUTO_BSP);
            tab.setFeaturedTemplates(TabNavigation.FEATURED_TEMPLATES);

            return tab;
    }
}

function getIconUrl(icon: string): string {
    return `${Config.STATIC_URL}/image/icons/${icon}`;
}

/**
 * Information for the tab navigation buttons, displayed in the same order.
 */
const NAV_SPECS = [
    {
        title: 'DASHBOARD',
        url: TabNavigation.DASHBOARD,
    },
    {
        title: 'WORKSPACE',
        url: TabNavigation.WORKSPACE,
    },
    {
        title: 'Modules',
        url: TabNavigation.MODULES,
        featureFlag: FeatureFlag.UPVERTER_MODULE_EDIT,
    },
] as NavSpec[];




