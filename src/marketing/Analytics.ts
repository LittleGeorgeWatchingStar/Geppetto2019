import * as Config from "Config";
import {
    DESIGN_CLONE,
    DESIGN_DELETE_COMPLETE,
    DESIGN_OPEN,
    DESIGN_SAVE_COMPLETE,
    DESIGN_SHARE_COMPLETE,
    SaveCompleteEvent
} from "design/events";
import {MODULE_PUT, MODULE_TILE_CLICK, ModuleEvent} from "module/events";
import events from "utils/events";
import {TOOLBUTTON_CLICKED} from "../toolbar/events";
import {SERVER_lOGIN, SERVER_LOGOUT} from "../auth/events";
import {BUILD_BOARD, BuildBoardEvent, POWER_BOARD, PowerBoardEvent} from "../workspace/events";
import {DASHBOARD_ACTION, DashboardActionEvent, TABBUTTON_CLICKED} from "../view/events";
import {PLACED_MODULE_REMOVE} from "../placedmodule/events";

/**
 * The global Google Analytics (GA) object.
 */
declare const ga;

/**
 * Base class for GA event listeners.
 *
 * @see https://developers.google.com/analytics/devguides/collection/analyticsjs/events#implementation
 */
abstract class EventListener {
    /**
     * The GA event category.
     */
    protected abstract category: string;

    /**
     * Helper method that sends the custom event to GA.
     * @param {string} action: What's being performed, eg. "Add [Module]"
     * @param {string} label: The particular item being acted upon. Eg. "Raspberry Pi Compute Module Connector."
     * @param {number} value: Assign an integer to the action to represent how much it's "worth."
     */
    protected track(action: string, label?: string, value?: number): void {
        const options: any = {
            hitType: 'event',
            eventCategory: this.category,
            eventAction: action
        };
        if (label) {
            options.eventLabel = label;
        }
        if (value) {
            options.eventValue = value;
        }
        if (Config.DEBUG) {
            console.log('ga:send', options);
        }
        if (typeof ga === 'function') {
            ga('send', options);
        }
    }
}

class DesignListener extends EventListener {
    protected category = 'Designs';

    open(event) {
        this.track('Open', event.designId);
    }

    clone(event) {
        this.track('Clone', event.designId);
    }

    /**
     * When a design is successfully saved.
     */
    save(event: SaveCompleteEvent) {
        if (event.isNewDesign) {
            this.track('Initial save');
        }
    }

    /**
     * When a design has been shared.
     */
    share(event) {
        this.track('Shared', event.designId);
    }

    /**
     * When a design has been deleted.
     * designId left out: it's not really useful here.
     */
    designDelete() {
        this.track('Deleted');
    }

    push() {
        this.track('Push');
    }

    public boardBuild(event: BuildBoardEvent): void {
        const id = event.designRevision.id ? event.designRevision.id : 'Unsaved design';
        this.track('Build Board', id);
    }

    public powerBoard(event: PowerBoardEvent): void {
        const id = event.designRevision.id ? event.designRevision.id : 'Unsaved design';
        this.track('Power Board', id);
    }
}

const designs = new DesignListener();

class ModuleListener extends EventListener {
    protected category = 'Modules';

    add(event: ModuleEvent) {
        const module = event.model;
        this.track('Add', module.name);
    }

    remove(event) {
        const placed_module = event.model;
        const title = placed_module.getTitle();
        this.track('Remove', title);
    }

    click(module) {
        this.track('Click', module.name);
    }
}

const modules = new ModuleListener();

class ToolbarListener extends EventListener {
    protected category = 'Toolbar';

    onClick(event) {
        this.track(event.title);
    }
}

const toolbar = new ToolbarListener();

class TabsListener extends EventListener {
    protected category = 'Tabs';

    tab(event) {
        const action = event.tab.substr(0, 1).toUpperCase() + event.tab.substr(1, event.tab.length - 1);
        this.track(action);
    }
}

const tabs = new TabsListener();

class UserListener extends EventListener {
    protected category = 'User';

    setGlobalUser() {
        this.track('Login');
    }

    clearGlobalUser() {
        this.track('Logout');
    }
}

const user = new UserListener();


class DashboardListener extends EventListener {
    protected category = 'Dashboard';

    action(event: DashboardActionEvent) {
        this.track(event.action, event.label);
    }
}

const dashboard = new DashboardListener();


const appLoad = new class AppLoadListener extends EventListener {
    protected category = 'App Load';

    /**
     * Track when the loading splash has been removed.
     * @param ms: The time taken for this event to occur since the app started.
     */
    loaderRemoved(ms: number): void {
        this.track('Loader Removed', `${ms.toString()} ms`);
    }

    /**
     * Track when the app has finished fetching all modules.
     * @param ms: The time taken for this event to occur since the app started.
     */
    modulesLoaded(ms: number): void {
        this.track('Modules Loaded', `${ms.toString()} ms`);
    }
};

const designHelper = new class DesignHelperTracker extends EventListener {
    protected category = 'Design Helper';

    tabChanged(tab: string): void {
        this.track('Tab Changed', tab);
    }

    listItemClick(tab: string): void {
        this.track('List Item Click', tab);
    }

    clickValidate(): void {
        this.track('Click Validate');
    }
};

/**
 * Track events related to the design validation process.
 */
const validation = new class ValidationTracker extends EventListener {
    protected category = "Validation";

    pushDialog(): void {
        this.track('Open Push Dialog');
    }
};

const cadDownload = new class CadDownloadTracker extends EventListener {
    protected category = "CAD Download";

    acceptLicense(designId): void {
        this.track('Accept License Agreement', `Design: '${designId}'`);
    }

    filesDownloaded(designId): void {
        this.track('Files Downloaded', `Design: '${designId}'`);
    }

    compileError(designId): void {
        this.track('Compile Error', `Design: '${designId}'`);
    }
};

export const Analytics = {
    init: () => {
        events.subscribe(DESIGN_OPEN, event => designs.open(event));
        events.subscribe(DESIGN_CLONE, event => designs.clone(event));
        events.subscribe(DESIGN_SAVE_COMPLETE, event => designs.save(event));
        events.subscribe(DESIGN_SHARE_COMPLETE, event => designs.share(event));
        events.subscribe(DESIGN_DELETE_COMPLETE, () => designs.designDelete());
        events.subscribe(BUILD_BOARD, event => designs.boardBuild(event));
        events.subscribe(POWER_BOARD, event => designs.powerBoard(event));

        events.subscribe(MODULE_PUT, event => modules.add(event));
        events.subscribe(PLACED_MODULE_REMOVE, event => modules.remove(event));
        events.subscribe(MODULE_TILE_CLICK, module => modules.click(module));

        events.subscribe(TOOLBUTTON_CLICKED, event => toolbar.onClick(event));
        events.subscribe(TABBUTTON_CLICKED, event => tabs.tab(event));

        events.subscribe(SERVER_lOGIN, () => user.setGlobalUser());
        events.subscribe(SERVER_LOGOUT, () => user.clearGlobalUser());

        events.subscribe(DASHBOARD_ACTION, event => dashboard.action(event));
    },
    loaderRemoved: ms => appLoad.loaderRemoved(ms),
    modulesLoaded: ms => appLoad.modulesLoaded(ms),
    designHelper: designHelper,
    validation: validation,
    design: designs,
    cadDownload: cadDownload,
};
