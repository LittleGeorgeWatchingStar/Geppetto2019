import * as Backbone from "backbone";
import {DesignsTab} from "../DesignsTab";
import {Library} from "../../module/Library";
import events from "../../utils/events";
import {DASHBOARD_MENU_COLLAPSE, USER_CHANGED} from "../../auth/events";
import {
    DESIGN_DELETE_COMPLETE,
    DESIGN_SAVE_COMPLETE,
    IMAGE_SAVE_COMPLETE
} from "../../design/events";
import {TabSpec} from "../TabNavigation";
import {DesignController} from "../../design/DesignController";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {Design} from "../../design/Design";
import UserController from "../../auth/UserController";
import {FetchDesignParams} from "../../design/api";
import {
    ExpandedDesignDialog,
    ExpandedDesignDialogOptions
} from "../../design/designpreview/ExpandedDesignDialog";
import {DashboardContent} from "./DashboardContent";
import {DASHBOARD_ACTION, SAVE_DESIGN} from "../events";
import {ServerConfigController} from "../../core/server-config/server-config.controller";
import {ThemeController} from "../../controller/ThemeController";
import {ServerID} from "../../model/types";
import {Module} from "../../module/Module";


/**
 * The starting dashboard when you load into Geppetto.
 */
export class Dashboard extends Backbone.View<any> implements DesignsTab {

    public url: string;

    private library: Library;
    private libraryLoading: boolean = true;

    private userDesigns: Design[];
    private cloneableDesigns: Design[];
    private sharedDesigns: Design[];
    private partnerDesigns: Design[];
    private communityDesigns: Design[];
    private designsLoading: boolean;
    private expandedPreview: ExpandedDesignDialog | null;

    // IDs of modules selected by the filter.
    private selectedModuleIds: Set<ServerID>;

    // TODO: Change menu selection here (and update route) instead in the children.
    private menuSelection: string;

    private showAutobsp: boolean;

    private featuredTemplates: number[];

    initialize(tabSpec: TabSpec) {
        this.url = tabSpec.url;
        this.library = tabSpec.library;

        this.userDesigns = [];
        this.cloneableDesigns = [];
        this.sharedDesigns = [];
        this.partnerDesigns = [];
        this.communityDesigns = [];
        this.designsLoading = true;

        this.selectedModuleIds = new Set<ServerID>();

        this.menuSelection = DashboardContent.DASHBOARD;

        this.expandedPreview = null;

        this.showAutobsp = true;

        this.featuredTemplates = [];

        this.listenTo(events, USER_CHANGED, () => this.onUserChanged());
        this.listenTo(events, DESIGN_SAVE_COMPLETE, () => this.loadUserDesigns());
        this.listenTo(events, SAVE_DESIGN, () => this.loadUserDesigns());
        this.listenTo(events, DESIGN_DELETE_COMPLETE, () => this.loadUserDesigns());
        this.listenTo(events, IMAGE_SAVE_COMPLETE, () => this.loadUserDesigns());
        this.listenTo(events, DASHBOARD_ACTION, () => this.render());
        this.listenTo(events, DASHBOARD_MENU_COLLAPSE, () => this.render());
        return this.render();
    }

    public setShowAutobsp(showAutobsp: boolean) {
        this.showAutobsp = showAutobsp;
        this.render();
    }

    public setFeaturedTemplates(featuredTemplates: number[]) {
        this.featuredTemplates = featuredTemplates;
        this.render();
    }

    public get className(): string {
        return 'dashboard tabview';
    }

    public onModulesLoaded(): void {
        this.libraryLoading = false;
        this.render();
        if (this.expandedPreview) {
            this.expandedPreview.render();
        }
    }

    public render(): this {
        const element = <DashboardContent cloneableDesigns={this.cloneableDesigns}
                                          sharedDesigns={this.sharedDesigns}
                                          userDesigns={this.userDesigns}
                                          partnerDesigns={this.partnerDesigns}
                                          communityDesigns={this.communityDesigns}
                                          library={this.library}
                                          libraryLoading={this.libraryLoading}
                                          url={this.url}
                                          designsLoading={this.designsLoading}
                                          menuSelection={this.menuSelection}
                                          onSelectMenu={(menu) => this.setMenuSelection(menu)}
                                          selectedModuleIds={this.selectedModuleIds}
                                          onClearSelectedModuleIds={() => this.onClearSelectedModuleIds()}
                                          onSelectModule={(module) => this.onSelectModule(module)}
                                          dashboardTab={this}/>;
        ReactDOM.render(element, this.$el.get(0));
        return this;
    }

    /**
     * For usage,
     * @see Router.addPreviewOpenRoute
     */
    public openPreview(id): void {
        id = parseInt(id); // Design IDs from the server are integers.
        const closeUrl = this.getRoute();

        this.expandedPreview = new ExpandedDesignDialog({
            designId: id,
            url: closeUrl,
            showLink: false,
            showAutoBsp: this.showAutobsp,
        } as ExpandedDesignDialogOptions);

        if (!this.designsLoading) {
            this.setPreviewDesign();
        }

        if (this.menuSelection === DashboardContent.DASHBOARD) {
            Backbone.history.navigate(`!/${this.url}/preview/${id}`);
        } else {
            Backbone.history.navigate(`!/${this.url}/${this.menuSelection}/preview/${id}`);
        }

    }

    private setPreviewDesign(): void {
        const id = this.expandedPreview.designId;
        const design = this.findDesignById(id);
        if (design) {
            this.expandedPreview.setShowLink(this.cloneableDesigns.some(d => d.id === design.id), false);
        }
        this.expandedPreview.setDesign(design);
    }

    /**
     * Set initial selected modules.
     */
    public filterByModuleIds(ids: string[]): void {
        this.selectedModuleIds.clear();
        for (const id of ids) {
            this.selectedModuleIds.add(parseInt(id)); // Module IDs from the server are ints.
        }
    }


    /**
     * When selected modules in the filter are cleared.
     */
    private onClearSelectedModuleIds(): void {
        this.selectedModuleIds.clear();
        this.render();
        this.updateRoute();
    }

    /**
     * When a module is select in the filter.
     */
    private onSelectModule(module: Module): void {
        const id = module.moduleId;
        if (this.selectedModuleIds.has(id)) {
            this.selectedModuleIds.delete(id);
        } else {
            this.selectedModuleIds.add(id);
        }

        this.render();
        this.updateRoute();
    }

    public onOpen(): Promise<any> {
        this.closeExpandedPreview();
        this.$el.show();
        this.render();

        this.updateRoute();

        if (this.designsLoading) {
            return this.loadDesigns();
        }
        return Promise.resolve();
    }

    public onClose(): void {
        this.closeExpandedPreview();
        this.$el.hide();
    }

    /**
     * NOTE: Doesn't include design preview modal routes.
     */
    private getRoute(): string {
        if (this.menuSelection === DashboardContent.DASHBOARD) {
            return `!/${this.url}/`;
        }

        if (this.menuSelection === DashboardContent.LATEST_MODULES) {
            return `!/${this.url}/${this.menuSelection}`;
        }

        if (this.selectedModuleIds.size === 0) {
            return `!/${this.url}/${this.menuSelection}`;
        }

        const ids = [];
        this.selectedModuleIds.forEach(id => ids.push(id));
        return `/${this.url}/${this.menuSelection}/${ids.join(',')}`;
    }

    /**
     * TODO: When we have something that handles child routes better than backbone
     *  let child components deal with the child routes?
     */
    private updateRoute(): void {
        Backbone.history.navigate(this.getRoute());
    }

    public onUserChanged(): Promise<any> {
        return Promise.all([
            this.loadUserDesigns(),
            this.loadSharedDesigns()
        ]).then(() => this.render());
    }

    /**
     * Loads designs for all sections of the dashboard.
     */
    public loadDesigns(): Promise<any> {
        return Promise.all([
            this.loadUserDesigns(),
            this.loadCloneableDesigns(),
            this.loadSharedDesigns(),
            this.loadPartnerDesigns(),
            this.loadCommunityDesigns()
        ]).then(() => {
            this.designsLoading = false;
            if (this.expandedPreview) {
                this.setPreviewDesign();
            }
            this.render();
        });
    }

    public loadUserDesigns(): PromiseLike<void> {
        const user = UserController.getUser();
        if (!user.isLoggedIn()) {
            this.userDesigns = [];
            return Promise.resolve();
        }

        user.fetchDesigns(7).then(designs => {
            this.userDesigns = designs.sort((design, other) => other.compareUpdated(design));
            this.render();
        });

        return user.fetchDesigns().then(designs => {
            this.userDesigns = designs.sort((design, other) => other.compareUpdated(design));
            this.render();
        });
    }

    private closeExpandedPreview(): void {
        if (this.expandedPreview) {
            this.expandedPreview.remove();
            this.expandedPreview = null;
        }
    }

    private findDesignById(id: ServerID): Design | undefined {
        const designs = this.userDesigns
            .concat(this.cloneableDesigns)
            .concat(this.sharedDesigns)
            .concat(this.partnerDesigns)
            .concat(this.communityDesigns);
        for (const design of designs) {
            if (design.getId() == id) {
                return design;
            }
        }
    }

    private loadCloneableDesigns(): PromiseLike<void> {
        return DesignController.fetchDesigns({
            endorsement: ThemeController.getInstance().PARTNER_ENDORSEMENT,
        }).then(designs => {
            const overriden_featured = ThemeController.getInstance().OVERRIDE_FEATURED_TEMPLATES;
            if (overriden_featured) {
                this.cloneableDesigns = overriden_featured
                    .map(id => designs.find(d => d.getId() === id))
                    .filter(d => undefined != d); // These may not exist in tests
            } else {
                this.cloneableDesigns = this.featuredTemplates
                    .map(id => designs.find(d => d.getId() === id))
                    .filter(d => undefined != d); // These may not exist in tests
            }
        });
    }

    private loadPartnerDesigns(): PromiseLike<void> {
        return DesignController.fetchDesigns({
            endorsement: ThemeController.getInstance().PARTNER_ENDORSEMENT,
        } as FetchDesignParams).then(designs => {
            this.partnerDesigns = designs.sort((design, other) => other.compareUpdated(design));
        });
    }

    private loadCommunityDesigns(): PromiseLike<void> {
        return DesignController.fetchDesigns({
            'public': true,
            endorsement: ThemeController.getInstance().PARTNER_COMMUNITY_ENDORSEMENT,
        } as FetchDesignParams).then(designs => {
            this.communityDesigns = designs.sort((design, other) => other.compareUpdated(design));
        });
    }

    private loadSharedDesigns(): PromiseLike<void> {
        const user = UserController.getUser();
        if (!user.isLoggedIn()) {
            this.sharedDesigns = [];
            return Promise.resolve();
        }
        return user.fetchCollaboratorDesigns().done(designs => {
            this.sharedDesigns = designs.sort((design, other) => other.compareUpdated(design));
        });
    }

    remove() {
        if (this.expandedPreview) {
            this.expandedPreview.remove();
        }
        return super.remove();
    }

    /**
     * Initial which menu tab has been selected, pass the value to DashboardContent as props.
     */
    public setMenuSelection(menu: string) {
        if (this.menuSelection === menu) {
            return;
        }

        this.menuSelection = menu;

        // TODO: Instead of clearing filter, keep track of the filter for each selection?
        this.onClearSelectedModuleIds();

        this.render();
        this.updateRoute();
    }
}
