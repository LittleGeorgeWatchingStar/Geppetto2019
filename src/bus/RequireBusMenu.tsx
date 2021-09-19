import {ExclusionMenu} from "./exclusion/ExclusionMenu";
import {RequireBus} from "./RequireBus";
import {RequireBusView} from "./RequireBusView";
import {BusMenu, BusMenuOptions} from "./BusMenu";
import {SubMenu} from "../view/SubMenu";
import * as React from "react";
import BomOptionView from "../module/BomOption/BomOptionView";
import {OptionalRequireBusMenu} from "./optional/OptionalRequireBusMenu";
import {getConnectionState} from "../core/NeedsConnections";

/**
 * Renders the entire require bus menu, including bus exclusions and
 * BOM options.
 */
export class RequireBusMenu extends BusMenu {

    private subMenus: SubMenu[];

    initialize(options: BusMenuOptions) {
        super.initialize(options);
        this.subMenus = [];
        this.setupMenu();
        return this;
    }

    protected buildMenu() {
        this.addMenuTitle();
        this.addMenuPage();
        this.renderRequires();
        this.renderExclusionSets();
        this.renderBomOptions();
        this.addPointer();
    }

    private addPointer(): void {
        this.$el.append('<div class="pointer right"></div>');
    }

    private renderRequires(): void {
        let counter = 0;
        for (const bus of this.buses) {
            if (!this.isRequireVisible(bus as RequireBus)) {
                continue;
            }
            if ((bus as RequireBus).isOptional) {
                this.addSubMenu(new OptionalRequireBusMenu({model: bus}));
            } else {
                this.addBus(bus);
                // Bind the bus selection with the counting total connected buses function for each module
                // This should only run once (place in the initialize not working)
                this.listenTo(bus, "change:options change:selected change:exclude", () => this.addMenuTitle(this.getConnectedBus()));
            }
            counter++;
            if (counter % this.paginate === 0) {
                this.addMenuPage();
            }
        }
        if (this.numPages > 1) {
            this.addMenuControls();
        }
    }

    private getConnectedBus(): number {
        const connectedBuses = this.buses.filter(bus => {
            return getConnectionState(bus as RequireBus) === 'connected' && bus.name !== 'VLOGIC';
        }).length;
        return connectedBuses;
    }

    private isRequireVisible(require: RequireBus): boolean {
        return !require.implementsVlogicTemplate() && !require.hasExclusions();
    }

    private renderExclusionSets(): void {
        for (const exclusionSet of this.model.exclusionSets) {
            const submenu = new ExclusionMenu({collection: exclusionSet});
            this.addSubMenu(submenu);
        }
    }

    private addSubMenu(submenu: SubMenu): void {
        this.subMenus.push(submenu);
        this.addView(submenu);
    }

    private renderBomOptions(): void {
        if (!this.model.hasBomOptions()) {
            return;
        }
        this.model.bomOptions.forEach(b => this.addSubMenu(new BomOptionView({model: b})));
    }

    protected getBusView(bus: RequireBus): RequireBusView {
        return new RequireBusView({model: bus});
    }

    private closeSubmenus(event): void {
        const $clickTarget = $(event.target);
        for (const submenu of this.subMenus) {
            submenu.checkHideMenu($clickTarget);
        }
    }

    events() {
        return {
            touchmove: this.cancelMenuDrag,
            click: event => event.stopPropagation(),
            'click .menu-page > .bus:not(.optional)': event => this.closeSubmenus(event),
            'mouseenter .submenu-option': event => this.closeSubmenus(event),
            'click .next': (event) => this.nextPage(event),
            'click .prev': (event) => this.previousPage(event),
            mousewheel: (event) => this.scrollMenu(event),
            mouseenter: this.onMouseOver
        }
    }
}
