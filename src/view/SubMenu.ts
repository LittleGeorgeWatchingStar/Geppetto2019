import * as Backbone from "backbone";
import {WORKSPACE_CLICK} from "../workspace/events";
import events from "../utils/events";


/**
 * A submenu view containing buses/options, for example, displaying exclusions or BOM options.
 */
export abstract class SubMenu extends Backbone.View<any> {

    /**
     * A setting that toggles when this submenu is clicked.
     * If true, it will prevent closing the menu on mouseleave.
     */
    private clickedOpen: boolean;

    get tagName(): string {
        return 'li';
    }

    initialize() {
        this.$el.addClass('sub-menu');
        this.listenTo(events, WORKSPACE_CLICK, () => this.hideMenu());
        this.createMenu();
        this.hideMenu();
        return this;
    }

    /**
     * Hides the menu unless the mouseenter target is this menu.
     */
    public checkHideMenu(target: JQuery): void {
        if (!target.is(this.$('.submenu-option'))) {
            this.hideMenu();
        }
    }

    protected abstract get submenuItemContent(): string;

    protected createMenu(): void {
        const menuItem = `<div class="submenu-option">${this.submenuItemContent}</div>`;
        this.$el.append(menuItem);
    }

    private openMenu(): void {
        this.$('ol').show();
    }

    /**
     * Toggles the mouseleave hide behaviour on the menu:
     * 1) On/off if the container item is clicked.
     * 2) Off if a suboption is selected.
     */
    private setClickOpen(isClickedOpen: boolean): void {
        this.clickedOpen = isClickedOpen;
        this.openMenu();
    }

    private hideUntoggledMenu(): void {
        if (!this.clickedOpen) {
            this.hideMenu();
        }
    }

    private hideMenu(): void {
        this.$('ol').hide();
        this.clickedOpen = false;
    }

    events() {
        return {
            mouseenter: this.openMenu,
            mouseleave: this.hideUntoggledMenu,
            'click .submenu-option': () => this.setClickOpen(!this.clickedOpen),
            'click li': () => this.setClickOpen(true)
        };
    }
}