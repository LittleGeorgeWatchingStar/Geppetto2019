import {Module} from "../../src/module/Module";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Workspace} from "../../src/workspace/Workspace";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import {overrideDesignRevision} from "../design/TestDesign";
import makeModule, {makeFootprint, makeSimpleFootprint} from "../module/TestModule";
import eventDispatcher from 'utils/events';
import {ESC, WORKSPACE_CLICK} from "../../src/workspace/events";
import {PlacedLogoBuilder} from "../placedlogo/PlacedLogoBuilder";
import {PlacedLogo} from "../../src/placedlogo/PlacedLogo";
import * as $ from "jquery";
import {INIT_PLACED_ITEMS} from "../../src/design/DesignRevision";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {createDimension} from "../../src/dimension/Dimension";
import {PlacedModuleView} from "../../src/placedmodule/PlacedModuleView";
import {PlacedLogoView} from "../../src/placedlogo/PlacedLogoView";
import {BoardViewBuilder} from "../board/BoardViewBuilder";
import {Panel} from "../../src/view/librarypanel/Panel";
import * as ReactTestUtils from "react-dom/test-utils";
import User from "../../src/auth/User";
import UserController from "../../src/auth/UserController";
import {selectContextItem} from "../view/ContextMenu.spec";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import * as Backbone from "backbone";
import {BLOCK_ROTATE} from "../../src/placedmodule/events";
import {getKeyCode} from "../../src/view/keys";
import DialogManager from "../../src/view/DialogManager";
import {Dialog} from "../../src/view/Dialog";
import * as ReactDOM from "react-dom";
import {DimensionComponent} from "../../src/dimension/DimensionComponent";
import * as React from "react";
import {FeatureFlag} from "../../src/auth/FeatureFlag";
import {CornerRadius} from "../../src/board/CornerRadius";
import {BoardBuilder} from "../board/BoardBuilder";


function makeView(workspace?: Workspace): WorkspaceView {
    $('body').html(`
<div class="alltabcontainer">
    <div id="design">
        <div class="dimensions"></div>
        <div id="board"></div>
    </div>
</div>`);
    workspace = workspace ? workspace : new Workspace(true, true);
    const view = new WorkspaceView({
        model: workspace,
        panel: new Panel(workspace)
    } as WorkspaceViewOptions);
    $('.alltabcontainer').append(view.el);
    return view;
}

function findChildNodes(view: WorkspaceView, selector: string): JQuery {
    return view.$el.find(selector);
}

function countModuleViews(view: WorkspaceView): number {
    const selector = `div.module`;
    return findChildNodes(view, selector).length;
}

function findModuleNodes(view: WorkspaceView, pm: PlacedModule): JQuery {
    const selector = `div.module[uid="${pm.cid}"]`;
    return findChildNodes(view, selector);
}

function findLogoNodes(view: WorkspaceView, pl: PlacedLogo): JQuery {
    const selector = `div.logo[uid="${pl.cid}"]`;
    return findChildNodes(view, selector);
}

function expectModuleView(view: WorkspaceView, pm: PlacedModule) {
    expect(findModuleNodes(view, pm).length).toEqual(1);
}

function getModuleZIndex(view: WorkspaceView, pm: PlacedModule): string {
    const node = findModuleNodes(view, pm);
    const container = node.find('.module-svg-container');
    /* Jquery .css() doesn't work unless the element is absolute- or
    relative-positioned, which our stylesheet does for us. */
    return container.get(0).style.zIndex;
}

function getLogoZIndex(view: WorkspaceView, pl: PlacedLogo): string {
    const node = findLogoNodes(view, pl);
    const container = node.find('.logo-svg-container');
    /* Jquery .css() doesn't work unless the element is absolute- or
    relative-positioned, which our stylesheet does for us. */
    return container.get(0).style.zIndex;
}

describe("WorkspaceView", function () {

    let view = null;

    afterEach(() => {
        if (view) {
            // Detach listenTo events.
            view.remove();
            view = null;
            $(document).off();
        }
    });

    it('traverses to the correct URL when opened', function () {
        view = makeView();
        const navigateSpy = spyOn(Backbone.history, 'navigate').and.callThrough();
        view.onOpen();
        expect(navigateSpy).toHaveBeenCalledWith('!/workspace');
        Backbone.history.stop();
    });

    describe("when constructed", function () {
        it("has a DOM element", function () {
            view = makeView();
            expect(view.el).toBeDefined();
        });

        it("has a JQuery node", function () {
            view = makeView();
            expect(view.$el).toBeDefined();
        });

        it("jquery can be updated", function () {
            view = makeView();
            view.$el.html('test');
            expect(view.$el.html()).toEqual('test');
        });

        it("has no module views", function () {
            view = makeView();
            expect(countModuleViews(view)).toEqual(0);
        });

        it("has a library panel", function () {
            view = makeView();
            expect(view.$('.panel').length).toEqual(1);
        });

        it("has a toolbar", function () {
            view = makeView();
            expect(view.$('.toolbar').length).toEqual(1);
        });
    });

    describe("on designRev init placed items", function () {
        it("clears previous placed item views", function () {
            view = makeView();
            const designRev = overrideDesignRevision();
            designRev.addModule(makeModule(), {x: 30, y: 55});
            expect(countModuleViews(view)).toEqual(1);
            designRev.trigger(INIT_PLACED_ITEMS);
            expect(countModuleViews(view)).toEqual(0);
        });

        it("always has one board view", function () {
            view = makeView();
            const designRev = overrideDesignRevision();
            designRev.trigger(INIT_PLACED_ITEMS);
            expect(view.$('#board').length).toEqual(1);
        });

        it("clears previous dimensions", function () {
            view = makeView();
            const dimensionable = new PlacedModuleBuilder().build();
            const anchor = dimensionable.getAnchorByEdge('left');
            const attributes = {
                anchor1: anchor,
                anchor2: anchor,
                hidden: false,
                locked: false
            };
            const designRev = overrideDesignRevision();
            designRev.addDimensionFromAttributes(attributes);
            designRev.trigger(INIT_PLACED_ITEMS);
            expect(view.$el.find('.dimension').length).toEqual(0);
        });
    });

    describe("on module added", function () {
        it("creates a placed module view", function () {
            view = makeView();
            const designRev = overrideDesignRevision();
            designRev.addModule(makeModule(), {x: 30, y: 55});
            expect(countModuleViews(view)).toEqual(1);
        });

        it("creates a placed module view", function () {
            view = makeView();
            const designRev = overrideDesignRevision();
            const pm = designRev.addModule(makeModule(), {x: 30, y: 55});
            expectModuleView(view, pm);
        });

        it("sets the z-index of the modules according to module size", function () {
            function makeSmallModule(): Module {
                return makeModule({
                    name: 'small',
                    features: makeSimpleFootprint(3)
                });
            }

            function makeMediumModule(): Module {
                return makeModule({
                    name: 'medium',
                    features: makeSimpleFootprint(10)
                });
            }

            function makeLargeModule(): Module {
                return makeModule({
                    name: 'large',
                    features: makeSimpleFootprint(20)
                });
            }

            view = makeView();
            const rev = overrideDesignRevision();
            const medium = rev.addModule(makeMediumModule(), {x: 30, y: 55});
            const small = rev.addModule(makeSmallModule(), {x: 30, y: 55});
            const large = rev.addModule(makeLargeModule(), {x: 30, y: 55});

            expect(getModuleZIndex(view, small)).toEqual('2');
            expect(getModuleZIndex(view, medium)).toEqual('1');
            expect(getModuleZIndex(view, large)).toEqual('0');
        });

        it("sets the z-index of the logos according to logo size", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            const medium = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(10, 10)
                .build();
            const small = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(3, 3)
                .build();
            const large = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(20, 20)
                .build();

            expect(getLogoZIndex(view, small)).toEqual('2');
            expect(getLogoZIndex(view, medium)).toEqual('1');
            expect(getLogoZIndex(view, large)).toEqual('0');
        });

        it("sets the z-index of the logos and module according to their size", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            function makeMediumModule(): Module {
                return makeModule({
                    name: 'medium',
                    features: makeSimpleFootprint(10)
                });
            }

            const medium = rev.addModule(makeMediumModule(), {x: 30, y: 55});
            const small = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(3, 3)
                .build();
            const large = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(20, 20)
                .build();

            expect(getLogoZIndex(view, small)).toEqual('2');
            expect(getModuleZIndex(view, medium)).toEqual('1');
            expect(getLogoZIndex(view, large)).toEqual('0');
        });

        it("sets the z-index of the logos and module according to their size after logo resize", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            function makeMediumModule(): Module {
                return makeModule({
                    name: 'medium',
                    features: makeSimpleFootprint(10)
                });
            }

            const medium = rev.addModule(makeMediumModule(), {x: 30, y: 55});
            const small = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(3, 3)
                .build();
            const large = new PlacedLogoBuilder()
                .withDesignRevision(rev)
                .withSize(20, 20)
                .build();

            //change small to bigger than large
            small.resize(30, 30);

            expect(getLogoZIndex(view, small)).toEqual('0');
            expect(getModuleZIndex(view, medium)).toEqual('2');
            expect(getLogoZIndex(view, large)).toEqual('1');
        });
    });

    describe("dimensions", function () {
        function countDimensions(view: WorkspaceView): number {
            return view.$el.find('div.dimension').length;
        }

        it("has none when first instantiated", function () {
            view = makeView();

            expect(countDimensions(view)).toEqual(0);
        });

        it("adds a view for regular dimensions", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            const pm = rev.addModule(makeModule(), {x: 30, y: 55});
            rev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge('left'),
                anchor2: rev.board.getAnchorByEdge('left'),
            });

            expect(countDimensions(view)).toEqual(1);
        });

        it("does not add a view for duplicate dimensions", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            const pm = rev.addModule(makeModule(), {x: 30, y: 55});
            rev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge('left'),
                anchor2: rev.board.getAnchorByEdge('left'),
            });
            rev.addDimensionFromAttributes({
                anchor1: pm.getAnchorByEdge('left'),
                anchor2: rev.board.getAnchorByEdge('left'),
            });

            expect(countDimensions(view)).toEqual(1);
        });

        it("does not add a view for edge constraints", function () {
            view = makeView();
            const rev = overrideDesignRevision();

            rev.addModule(makeModule({
                features: makeFootprint(10, 10, 'top'),
            }), {x: 30, y: 55});

            expect(countDimensions(view)).toEqual(0);
        });
    });

    describe("on click", function () {
        it("triggers WORKSPACE_CLICK if the helper is clicked", function () {
            view = makeView();
            let eventFired = false;
            eventDispatcher.subscribe(WORKSPACE_CLICK, () => eventFired = true);
            view.$('.interaction-helper').click();
            expect(eventFired).toBe(true);
        });

        it("doesn't trigger WORKSPACE_CLICK if the helper wasn't clicked", function () {
            view = makeView();
            let eventFired = false;
            eventDispatcher.subscribe(WORKSPACE_CLICK, () => eventFired = true);
            view.$el.click();
            expect(eventFired).toBe(false);
        });
    });

    describe("on scroll", function () {
        function getScrollDown() {
            return $.Event('mousewheel', {
                deltaY: -1
            });
        }

        it("triggers zoom on the grid area", function () {
            const workspace = new Workspace(true, true);
            const originalZoom = workspace.getZoom();
            view = makeView(workspace);
            // Create a BoardView in the workspace by adding a designRev and "initializing" placed items.
            const designRev = overrideDesignRevision();
            designRev.trigger(INIT_PLACED_ITEMS);
            view.$('.interaction-helper').trigger(getScrollDown());
            expect(originalZoom).not.toEqual(workspace.getZoom());
        });

        it("doesn't trigger zoom on other areas", function () {
            const workspace = new Workspace(true, true);
            const originalZoom = workspace.getZoom();
            view = makeView(workspace);
            // Create a BoardView in the workspace by adding a designRev and "initializing" placed items.
            const rev = overrideDesignRevision();
            rev.trigger(INIT_PLACED_ITEMS);
            view.$el.trigger(getScrollDown());
            expect(originalZoom).toEqual(workspace.getZoom());
        });
    });

    describe("Connections mode", function () {
        it("is enabled by default", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            expect(workspace.isConnecting()).toBe(true);
            expect(view.$el.hasClass('connections-mode-js')).toBe(true);
        });

        it("is disabled when connections mode is toggled off", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            workspace.toggleConnecting(); // Connecting mode is default.
            expect(workspace.isConnecting()).toBe(false);
            expect(view.$el.hasClass('connections-mode-js')).toBe(false);
        });

        it("is disabled when dimensions mode is turned on", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            workspace.toggleDimensioning();
            expect(workspace.isConnecting()).toBe(false);
            expect(view.$el.hasClass('connections-mode-js')).toBe(false);
        });
    });

    describe("Context Menu", function () {
        it("renders when the workspace is right clicked", function () {
            view = makeView();
            view.$('.interaction-helper').contextmenu();
            expect($('.contextmenu').html()).toContain("Fit board to modules");
        });

        it("doesn't render when a dimension is right clicked", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            const dimensionable = new PlacedModuleBuilder().build();
            const anchor = dimensionable.getAnchorByEdge('left');
            const dimension = createDimension({anchor1: anchor, anchor2: anchor});
            ReactDOM.render(
                <DimensionComponent workspaceIsDimensioning={true}
                                    workspaceScale={1}
                                    boardWidth={1}
                                    boardHeight={1}
                                    level={0}
                                    dimension={dimension}/>,
                view.$('.dimensions')[0]);

            const dimEl = view.$('.dimensions')[0].querySelector('.dimension');
            ReactTestUtils.Simulate.contextMenu(dimEl);

            expect($('.contextmenu').html()).toContain("lock");

            // Unmount react component in case it bugs things out in the future.
            ReactDOM.unmountComponentAtNode(view.$('.dimensions')[0]);
        });

        it("doesn't render when a placed module is right clicked", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            const pmView = new PlacedModuleView({
                model: new PlacedModuleBuilder().build(),
                workspace: workspace,
                onMousewheel: event => {
                }
            });
            view.$('#design').append(pmView.$el);
            pmView.$('.module-svg-container').contextmenu();
            const contextMenuContent = $('.contextmenu').html();
            expect(contextMenuContent).not.toContain("Fit board to modules");
            expect(contextMenuContent).toContain("Delete");
        });

        it("doesn't render when a placed logo is right clicked", function () {
            const workspace = new Workspace(true, true);
            view = makeView(workspace);
            const logoView = new PlacedLogoView({
                model: new PlacedLogoBuilder().build(),
                workspace: workspace,
                onMousewheel: event => {
                }
            });
            view.$('#design').append(logoView.$el);
            logoView.$('.logo-svg-container').contextmenu();
            const contextMenuContent = $('.contextmenu').html();
            expect(contextMenuContent).not.toContain("Fit board to modules");
            expect(contextMenuContent).toContain("Delete");
        });

        describe("On select Fit board to modules", function () {
            it("fits the board", function () {
                const designRev = new DesignRevisionBuilder().build();
                const m = new ModuleBuilder().build();
                designRev.addModule(m, {x: 0, y: 0});
                overrideDesignRevision(designRev);
                const workspace = new Workspace(true, true);
                view = makeView(workspace);
                view.$('.interaction-helper').contextmenu();
                selectContextItem('Fit board to modules');
                expect(designRev.board.width).toEqual(m.getWidth());
                expect(designRev.board.height).toEqual(m.getHeight());
            });
        });
    });

    describe("Hotkeys", function () {

        function triggerEsc() {
            $(document).trigger(getKeydown(27));
        }

        function triggerShiftDown() {
            $(document).trigger(getKeydown(16));
        }

        function triggerShiftUp() {
            $(document).trigger(getKeyup(16));
        }

        function getKeydown(key) {
            return $.Event('keydown', {
                which: key
            }) as JQuery.Event<Document>;
        }

        function getKeyup(key) {
            return $.Event('keyup', {
                which: key
            }) as JQuery.Event<Document>;
        }

        /**
         * TODO leftover dialogs from other tests are still "open" in the manager.
         */
        function mockClosedDialogs(): void {
            spyOn(DialogManager, 'hasOpenDialog').and.returnValue(false);
        }

        it("trigger when the workspace is open", function () {
            mockClosedDialogs();
            view = makeView();
            let escFired = false;
            eventDispatcher.subscribe(ESC, () => escFired = true);
            triggerEsc();
            expect(escFired).toBe(true);
        });

        it("don't trigger when the workspace is not open", function () {
            mockClosedDialogs();
            view = makeView();
            view.$el.hide();
            let escFired = false;
            eventDispatcher.subscribe(ESC, () => escFired = true);
            triggerEsc();
            expect(escFired).toBe(false);
        });

        it("on shift down, adds a CSS selector that suppresses require bus menus", function () {
            mockClosedDialogs();
            view = makeView();
            triggerShiftDown();
            expect(view.$el.hasClass('suppress-requires-js')).toBe(true);
        });

        it("on shift up, removes the CSS selector that suppresses require bus menus", function () {
            mockClosedDialogs();
            view = makeView();
            triggerShiftDown();
            expect(view.$el.hasClass('suppress-requires-js')).toBe(true);
            triggerShiftUp();
            expect(view.$el.hasClass('suppress-requires-js')).toBe(false);
        });

        describe("keypress R", function () {
            it("dispatches a rotate event on a selected block", function () {
                mockClosedDialogs();
                let eventFired = false;
                eventDispatcher.subscribe(BLOCK_ROTATE, () => eventFired = true);
                view = makeView();
                const designRev = overrideDesignRevision();
                const pm = designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                pm.setSelected(true);
                $(document).trigger(getKeydown(getKeyCode('R')));
                expect(eventFired).toBe(true);
            });

            it("doesn't dispatch a rotate event on a non-selected block", function () {
                mockClosedDialogs();
                let eventFired = false;
                eventDispatcher.subscribe(BLOCK_ROTATE, () => eventFired = true);
                view = makeView();
                const designRev = overrideDesignRevision();
                designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                $(document).trigger(getKeydown(getKeyCode('R')));
                expect(eventFired).toBe(false);
            });

            it("doesn't dispatch when the user has focused an input", function () {
                mockClosedDialogs();
                let eventFired = false;
                eventDispatcher.subscribe(BLOCK_ROTATE, () => eventFired = true);
                view = makeView();
                view.$('input').focus();
                const designRev = overrideDesignRevision();
                designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                $(document).trigger(getKeydown(getKeyCode('R')));
                expect(eventFired).toBe(false);
            });

            it("doesn't dispatch if there is an open dialog in the manager", function () {
                const dialog = DialogManager.create(Dialog, {title: "Boo"});
                let eventFired = false;
                eventDispatcher.subscribe(BLOCK_ROTATE, () => eventFired = true);
                view = makeView();
                const designRev = overrideDesignRevision();
                designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                $(document).trigger(getKeydown(getKeyCode('R')));
                expect(eventFired).toBe(false);
                dialog.remove();
            });
        });
    });

    describe("Multi View Tabs", function () {

        function makeEngineer(): void {
            spyOn(UserController, "getUser").and.returnValue(
                {
                    isEngineer: () => true,
                    isBetaTester: () => true,
                    isLoggedIn: () => true,
                    isFeatureEnabled: (Feature: FeatureFlag) => {
                        return Feature != FeatureFlag.WORKSPACE_MULTI_VIEWS;
                    },
                } as User);
        }

        it("shows buttons if feature flag is active", function () {
            makeEngineer();
            view = makeView();
            expect(view.$('.multi-view-button-item').length).not.toEqual('0');
        });

        it("opens upverter tab if button is clicked", function () {
            makeEngineer();
            view = makeView();
            const tabButton = view.el.querySelector('.upverter-button');
            ReactTestUtils.Simulate.click(tabButton);
            expect(view.$('#upverter-container').html()).not.toBeNull();
        });

        it("opens cad viewer tab if button is clicked", function () {
            makeEngineer();
            view = makeView();
            const tabButton = view.el.querySelector('.cad_viewer-button');
            ReactTestUtils.Simulate.click(tabButton);
            expect(view.$('#cad-viewer-container').html()).not.toBeNull();
        });
    });
});
