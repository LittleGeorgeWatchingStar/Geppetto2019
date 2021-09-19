import userController from 'auth/UserController';
import * as Backbone from 'backbone';
import {Design} from 'design/Design';
import {DesignController, DesignLoader} from 'design/DesignController';
import {Dialog} from 'view/Dialog';
import DialogManager from "./view/DialogManager";
import {getCollaborationGateway} from "./design/sharing/CollaborationGateway";
import {Collaboration} from "./design/sharing/Collaboration";
import SaveOrDiscardDialog from "./view/SaveOrDiscardDialog";
import {TabNavigation} from "./view/TabNavigation";
import {DesignsTab} from "./view/DesignsTab";
import {BoardBuilderDialogController,} from "./design/boardbuilder/BoardBuilderDialogController";
import {ModuleFilterController} from "./module/filter/ModuleFilterController";
import {DashboardContent} from "./view/dashboard/DashboardContent";
import events from "./utils/events";
import {DASHBOARD_ACTION} from "./view/events";
import {ThemeController} from "./controller/ThemeController";
import * as Cookies from 'js-cookie';
import {AdlinkUserTrackerController} from "./adlink/AdlinkUserTrackerController";

enum Subdomain {
    GEPPETTO = 'geppetto',
    ADLINK = 'adlink',
}

/**
 * Routes determine what part of the app is shown to users on load.
 * This handles navigation to Workspace, My Account, etc. tabs as well as route paths within those tabs.
 */
export class Router {

    private router: Backbone.Router;

    constructor(designTabs: DesignsTab[], dashboardMenuUrls: string[]) {
        Backbone.history.start();
        this.initModuleFilterController();
        this.initTheme();
        this.addRoutes(designTabs, dashboardMenuUrls);
        Backbone.history.loadUrl();
    }

    private initModuleFilterController(): void {
        const hash = Backbone.history.getHash();

        if (!hash || hash.charAt(0) !== '!') {
            return;
        }

        const queryStartIndex = hash.indexOf('?');

        if (queryStartIndex < 0) {
            return;
        }

        const queryString = hash.substr(queryStartIndex);
        const params = new URLSearchParams(queryString);

        ModuleFilterController.getInstance().setByUrlSearchParams(params);
    }

    private initTheme(): void {
        const subdomain = window.location.hostname.split('.')[0];
        if (subdomain !== Subdomain.GEPPETTO) {
            ThemeController.getInstance().applyTheme(subdomain);
        }

        if (subdomain === Subdomain.ADLINK) {
            AdlinkUserTrackerController.getInstance().initEventSubscriptions();
            AdlinkUserTrackerController.getInstance().trackCurrentUser();
            // TODO: Hold off on auto filters for now.
            // ModuleFilterController.getInstance().addFilter('adlink');
            // ModuleFilterController.getInstance().addFilter('software');
        }

        if (Cookies.get('applyTheme')) {
            const theme = Cookies.get('applyTheme');
            ThemeController.getInstance().applyTheme(theme);
        }

        const hash = Backbone.history.getHash();

        if (!hash || hash.charAt(0) !== '!') {
            return;
        }

        const queryStartIndex = hash.indexOf('?');

        if (queryStartIndex < 0) {
            return;
        }

        const queryString = hash.substr(queryStartIndex);
        const params = new URLSearchParams(queryString);

        if (params.has('applyTheme')) {
            const theme = params.get('applyTheme');
            ThemeController.getInstance().applyTheme(theme);
        }
    }

    private addRoutes(designTabs: DesignsTab[], dashboardMenuUrls: string[]): void {
        const dashboardTab = designTabs.find((value => {
            return value.url === DashboardContent.DASHBOARD
        }));
        const openBoardBuilder = (path?: string) => {
            return BoardBuilderDialogController.getInstance().openBoardBuilderDialog(path);
        };
        const routes = {
            '(!/)': () => TabNavigation.openDashboard(),
            '(!/)dashboard(/)': () => {
                dashboardTab.setMenuSelection(DashboardContent.DASHBOARD);
                events.publish(DASHBOARD_ACTION);
                TabNavigation.openDashboard();
            },
            '(!/)dashboard/preview/:id(/)': (id) => {
                dashboardTab.setMenuSelection(DashboardContent.DASHBOARD);
                events.publish(DASHBOARD_ACTION);
                TabNavigation.openDashboard();
                dashboardTab.openPreview(id);
            },
            '(!/)new(/)': () => this.newDesign(),
            '(!/)design/:id(/)': id => this.openDesign(id),
            '(!/)workspace(/)': () => TabNavigation.openWorkspace(),
            '(!/)workspace/boardbuilder(/)': () => {
                TabNavigation.openWorkspace();
                openBoardBuilder();
            },
            '(!/)workspace/boardbuilder/:path(/)': path => {
                TabNavigation.openWorkspace();
                openBoardBuilder(path);
            },
            '(!/)module-edit(/)': () => {
                TabNavigation.openModules();
            }
        };

        this.openSpecificCustomizedModule(routes);

        for (const url of dashboardMenuUrls) {
            this.addDashboardMenuOpenRoute(url, routes, dashboardTab);
            this.addDashboardPreviewOpenRoute(url, routes, dashboardTab);
            this.addFilterTabRoute(url, routes, dashboardTab);
        }
        // "Not found" must be last due to being a catch-all wildcard.
        // Note that this can make routes difficult to test, as anything caught by the wildcard will revert to /!.
        routes['(*notFound)'] = () => this.notFound();
        this.router = new Backbone.Router({
            routes: routes
        });
    }

    /**
     * For opening the menu tabs in dashboard
     */
    private addDashboardMenuOpenRoute(url: string, routes: object, tab: DesignsTab): void {
        routes[`(!/)dashboard/${url}(/)`] = () => {
            tab.setMenuSelection(url);
            events.publish(DASHBOARD_ACTION);
            TabNavigation.openDashboard();
        };

        // Redirect old routes.
        routes[`(!/)${url}(/)`] = () => {
            Backbone.history.navigate(`!/dashboard/${url}`, {
                trigger: true,
                replace: true,
            });
        };
    }

    private addDashboardPreviewOpenRoute(url: string, routes: object, tab: DesignsTab): void {
        routes[`(!/)dashboard/${url}/preview/:id(/)`] = id => {
            tab.setMenuSelection(url);
            events.publish(DASHBOARD_ACTION);
            TabNavigation.openDashboard();
            tab.openPreview(id);
        };

        // Redirect old routes.
        routes[`(!/)${url}/preview/:id(/)`] = id => {
            Backbone.history.navigate(`!/dashboard/${url}/preview/${id}`, {
                trigger: true,
                replace: true,
            });
        };
    }

    /**
     * Filters designs inside a DesignPreviewTab based on module ids in the route path.
     */
    private addFilterTabRoute(url: string, routes: object, tab: DesignsTab): void {
        routes[`(!/)dashboard/${url}/:ids(/)`] = ids => {
            tab.setMenuSelection(url);
            tab.filterByModuleIds(ids.split(','));
            TabNavigation.openDashboard();
        };

        // Redirect old routes.
        routes[`(!/)${url}/:ids(/)`] = ids => {
            Backbone.history.navigate(
                `!/dashboard/${url}/${ids}`,
                {
                    trigger: true,
                    replace: true
                });
        };
    }

    private newDesign(): void {
        if (!DesignController.hasUnsavedChanges()) {
            TabNavigation.openWorkspace();
            DesignController.createNewDesign();
            return;
        }
        TabNavigation.openWorkspace();
        DialogManager.create(SaveOrDiscardDialog, {
            title: 'Warning',
            callBack: DesignController.createNewDesign,
            action: 'to a new design'
        });
    }

    private notFound(): void {
        if (!DesignController.hasUnsavedChanges()) {
            this.backToStart();
            return;
        }
        DialogManager.create(SaveOrDiscardDialog, {
            title: 'Warning',
            callBack: () => this.backToStart(),
            action: 'to another page'
        });
    }

    private openDesign(id: string): void {
        TabNavigation.openWorkspace();
        this.checkOpenDesign(() => {
            const dialog = DialogManager.create(Dialog, {title: 'Loading'}).waiting();
            const design_id = parseInt(id, 10);
            DesignController.fetchDesign(design_id)
                .always(dialog.close)
                .fail(() => {
                    this.createOpenDesignError();
                    this.backToStart();
                })
                .done((design) => {
                    checkPermission(design);
                });
        });
    }

    private checkOpenDesign(openDesign: () => void) {
        if (!DesignController.hasUnsavedChanges()) {
            openDesign();
            return;
        }
        DialogManager.create(SaveOrDiscardDialog, {
            title: 'Warning',
            callBack: openDesign
        });
    }

    private createOpenDesignError(): void {
        const user = userController.getUser();
        if (user.isLoggedIn()) {
            DialogManager.create(Dialog, {
                title: 'Error',
                html: 'Sorry, could not open the requested design. It may be private.'
            }).alert();
        } else {
            DialogManager.create(Dialog, {
                title: 'Error',
                html: 'Sorry, could not open the requested design. It might be private, ' +
                    'and you may be able to view it by logging in.'
            }).alert();
        }
    }

    private openSpecificCustomizedModule (routes: object): void {
        routes[`(!/)module-edit/:id(/)`] = id => {
            TabNavigation.openModules(id);
        };
    }

    private backToStart(): void {
        this.router.navigate('!/new', {trigger: true});
    }
}

export function checkPermission(design: Design): void {
    const user = userController.getUser();
    if (design.isOwnedBy(user)) {
        DesignLoader.of(design.getCurrentRevisionId()).open();
    } else if (user.isEngineer()) {
        createOpenOrCloneDialog(design);
    } else {
        checkCollaborator(design);
    }
}

function checkCollaborator(design: Design): void {
    getCollaborationGateway().getPermission(design.getId()).done(permission => {
        if (permission === Collaboration.EDIT_PERMISSION) {
            createOpenOrCloneDialog(design);
        } else {
            DesignLoader.of(design.getCurrentRevisionId()).clone();
        }
    });
}

function createOpenOrCloneDialog(design: Design): void {
    const dialog = DialogManager.create(Dialog, {
        title: 'Warning',
        html: 'This design does not belong to you. <br>' +
            'You can clone the design and work on your own version, or ' +
            'you can open and directly edit the user\'s design.'
    });

    const clone_button = dialog.makeButton('Clone',
        () => DesignLoader.of(design.getCurrentRevisionId()).clone());

    const open_button = dialog.makeButton('Open',
        () => DesignLoader.of(design.getCurrentRevisionId()).open());

    dialog.buttons([clone_button, open_button], 'Cancel');
}
