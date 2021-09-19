import userController from "auth/UserController";
import * as $ from "jquery";
import "lib/jquery-ui";
import * as _ from "underscore";
import events from "utils/events";
import {Library} from "../../module/Library";
import {Module} from "../../module/Module";
import {
    PLACED_MODULE_SELECT,
    PlacedModuleEvent,
    PM_SUBSTITUTE_FINISH,
    PM_SUBSTITUTE_START
} from "../../placedmodule/events";
import {CONTEXT_MODE, MODULE_LIBRARY_LOADED, TOGGLE_MODULE_LIBRARY} from "../../workspace/events";
import {DESIGN_LOADED} from "../../design/events";
import {
    CUSTOMIZED_MODULE_DELETE,
    MODULE_INIT_BUSES,
    PROVIDERS_LOADED,
    PROVIDERS_LOADING,
    REMOVE_MODULE_FINISH
} from "../../module/events";
import * as Backbone from "backbone";
import {FilteredLibraryView, SearchLibraryView} from "./LibraryView";
import {DesignRevision, EVENT_ADD_MODULE} from "../../design/DesignRevision";
import {Workspace} from "../../workspace/Workspace";
import * as React from "react";
import {SyntheticEvent} from "react";
import * as ReactDOM from "react-dom";
import ConnectionController from "../../connection/ConnectionController";
import {DesignController} from "../../design/DesignController";
import {ModuleTile} from "./ModuleTile";
import {DefaultLibraryView} from "./DefaultLibraryView";
import {PseudoModuleTile} from "./PseudoModuleTile";
import {EXCLUSION_SET_NO_CONNECT_CLICK, REQUIRE_NO_CONNECT_CLICK, SELECT_PROVIDE} from "../../bus/events";
import {SHOW_IN_LIBRARY_CLICK, ShowInLibraryEvent} from "./events";
import UserController from "../../auth/UserController";
import {FeatureFlag} from "../../auth/FeatureFlag";
import eventDispatcher from "../../utils/events";
import {AUTODOC} from "../../toolbar/events";


/**
 * The parent view for the "library" panel from which the user adds modules to the
 * board. Has three containers:
 * 1) Default library shows all modules available to the user.
 * 2) Filtered library displays providers for a selected require. This closes when you click away.
 * 3) Search library displays modules matching an input query. Does not close when you click away.
 *
 * This controls the visibility of the containers depending on user interaction.
 *
 * TODO finish converting to React.
 */
export class Panel extends Backbone.View<any> {

    get className() {
        return 'panel';
    }

    get tagName() {
        return 'aside';
    }

    private allModules: Library | undefined;
    private readonly workspace: Workspace;
    private compatibleModules: Module[];
    private searchModules: Module[];
    private isPanelDisplayed: boolean;
    private isButtonSpaceAvailable: boolean;
    /**
     * A list of category/functional group names that the user has traversed in the default library.
     * Eg. ['Power', 'Power Regulators']
     * If empty, we have returned to the parent category shelves.
     */
    private defaultLibraryNav: string[];

    constructor(workspace: Workspace) {
        super();
        this.workspace = workspace;
        this.compatibleModules = [];
        this.searchModules = [];
        this.defaultLibraryNav = [];
        this.isPanelDisplayed = true;
        this.isButtonSpaceAvailable = true;

        this.listenTo(events, DESIGN_LOADED, () => this.cancelFilter());
        this.listenTo(events, MODULE_INIT_BUSES, () => this.cancelFilter());
        this.listenTo(events, EVENT_ADD_MODULE, () => this.cancelFilter());
        this.listenTo(events, PLACED_MODULE_SELECT, () => this.cancelFilter());
        this.listenTo(events, SELECT_PROVIDE, () => this.cancelFilter());
        this.listenTo(events, REQUIRE_NO_CONNECT_CLICK, () => this.cancelFilter());
        this.listenTo(events, EXCLUSION_SET_NO_CONNECT_CLICK, () => this.cancelFilter());
        this.listenTo(events, CONTEXT_MODE, () => this.cancelFilter());
        this.listenTo(events, REMOVE_MODULE_FINISH, () => this.cancelFilter());
        this.listenTo(events, PROVIDERS_LOADING, () => this.onProvidersLoading());
        this.listenTo(events, PROVIDERS_LOADED, event => this.showMatches(event.library));
        this.listenTo(events, PM_SUBSTITUTE_START, event => this.startSubstitution(event));
        this.listenTo(events, PM_SUBSTITUTE_FINISH, () => this.cancelSubstitution());
        this.listenTo(events, SHOW_IN_LIBRARY_CLICK, event => this.showModule(event));
        this.listenTo(events, CUSTOMIZED_MODULE_DELETE, () => this.render());
        this.render();
        this.initialPanelSize();
        this.setupResizable();

        this.filterBySearchTerm = this.filterBySearchTerm.bind(this);
        this.makeModuleTile = this.makeModuleTile.bind(this);
        this.makeLogoTile = this.makeLogoTile.bind(this);
        this.traverseTo = this.traverseTo.bind(this);
        this.back = this.back.bind(this);
    }

    public onModulesLoaded(library: Library, defaultOpenCategory?: string): void {
        eventDispatcher.publishEvent(MODULE_LIBRARY_LOADED);
        this.allModules = library;
        this.traverseTo(defaultOpenCategory);

        const newUIActived = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_MODULE_LIBRARY_UI);
        if (newUIActived) {
            this.back();
        }

        // TODO update on bulk change, rather than one at a time which needs debouncing.
        this.allModules.on('add remove', _.debounce(() => {
            this.clearSearch();
            this.cancelFilter();
        }, 50), this);
    }

    public get width(): number {
        if (!this.isPanelDisplayed) return 0;
        return this.$el.width();
    }

    private startSubstitution(event: PlacedModuleEvent): void {
        if (!this.allModules) return;
        const toReplace = event.model;
        this.currentDesign.moduleToReplace = toReplace;
        ConnectionController.clearRequireToConnect();
        this.compatibleModules = this.allModules.filterByFunctionalGroup(toReplace.module);
        this.render();
    }

    private onProvidersLoading(): void {
        this.$el.addClass('loading-js');
    }

    private stopLoading(): void {
        this.$el.removeClass('loading-js');
    }

    /**
     * @param library: A library of modules that can provide for the require bus.
     */
    public showMatches(library: Library): void {
        this.stopLoading();
        if (this.isPanelDisplayed === false) this.showLibrary();
        this.compatibleModules = library.filterVisibleTo(userController.getUser());
        this.currentDesign.moduleToReplace = null;
        this.render();
    }

    private cancelSubstitution(): void {
        this.compatibleModules = [];
        this.currentDesign.moduleToReplace = null;
        this.render();
    }

    private get isSearchLibraryVisible(): boolean {
        return this.searchTerm.length > 1 && !this.isShowingSuggestions;
    }

    private get isShowingSuggestions(): boolean {
        return (this.currentDesign && null != this.currentDesign.moduleToReplace) ||
            null != ConnectionController.getRequireToConnect();
    }

    public render() {
        const editModuleEnable = UserController.getUser().isLoggedIn() && UserController.getUser().isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT);
        const onlyLibraryToggle = !editModuleEnable ? "panel-display-toggle-only" : "";
        const newPlaygroundUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_MODULE_LIBRARY_UI);

        const element = (
            <div className="panel-container">
                <div className={`panel-display-toggle panel-side-button ${onlyLibraryToggle}`}
                     onClick={() => this.showLibrary()}
                     title="Display module library">
                    {!newPlaygroundUI &&
                    <span>Module Library</span>}
                    {newPlaygroundUI &&
                    <span>Building Blocks</span>}
                </div>
                {editModuleEnable &&
                <div className="customized-module-display-toggle panel-side-button"
                     onClick={() => Backbone.history.navigate(`!/module-edit`, true)}
                     title="Display module library">
                    <span>Customized Module</span>
                </div>}
                <div className="panel-handle ui-resizable-w ui-resizable-handle"/>
                <div className="panel-header">
                    {!newPlaygroundUI &&
                    <div className="panel-header-title">
                        <h4>Module Library</h4>
                        <button className="panel-hide-icon"
                                onClick={() => this.hideLibrary()}
                                title="Hide module library">
                            Hide
                        </button>
                    </div>
                    }
                    {newPlaygroundUI &&
                    <div className="panel-header-title panel-header-title-new-ui">
                        <button className="panel-search-icon"
                                onClick={() => this.showSearchBar()}
                                title="Search Building Blocks"/>
                        <div id="panel-search-container-new-ui"
                             className={`panel-search-container ${this.isSearchLibraryVisible ? 'panel-searching' : ''}`}>
                            <input className="panel-search"
                                   type="search"
                                   placeholder="Search..."
                                   onChange={this.filterBySearchTerm}
                                   disabled={!this.allModules}
                                   onBlur={() => this.hideSearchBar()}/>
                            {this.isSearchLibraryVisible &&
                            <span className="clear"
                                  onClick={() => this.clearSearch()}/>}
                        </div>
                        <h4>Building Blocks</h4>
                        <button className="panel-hide-icon"
                                onClick={() => this.hideLibrary()}
                                title="Hide module library">
                        </button>
                    </div>
                    }
                    <div className={`panel-header-top ${!this.isButtonSpaceAvailable ? 'panel-header-top-column' : ''}
                    ${newPlaygroundUI ? 'panel-header-top-new-ui' : ''}`}
                         style={{display: !this.isShowingSuggestions ? '' : 'none'}}>
                        {editModuleEnable &&
                        <button className="customized-module-access-button"
                                onClick={() => Backbone.history.navigate(`!/module-edit`, true)}
                                title="Open Customized module library">
                            Customized Modules
                        </button>}
                        {!newPlaygroundUI &&
                        <div
                            className={`panel-search-container ${this.isSearchLibraryVisible ? 'panel-searching' : ''}`}>
                            <input className="panel-search"
                                   type="search"
                                   placeholder="Search modules"
                                   onChange={this.filterBySearchTerm}
                                   disabled={!this.allModules}/>
                            {this.isSearchLibraryVisible &&
                            <span className="clear"
                                  onClick={() => this.clearSearch()}/>}
                        </div>}
                    </div>
                    <div className="panel-navigation">
                        {this.getNavigation()}
                    </div>
                </div>
                <div className="libraries">
                    {this.searchLibrary}
                    {this.filteredLibrary}
                    {this.defaultLibrary}
                    <div className="panel-cover"/>
                </div>
            </div>);
        ReactDOM.render(element, this.$el.get(0));
        return this;
    }

    private get searchLibrary(): JSX.Element {
        const searchTerm = this.searchTerm;
        const showLogo = searchTerm && 'Add Custom Logo'.toLowerCase().includes(searchTerm.toLowerCase());
        return <SearchLibraryView
            showLogo={showLogo}
            workspace={this.workspace}
            modules={this.searchModules}
            visible={this.isSearchLibraryVisible}
            makeModuleTile={this.makeModuleTile}
            makeLogoTile={this.makeLogoTile}/>
    }

    private get filteredLibrary(): JSX.Element {
        return <FilteredLibraryView
            workspace={this.workspace}
            modules={this.compatibleModules}
            visible={this.isShowingSuggestions}
            makeModuleTile={this.makeModuleTile}/>;
    }

    private get defaultLibrary(): JSX.Element {
        const visible = !this.isShowingSuggestions && !this.isSearchLibraryVisible;
        return <DefaultLibraryView
            workspace={this.workspace}
            modules={this.visibleModules}
            visible={visible}
            makeModuleTile={this.makeModuleTile}
            makeLogoTile={this.makeLogoTile}
            navigation={this.defaultLibraryNav}
            traverse={this.traverseTo}
            back={this.back}/>;
    }

    private get visibleModules(): Module[] {
        return this.allModules ? this.allModules.filterVisibleTo(userController.getUser()) : [];
    }

    private initialPanelSize(): void {
        let defaultPanelWidth = 405;
        if ($(window).width() < 1300) {
            defaultPanelWidth = 220;
            this.isButtonSpaceAvailable = false;
        }
        this.$el.css({
            width: defaultPanelWidth + 'px'
        });
    }

    private setupResizable(): void {
        const handle = this.$('.panel-handle');
        const $panel = this.$el;
        $panel.resizable({
            handles: {
                'w': handle
            },
            resize: (event, ui) => {
                const maxWidth = $(window).width() - handle.width();
                const newWidth = Math.min(ui.size.width, maxWidth);
                if (newWidth < 364 && this.isButtonSpaceAvailable) {
                    this.isButtonSpaceAvailable = false;
                    this.render();
                } else if (newWidth >= 364 && !this.isButtonSpaceAvailable) {
                    this.isButtonSpaceAvailable = true;
                    this.render();
                }
                $panel.css({
                    'width': newWidth + 'px',
                    'right': '', // Force jquery ui to not set 'right'
                    'left': '' // Force jquery ui to not set 'left'
                });
            },
        });
    }

    /**
     * The panel moves out of the way when the user is dragging a module.
     */
    private hide(): void {
        setTimeout(() => {
            this.$el.stop().animate({right: -this.$el.width()}, 200);
        });
    }

    private show(): void {
        setTimeout(() => {
            this.$el.stop().animate({right: 0}, 150);
        });
    }

    /**
     * Fully hide the module library, need to use the toggle button to show the library again.
     */
    private hideLibrary(): void {
        if (this.isPanelDisplayed === false) return;
        this.isPanelDisplayed = false;
        this.$el.stop().animate({right: (-this.$el.width() - 10)});
        setTimeout(() => {
            this.$('.panel-side-button').css('display', 'flex');
        }, 300);
        events.publish(TOGGLE_MODULE_LIBRARY, {isOpen: false});
    }

    private showLibrary(): void {
        if (this.isPanelDisplayed === true) return;
        this.isPanelDisplayed = true;
        this.$el.stop().animate({right: (0)});
        this.$('.panel-side-button').hide();
        events.publish(TOGGLE_MODULE_LIBRARY, {isOpen: true});
    }

    private clearSearch(): void {
        this.el.querySelector('.panel-search').value = '';
        this.searchModules = [];
        this.render();
        this.$('#panel-search-container-new-ui .panel-search').focus();
    }

    private filterBySearchTerm(e: SyntheticEvent<HTMLInputElement>): void {
        const searchTerm = e.currentTarget.value.replace(/[\s)(-]+/g, '');
        if (searchTerm.length > 1) {
            this.searchModules = this.allModules.filterBy(searchTerm)
                .filter(module => module.isVisibleToUser(userController.getUser()));
        } else {
            this.searchModules = [];
        }
        this.render();
    }

    private showModule(event: ShowInLibraryEvent): void {
        this.el.querySelector('.panel-search').value = event.moduleName;
        this.searchModules = this.allModules
            .filter(module => {
                return module.id === event.moduleId &&
                    module.isVisibleToUser(userController.getUser());
            });

        this.render();
    }

    private showSearchBar(): void {
        this.$('#panel-search-container-new-ui').show();
        this.$('#panel-search-container-new-ui .panel-search').focus();
        this.$('.panel-header-title-new-ui h4').hide();
        this.$('.panel-search-icon').hide();
    }

    private hideSearchBar(): void {
        if (this.searchTerm.length > 0) {
            return;
        }else {
            this.$('#panel-search-container-new-ui').hide();
            this.$('.panel-header-title-new-ui h4').show();
            this.$('.panel-search-icon').show();
        }
    }

    /**
     * FilteredLibraryView contains the substitute/provider modules. If it closes for any reason,
     * we should cancel the substitution/connection process.
     */
    public cancelFilter(): void {
        this.stopLoading();
        this.currentDesign.moduleToReplace = null;
        ConnectionController.clearRequireToConnect();
        this.compatibleModules = [];
        this.render();
    }

    /**
     * Depending on which library is active, get the navigation header text that describes the current state.
     */
    private getNavigation(): JSX.Element {
        const requireBus = ConnectionController.getRequireToConnect();
        if (requireBus) {
            const message = `Modules compatible with ${requireBus.name} on ${requireBus.moduleName}`;
            return this.getFilterNavigation(message);
        }
        if (this.currentDesign && this.currentDesign.moduleToReplace) {
            const message = `Drag and drop a replacement for ${this.currentDesign.moduleToReplace.name}`;
            return this.getFilterNavigation(message);
        }
        if (this.isSearchLibraryVisible) {
            return this.searchNavigation();
        }
        return this.breadcrumbs;
    }

    private getFilterNavigation(message: string): JSX.Element {
        return (
            <div className="filter-message-container" title={message}>
                <span className="filter-message">{message}</span>
                <button className="cancel"
                        title="Cancel"
                        onClick={() => this.cancelFilter()}/>
            </div>
        );
    }

    private searchNavigation(): JSX.Element {
        return (
            <div>
                <span>Showing results for &quot;{this.searchTerm}&quot;</span>
            </div>
        );
    }

    private get searchTerm(): string {
        const search = this.el.querySelector('.panel-search');
        return search ? search.value : '';
    }

    /**
     * @return default library panel navigation breadcrumbs to display in the header.
     */
    private get breadcrumbs(): JSX.Element {
        return (
            <div className="panel-breadcrumbs">
                {
                    this.defaultLibraryNav.length === 0 ?
                        <span>Viewing All Categories</span> :
                        <button onClick={() => this.traverseTo(null)}>
                            All Categories
                        </button>
                }
                {this.defaultLibraryNav.map((n, i) => {
                    if (i !== this.defaultLibraryNav.length - 1) {
                        return (
                            <button onClick={() => this.traverseTo(n)}
                                    key={n}>
                                {n}
                            </button>
                        );
                    }
                    return <span key={n}>{n}</span>;
                })}
            </div>
        );
    }

    /**
     * Navigate the default library panel to another category, such as Audio.
     * Avoid altering the array in-place, as DefaultLibraryView has
     * a reference to it and will not know what changed.
     *
     * @param nav: The category or functional group name to traverse to.
     */
    private traverseTo(nav: string | null): void {
        if (!nav) {
            this.defaultLibraryNav = [];
            this.render();
            return;
        }
        const index = this.defaultLibraryNav.indexOf(nav);
        let newNav;
        if (index > -1) {
            newNav = this.defaultLibraryNav.slice(0, index + 1);
        } else {
            newNav = this.defaultLibraryNav.slice();
            newNav.push(nav);
        }
        this.defaultLibraryNav = newNav;
        this.render();
    }

    /**
     * Go back a level in the default library.
     */
    private back(): void {
        const nav = this.defaultLibraryNav;
        if (nav.length > 0) {
            this.defaultLibraryNav = nav.slice(0, nav.length - 1);
            this.render();
        }
    }

    private makeModuleTile(m: Module): JSX.Element {
        return <ModuleTile key={m.id}
                           module={m}
                           workspace={this.workspace}
                           onDragStart={() => this.hide()}
                           onDragStop={() => this.show()}/>
    }

    private makeLogoTile(): JSX.Element {
        return PseudoModuleTile.logo(
            this.workspace,
            () => this.hide(),
            () => this.show()
        );
    }

    private get currentDesign(): DesignRevision | null {
        return DesignController.getCurrentDesign();
    }
}

