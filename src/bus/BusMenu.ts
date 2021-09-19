import * as Backbone from "backbone";
import {RequireBusView} from "./RequireBusView";
import {Bus} from "./Bus";
import {RequireBus} from "./RequireBus";
import UserController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";


export interface BusMenuOptions extends Backbone.ViewOptions<any> {
    buses: Bus[];
}

export abstract class BusMenu extends Backbone.View<any> {
    protected buses: Bus[];
    protected numPages: number;
    protected paginate: number;
    protected views: Backbone.View<any>[];
    private currentPage: number;

    initialize(options: BusMenuOptions) {
        // Clone the buses so we can modify them.
        this.buses = options.buses.slice();
        // Keep track of the views for cleanup on removal
        this.views = [];
        this.numPages = 0;
        this.currentPage = 0;
        this.paginate = 8; // How many buses to display before starting a new page.
        return this;
    }

    get className(): string {
        return 'menu';
    }

    remove() {
        for (const view of this.views) {
            view.remove();
        }
        return super.remove();
    }

    protected setupMenu(): void {
        this.buildMenu();
        this.$('.menu-page').hide();
        this.showCurrentPage();
    }

    protected abstract buildMenu(): void;

    protected addMenuControls(): void {
        this.$el.append('<div class="menu-control">' +
            '<div class="prev" title="Previous page"></div>' +
            '<div class="next" title="More options"></div>' +
            '</div>');
        const labelTitle = "Click arrows or scroll to navigate options";
        this.$el.append(`<div class="current-page-label" title="${labelTitle}">${this.currentPageLabel}</div>`);
    }

    protected addMenuTitle(connections?: number): void {
        const newPlaygroundUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_PLAYGROUND_UI);

        if (!connections && this.numPages === 0) {
            this.$el.append(`<h5>${this.model.name}</h5>`);
            if(!newPlaygroundUI) this.$el.append(`<h6>Required Connection (0 / ${this.totalRequiredConnections()})</h6>`);
        } else {
            if(!newPlaygroundUI) this.$('h6').html(`Required Connection (${connections} / ${this.totalRequiredConnections()})`);
        }
    }

    protected addMenuPage(): void {
        this.$el.append(`<ol class="menu-page" data-page="${this.numPages}">`);
        this.numPages++;
    }

    /**
     * Disable or re-enable arrow controls based on the current menu page index.
     */
    private checkControlAvailability() {
        this.$('.prev, .next').removeClass('disabled-js');
        const lastPage = this.numPages - 1;
        const firstPage = 0;

        if (this.currentPage === lastPage) {
            this.$('.next').addClass('disabled-js');
        } else if (this.currentPage === firstPage) {
            this.$('.prev').addClass('disabled-js');
        }
    }

    protected addBus(bus: Bus): void {
        const busView = this.getBusView(bus);
        this.addView(busView);
    }

    protected addView(view: Backbone.View<any>): void {
        this.$el.find('.menu-page').last().append(view.el);
        this.views.push(view);
    }

    protected abstract getBusView(bus: Bus): RequireBusView;

    protected nextPage(event): void {
        this.flipPage(1);
        event.stopPropagation(); // Do not propagate action to workspace
    }

    protected previousPage(event): void {
        this.flipPage(-1);
        event.stopPropagation(); // Do not propagate action to workspace
    }

    private flipPage(direction: number): void {
        const desiredIndex = this.currentPage + direction;
        if (!this.canFlipPage(desiredIndex)) {
            return;
        }

        this.$('.menu-page').hide();
        this.currentPage = desiredIndex;
        this.showCurrentPage();
        this.$('.current-page-label').html(this.currentPageLabel);
    }

    private get currentPageLabel(): string {
        return `Page ${this.currentPage + 1} of ${this.numPages}`;
    }

    private canFlipPage(desiredIndex: number): boolean {
        return desiredIndex >= 0 && desiredIndex < this.numPages;
    }

    private showCurrentPage(): void {
        const currentPage = this.$('[data-page="' + this.currentPage.toString() + '"]');
        currentPage.show();
        this.checkControlAvailability();
    }

    private totalRequiredConnections(): number {
        // check if there are exclustion sets
        // in order to get the correct number for multiple 'choice' situation
        // the final difference will be (totalBusesInvolved - totalExclusionSets)
        const exclustionSets = this.model.exclusionSets;
        let num = 0;
        if (exclustionSets) exclustionSets.forEach(e => num = e.getInclusionSets().length);
        const busSize = this.buses.filter(bus => bus.name !== 'VLOGIC').filter(bus => !(bus as RequireBus).isOptional).length;
        if (exclustionSets) return (busSize - (num - exclustionSets.length));
        return busSize;
    }

    protected cancelMenuDrag(event): void {
        event.stopPropagation();
    }

    protected scrollMenu(event): void {
        if (event.deltaY < 0) {
            this.nextPage(event);
        } else {
            this.previousPage(event);
        }
    }

    protected onMouseOver(): void {
        $('.current-page-label').hide();
        this.$('.current-page-label').show();
    }
}
