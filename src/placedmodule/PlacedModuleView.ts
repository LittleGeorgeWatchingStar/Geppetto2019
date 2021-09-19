import userController from "auth/UserController";
import UserController from "auth/UserController";
import {ProvideBus} from "bus/ProvideBus";
import {ProvideBusMenu} from "bus/ProvideBusMenu";
import FeatureView from "module/feature/FeatureView";
import * as placedModuleTemplate from "templates/placed_module";
import eventDispatcher from "utils/events";
import {RequireBusMenu} from "../bus/RequireBusMenu";
import {getConnectionState} from "../core/NeedsConnections";

import {
    CUSTOM_NAME_INPUT,
    PLACED_MODULE_CLICK,
    PLACED_MODULE_DRAG,
    PLACED_MODULE_REMOVE,
    PLACED_MODULE_SELECT,
    PM_SUBSTITUTE_START
} from "./events";
import {PlacedModule} from "./PlacedModule";
import {PlacedItemView, PlacedItemViewParams} from "../placeditem/view/PlacedItemView";
import {BusMenuOptions} from "../bus/BusMenu";
import {ContextMenuItem} from "../view/ContextMenu";
import {MODULE_DOUBLE_CLICK, PLACED_MODULE_INFO} from "../module/events";
import {openBusListDialog} from "../module/BusList";
import {openConnectionDialog} from "../connection/csv/ConnectionDialog";
import {openModuleDataView} from "../moduledataviewer/openModuleDataView";
import {FeatureFlag} from "../auth/FeatureFlag";
import {
    MOUSEENTER_PROVIDE,
    MOUSELEAVE_PROVIDE,
    SELECT_BOM_OPTION,
    SELECT_REQUIRE,
    SELECTED_REQUIRE_CONNECTION
} from "../bus/events";
import {openModuleBusPinMappingView} from "../modulebuspinmappingviewer/openModuleBusPinMappingView";
import {getKeyName} from "../view/keys";


export class PlacedModuleView extends PlacedItemView<PlacedModule> {
    private provide_menu: ProvideBusMenu;
    private requireMenu: RequireBusMenu;
    private feature_views: FeatureView[];
    private areProvidesSuppressed: boolean;

    initialize(options: PlacedItemViewParams<PlacedModule>) {
        super.initialize(options);

        this.renderFeatures();

        this.renderBuses();
        this.listenTo(this.model, 'change:custom_name', this.renderCustomName);
        this.listenTo(this.model, 'change:options', this.resetProvideBusMenu);
        this.listenTo(this.model, 'initBuses', this.renderBuses);
        this.listenTo(eventDispatcher, SELECTED_REQUIRE_CONNECTION, status => this.updateProvideModuleSelectionColour(status));
        this.listenTo(eventDispatcher, SELECT_BOM_OPTION, () => this.render());
        this.listenTo(eventDispatcher, MOUSEENTER_PROVIDE, cid => this.onProvideMouseenter(cid));
        this.listenTo(eventDispatcher, MOUSELEAVE_PROVIDE, () => this.onProvideMouseexit());
        if (UserController.getUser() || UserController.getUser().isLoggedIn()) {
            if (UserController.getUser().isFeatureEnabled(FeatureFlag.REQUIRE_CONNECT_ERROR_TOOLTIP)) {
                this.listenTo(eventDispatcher, SELECT_REQUIRE, () => this.onSelectRequire());
            }
        }
        return this;
    }

    get name(): string {
        return this.model.customName;
    }

    get provideOptions(): ProvideBus[] {
        return this.model.options;
    }

    /**
     * Search for the provide currently connected to the selected require, if it exists.
     */
    findCurrentlyConnectedProvide(): ProvideBus | undefined {
        return this.provideOptions.find(option => option.isCurrentlyConnected());
    }

    protected get viewClassName(): string {
        return 'module';
    }

    protected get svgContainerSelector(): string {
        return '.module-svg-container';
    }

    protected get clickEventName(): string {
        return PLACED_MODULE_CLICK;
    }

    protected get dragEventName(): string {
        return PLACED_MODULE_DRAG;
    }

    protected get selectEventName(): string {
        return PLACED_MODULE_SELECT;
    }

    protected get removeEventName(): string {
        return PLACED_MODULE_REMOVE;
    }

    protected subsequentRender() {
        const scale = this.workspace.scale;
        const outline = this.model.getOutline();
        const displayOutline = this.model.getDisplayOutline();
        const overlaps = this.model.overlaps();
        const upgraded = this.model.upgraded;
        const rotation = this.model.rotation;

        this.renderConnectionState();

        this.$el.toggleClass('overlaps', overlaps);
        this.$el.toggleClass('upgraded', upgraded);
        this.$el.toggleClass('selected', this.model.isSelected);

        this.$el.css({
            width: outline.width * scale,
            height: outline.height * scale,
        });

        this.$('.svg-container').css({
            'width': displayOutline.width * scale,
            'height': displayOutline.height * scale,
            'margin-left': `${(outline.width - displayOutline.width) * scale / 2}px`,
            'margin-top': `${(outline.height - displayOutline.height) * scale / 2}px`,
        });

        const orthoWidth = outline.width * scale;
        const orthoHeight = outline.height * scale;

        this.$('.module-orthographic-container img').attr('src', this.model.orthographicUrl);

        if (rotation !== 0 && rotation !== 180) {
            const largeValue = orthoWidth >= orthoHeight ? orthoWidth : orthoHeight;
            const smallValue = orthoWidth < orthoHeight ? orthoWidth : orthoHeight;
            const shiftValue = orthoHeight > orthoWidth ? -((largeValue - smallValue) / 2) : (largeValue - smallValue) / 2;

            let transformValue = '';

            if (rotation == 90) {
                transformValue = `rotate(270deg) translate(${shiftValue}px, ${shiftValue}px)`;
            } else {
                transformValue = `rotate(90deg) translate(${-shiftValue}px, ${-shiftValue}px)`;
            }

            this.$('.module-orthographic-container').css({
                'width': outline.width * scale,
                'height': outline.height * scale,
            });

            this.$('.module-orthographic-container img').css({
                'transform': transformValue,
                'height': orthoWidth,
                'width': orthoHeight,
            });
        } else {
            this.$('.module-orthographic-container').css({
                'width': outline.width * scale,
                'height': outline.height * scale,
            });

            this.$('.module-orthographic-container img').css({
                'transform': `rotate(${rotation}deg)`,
                'height': orthoHeight,
                'width': orthoWidth,
            });
        }

        this.$('svg')[0].setAttribute('viewBox', displayOutline.xmin + " " + displayOutline.ymin + " " + displayOutline.width + " " + displayOutline.height);
        this.$('svg > g').attr('transform', "translate(0," + (displayOutline.ymax + displayOutline.ymin) + ") scale(1,-1)");

        const isTextVisible = scale > 0.4;
        this.$('.module-title').toggle(isTextVisible);
        this.$('.placed-module-warnings').toggle(isTextVisible);
        this.updatePosition();
    }

    onHotkey(event) {
        super.onHotkey(event);
        const keyname = getKeyName(event.which);
        if (keyname === 'D'
            && !event.ctrlKey
            && userController.getUser().isLoggedIn()
            && userController.getUser().isFeatureEnabled(FeatureFlag.WORKSPACE_MODULE_DUPLICATE)) {
            eventDispatcher.publishEvent(MODULE_DOUBLE_CLICK, {model: this.model.module});
            return;
        }
    }

    protected updatePosition(): void {
        super.updatePosition();
        this.updatePathWall();
    }

    private updatePathWall(): void {
        const pathWallPolylines = this.model.getPathWallPolylines();
        if (pathWallPolylines) {
            const d = pathWallPolylines.map(polyline => polyline.svgPath()).join(' ');
            this.$('path.path-wall').attr('d', d);
        }
    }

    private renderCustomName(): void {
        const newName = this.model.customName;
        this.$el.find('.module-svg-container').attr('name', newName);
        this.$el.find('.module-title').text(newName);
    }

    protected getViewHtml(): string {
        const showOrtho = UserController.getUser().isFeatureEnabled(FeatureFlag.WORKSPACE_MODE_THREED_IMAGE);
        const orthoUrl = showOrtho ? this.model.orthographicUrl : '';
        return placedModuleTemplate({
            title: this.model.customName,
            orthoUrl: orthoUrl,
            summary: this.model.summary,
            outline: this.model.getDisplayOutline(),
            showOrtho: showOrtho,
            showDev: this.model.isDev() && !this.model.isStable(),
            showMugr: this.model.isRestricted() && userController.getUser().isEngineer(),
            showInactive: this.model.isInactive(),
        });
    }

    private renderConnectionState(): void {
        this.$el.removeClass('unready ready connected');
        this.$el.addClass(getConnectionState(this.model));
    }

    private renderBuses(): void {
        if (this.model.hasRequires() || this.model.hasBomOptions()) {
            this.renderRequireMenu();
        }
    }

    private renderRequireMenu(): void {
        this.requireMenu = new RequireBusMenu({
            buses: this.model.getRequires(),
            model: this.model
        } as BusMenuOptions);
        this.$('ol.require').append(this.requireMenu.el);
    }

    private resetProvideBusMenu(pm, options: ProvideBus[]) {
        this.areProvidesSuppressed = false;
        const hasOptions = options.length > 0;
        this.removeProvideMenu();
        this.$el.toggleClass('providing-options-js', hasOptions);

        if (hasOptions) {
            this.provide_menu = new ProvideBusMenu({
                buses: options,
                model: this.model
            } as BusMenuOptions);
            this.$('ol.provide').append(this.provide_menu.el);
        }
    }

    private updateProvideModuleSelectionColour(status: boolean) {
        if (this.$el.hasClass('providing-options-js') && !status) {
            return this.$el.toggleClass('providing-options-js-ready', true);
        }
        return this.$el.toggleClass('providing-options-js-ready', false);
    }

    private removeProvideMenu() {
        if (this.provide_menu) {
            this.provide_menu.remove();
            this.provide_menu = null;
            this.$el.toggleClass('providing-options-js-ready', false);
        }
    }

    private removeRequireMenu(): void {
        if (this.requireMenu) {
            this.requireMenu.remove();
        }
    }

    remove() {
        this.feature_views.forEach((featureView: FeatureView) => {
            featureView.remove();
        });
        this.removeProvideMenu();
        this.removeRequireMenu();
        return super.remove();
    }

    private renderFeatures(): void {
        this.feature_views = [];
        const $featureContainer = this.$('svg > g');
        for (const feature of this.model.features) {
            if (feature.isType('shadow') || feature.isEdge()) {
                const view = new FeatureView({model: feature});
                // Edges are selectable via dimensions and should be on top.
                if (feature.isEdge()) {
                    $featureContainer.append(view.el);
                } else {
                    $featureContainer.prepend(view.el);
                }
                this.feature_views.push(view);
            }
        }
    }

    private dispatch(eventName: string): void {
        eventDispatcher.publishEvent(eventName, {model: this.model});
    }

    private get dataItem(): ContextMenuItem {
        // TODO has loaded check
        const hasBuses = this.model.getRequires().length || this.model.getProvides().length;
        if (userController
                .getUser()
                .isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT)
            && hasBuses) {
            return {
                label: 'Open Module',
                callback: () => openModuleDataView(this.model.module, !this.model.module.sku),
                selector: 'module-data'
            };
        }
    }

    private get deleteItem(): ContextMenuItem {
        return {label: 'Delete', callback: () => this.dispatch(PLACED_MODULE_REMOVE)};
    }

    private get infoItem(): ContextMenuItem {
        return {label: 'Info', callback: () => eventDispatcher.publishEvent(PLACED_MODULE_INFO, this.model)};
    }

    private get renameItem(): ContextMenuItem {
        return {label: 'Rename', callback: () => this.dispatch(CUSTOM_NAME_INPUT)};
    }

    private get duplicateItem(): ContextMenuItem | undefined {
        if (userController.getUser().isLoggedIn()
            && userController.getUser().isFeatureEnabled(FeatureFlag.WORKSPACE_MODULE_DUPLICATE)) {
            return {
                label: 'Duplicate',
                callback: () => eventDispatcher.publishEvent(MODULE_DOUBLE_CLICK, {model: this.model.module})
            };
        }
        return;
    }

    private get busItem(): ContextMenuItem | undefined {
        if (userController.getUser().isEngineer() &&
            (this.model.getRequires().length || this.model.getProvides().length)) {
            return {label: 'Buses', callback: () => openBusListDialog(this.model)};
        }
    }

    private get busPinMappingItem(): ContextMenuItem | undefined {
        if (!this.model.module.isCustomerModule()) {
            return;
        }

        return {
            label: 'View Bus to Pin Mapping',
            callback: () => openModuleBusPinMappingView(this.model.module, this.model.getRotation()),
            selector: 'module-bus-pin-mapping',
        };
    }

    /**
     * TODO substitute is temporarily engineer-only access. Remove the condition when it's not.
     */
    private get substituteItem(): ContextMenuItem | undefined {
        if (this.model.hasFunctionalGroup() &&
            userController.getUser().isEngineer()) {
            return {label: 'Substitute', callback: () => this.dispatch(PM_SUBSTITUTE_START)};
        }
    }

    private get connectionsItem(): ContextMenuItem | undefined {
        if (this.model.canTransferConnections()) {
            return {label: 'Connections', callback: () => openConnectionDialog(this.model)};
        }
    }

    protected getMenuItems(): ContextMenuItem[] {
        return [
            this.infoItem,
            this.dataItem,
            this.busItem,
            this.busPinMappingItem,
            this.boardEdgeItem,
            this.cornerItem,
            this.rotateItem,
            this.substituteItem,
            this.renameItem,
            this.connectionsItem,
            this.duplicateItem,
            this.deleteItem
        ].filter(i => undefined != i);
    }

    /**
     * Repositioning items (rotate, move to board) are already handled as default options in the BlockMenu.
     * @see BlockMenu
     */
    protected get horizontalMenuItems(): ContextMenuItem[] {
        return [
            this.infoItem,
            this.dataItem,
            this.busItem,
            this.substituteItem,
            this.renameItem,
            this.connectionsItem,
            this.duplicateItem,
            this.deleteItem
        ].filter(i => undefined != i);
    }

    /**
     * Selecting a require bus also selects the placed module.
     */
    private requireSelect(event) {
        this.select();
        this.cancelMenuDrag(event);
    }

    cancelMenuDrag(event) {
        event.stopPropagation();
    }

    onMousedown(event): void {
        if (this.provide_menu) {
            this.areProvidesSuppressed = false;
            this.provide_menu.show();
            event.stopImmediatePropagation();
        } else {
            if (event.ctrlKey
                && UserController.getUser().isFeatureEnabled(FeatureFlag.WORKSPACE_MODE_MULTI_SELECT)
                && !this.workspace.isConnecting()
                && !this.workspace.isDimensioning()) {
                this.multiSelect();
            } else {
                this.select();
            }
        }
    }

    showProvideMenu(): void {
        if (this.provide_menu) {
            this.provide_menu.show();
        }
    }

    hideProvideMenu(): void {
        if (this.provide_menu) {
            this.provide_menu.hide();
        }
    }

    blink(): void {
        this.$('.svg-container').addClass('fast-blink');
    }

    stopBlinking(): void {
        this.$('.svg-container').removeClass('fast-blink');
    }

    setProvidesSuppressed(isSuppressed: boolean): void {
        this.areProvidesSuppressed = isSuppressed;
        if (isSuppressed) {
            this.hideProvideMenu();
        } else {
            this.showProvideMenu();
        }
    }

    private onClick(event): void {
        if (!this.provide_menu) {
            this.checkClick(event);
        }
    }

    private onMouseenter(): void {
        // If an external control caused the PM to blink, but the the user no longer
        // has access to it, the user can always stop it here.
        this.stopBlinking();
        this.showProvideMenu();
    }

    private onMouseleave(): void {
        if (this.areProvidesSuppressed) {
            this.hideProvideMenu();
        }
    }

    /**
     * Respond to mouseenter on a provide menu (not necessarily the one owned by this view).
     */
    private onProvideMouseenter(cid: string): void {
        if (this.provide_menu && this.provide_menu.cid !== cid) {
            this.provide_menu.fadeOut();
        }
    }

    /**
     * Respond to mouseleave on a provide menu (not necessarily the one owned by this view).
     */
    private onProvideMouseexit(): void {
        if (this.provide_menu && !this.areProvidesSuppressed) {
            this.provide_menu.show();
        }
    }

    private onSelectRequire(): void {
        this.$('.module-error-tooltip').removeClass('module-error-tooltip-hide');
        const busName = this.model.getSelectedBusName();
        this.updateModuleErrorTooltip(busName);
    }

    private updateModuleErrorTooltip(busName: string): void {
        if (this.model.module.provides) {
            if (this.model.module.provides.length >= 1) {
                for (const provideBus of this.model.module.provides) {
                    if (provideBus.name === busName) {
                        this.$('.module-error-tooltip span').html("Bus Voltage Mismatch");
                        break;
                    } else {
                        this.$('.module-error-tooltip span').html("No Related Provide Bus Available");
                    }
                }
            } else {
                this.$('.module-error-tooltip span').html("Peripheral Module");
            }
        }
    }

    events() {
        return {
            'mouseenter .module-svg-container, .module-orthographic-container, .buffer': this.onMouseenter,
            'mouseleave': this.onMouseleave,
            'mousedown': this.onMousedown,
            'mousedown .require .menu-page': this.requireSelect,
            'click .module-svg-container, .module-orthographic-container, .buffer': this.onClick,
            contextmenu: this.contextMenu,
            'mousewheel .module-svg-container, .module-orthographic-container, .buffer': event => this.onMousewheel(event)
        }
    }
}
