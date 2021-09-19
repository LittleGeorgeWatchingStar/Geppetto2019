import events from "../../src/utils/events";
import eventDispatcher from "../../src/utils/events";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import User from "../../src/auth/User";
import UserController from "../../src/auth/UserController";
import {DESIGN_NEW} from "../../src/design/events";
import * as Backbone from "backbone";
import {USER_CHANGED} from "../../src/auth/events";
import {overrideDesignRevision} from "../design/TestDesign";
import {Workspace} from "../../src/workspace/Workspace";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import * as $ from "jquery";
import * as ReactTestUtils from 'react-dom/test-utils';
import {getWorkspaceToolbuttons} from "../../src/toolbar/toolbutton/WorkspaceToolbuttons";
import {Toolbar} from "../../src/toolbar/Toolbar";
import * as ReactDOM from "react-dom";
import * as React from "react";
import * as BoardBuilderDialogFactory
    from "../../src/design/boardbuilder/BoardBuilderDialogController";
import * as BoardBuilderProfileGateway
    from "../../src/design/boardbuilder/BoardBuilderPathGateway";
import {WorkingAreaToolbar} from "../../src/toolbar/workingarea/WorkingAreaToolbar";
import {getWorkingAreaToolbuttons} from "../../src/toolbar/workingarea/WorkingAreaToolbuttons";
import {HELP, REFOCUS} from "../../src/toolbar/events";
import {getAllActionLogs} from "../../src/core/action";


function mockCleanDesign() {
    const designRev = new DesignRevisionBuilder()
        .withOwner(100)
        .withImage('coolboard.jpg')
        .build();
    designRev.clearDirty();
    spyOn(designRev, 'isNew').and.returnValue(false);
    overrideDesignRevision(designRev);
}

function makeValidatedDesign() {
    const designRev = new DesignRevisionBuilder()
        .withOwner(100)
        .withImage('coolboard.jpg')
        .asPushed('holy-sassy-molassy')
        .build();
    designRev.clearDirty();
    spyOn(designRev, 'isNew').and.returnValue(false);
    overrideDesignRevision(designRev);
}

function makeOwner() {
    const user = new User({
        id: 100
    });
    UserController.init(user);
    spyOn(UserController.getUser(), 'isLoggedIn').and.returnValue(true);
}

function makeEngineer() {
    const user = new User();
    UserController.init(user);
    spyOn(UserController.getUser(), 'isEngineer').and.returnValue(true);
    spyOn(UserController.getUser(), 'isLoggedIn').and.returnValue(true);
}

function makeRando() {
    const user = new User({
        id: 5
    });
    UserController.init(user);
}

function makeWorkspaceView(workspace = new Workspace(true, true)): WorkspaceView {
    return new WorkspaceView({
        model: workspace,
        panel: {
            $el: $('<div></div>'),
            remove: () => {
            }
        }
    } as WorkspaceViewOptions);
}

function makeWorkspaceToolbar(workspace = new Workspace(true, true)): HTMLElement {
    const container = document.createElement('div');
    const toolbuttons = getWorkspaceToolbuttons(workspace);
    const toolbar = <Toolbar toolbuttonGroups={toolbuttons}/>;
    ReactDOM.render(toolbar, container);
    return container;
}

function makeWorkingAreaToolbar(workspace = new Workspace(true, true)): HTMLElement {
    const container = document.createElement('div');
    const workingAreaToolbar = <WorkingAreaToolbar
        toolbuttonGroups={getWorkingAreaToolbuttons(workspace, getAllActionLogs())} isModuleLibraryOpen={true}/>;
    ReactDOM.render(workingAreaToolbar, container);
    return container;
}


describe("Workspace toolbar", function () {

    let workspace = null;

    afterEach(() => {
        if (workspace) {
            workspace.remove();
            workspace = null;
        }
    });

    describe("Initialize", function () {
        it("disables the Share button if the design is new", function () {
            const user = new User();
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            overrideDesignRevision();
            workspace = makeWorkspaceView();
            const shareButton = workspace.$('#design-share');
            expect($(shareButton).attr('disabled')).toBeTruthy();
        });

        it("disables the Share button if the design has yet to load", function () {
            const user = new User();
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            overrideDesignRevision(null);
            workspace = makeWorkspaceView();
            const shareButton = workspace.$('#design-share');
            expect($(shareButton).attr('disabled')).toBeTruthy();
        });
    });
});

describe("Workspace Toolbutton", function () {

    let workspaceView = null;

    afterEach(() => {
        if (workspaceView) {
            workspaceView.remove();
            workspaceView = null;
        }
    });

    describe("Save", function () {
        it("is available for new designs", function () {
            const designRev = new DesignRevisionBuilder().asDirty().build();
            designRev.isNew = () => true;
            overrideDesignRevision(designRev);
            workspaceView = makeWorkspaceView();
            const save = workspaceView.$('#save');
            // When the disabled attribute doesn't exist, it returns null or ''. We'll check falsy.
            expect(save.attr('disabled')).toBeFalsy();
        });

        it("is available for dirty designs", function () {
            const designRev = new DesignRevisionBuilder().asDirty().build();
            designRev.isNew = () => false;
            overrideDesignRevision(designRev);
            workspaceView = makeWorkspaceView();
            const save = workspaceView.$('#save');
            // When the disabled attribute doesn't exist, it returns null or ''. We'll check falsy.
            expect(save.attr('disabled')).toBeFalsy();
        });

        it("is unavailable for designs that are neither new nor dirty", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.isNew = () => false;
            overrideDesignRevision(designRev);
            workspaceView = makeWorkspaceView();
            const save = workspaceView.$('#save');
            expect(save.attr('disabled')).toBeTruthy();
        });

        xit("becomes available on DESIGN_NEW", function () {
            const designRev = new DesignRevisionBuilder().build();
            designRev.isNew = () => true;
            overrideDesignRevision(designRev);
            workspaceView = makeWorkspaceView();
            const save = workspaceView.$('#save').attr('disabled', 'disabled');
            events.publish(DESIGN_NEW);
            expect(save.attr('disabled')).toBeFalsy();
        });
    });

    describe("Share", function () {

        it("is active for the owner of the current design revision", function () {
            mockCleanDesign();
            makeOwner();
            workspaceView = makeWorkspaceView();
            const shareButton = workspaceView.$('#design-share');
            // When the disabled attribute doesn't exist, it returns null or ''. We'll check falsy.
            expect($(shareButton).attr('disabled')).toBeFalsy();
        });

        it("is not active for non-owners", function () {
            mockCleanDesign();
            makeRando();
            workspaceView = makeWorkspaceView();
            const shareButton = workspaceView.$('#design-share');
            expect(shareButton.attr('disabled')).toBeTruthy();
        });
    });

    describe("Context mode buttons", function () {

        it("dimensioning can be activated", function () {
            workspaceView = makeWorkspaceView();
            const dimensionButton = workspaceView.el.querySelector('#dimension');
            ReactTestUtils.Simulate.click(dimensionButton);
            expect(dimensionButton.classList.contains('active-js')).toBe(true);
        });

        it("deactivates other modes when clicked", function () {
            workspaceView = makeWorkspaceView();
            const dimensionButton = workspaceView.el.querySelector('#dimension');
            ReactTestUtils.Simulate.click(dimensionButton);
            const connectionsButton = workspaceView.el.querySelector('#connect');
            expect(connectionsButton.classList.contains('active-js')).toBe(false);
        });
    });

    describe("Validate", function () {
        it("is active for the owner of the current design revision", function () {
            mockCleanDesign();
            makeOwner();
            workspaceView = makeWorkspaceView();
            const validate = workspaceView.$('#order');
            // When the disabled attribute doesn't exist, it returns null or ''. We'll check falsy.
            expect(validate.attr('disabled')).toBeFalsy();
        });

        it("is active for engineers", function () {
            mockCleanDesign();
            makeEngineer();
            workspaceView = makeWorkspaceView();
            const validate = workspaceView.$('#order');
            expect(validate.attr('disabled')).toBeFalsy();
        });

        it("is not available when the design has been pushed", function () {
            makeValidatedDesign();
            makeRando();
            workspaceView = makeWorkspaceView();
            expect(workspaceView.$('#order').length).toEqual(0);
        });
    });

    describe("Products", function () {
        it("does not appear when a design is not validated", function () {
            mockCleanDesign();
            makeRando();
            workspaceView = makeWorkspaceView();
            expect(workspaceView.$('#shop').length).toEqual(0);
        });

        it("appears for a validated design", function () {
            makeValidatedDesign();
            makeRando();
            workspaceView = makeWorkspaceView();
            expect(workspaceView.$('#shop').length).toEqual(1);
        });
    });

    describe("User changed", function () {
        it("shows engineer buttons to engineers", function () {
            makeRando();
            workspaceView = makeWorkspaceView();
            events.publish(USER_CHANGED);
            const numButtonsBefore = workspaceView.$('button').length;
            makeEngineer();
            events.publish(USER_CHANGED);
            const numButtonsAfter = workspaceView.$('button').length;
            expect(numButtonsAfter).toBeGreaterThan(numButtonsBefore);
        });

        it("does not show engineer buttons to nonengineers", function () {
            makeEngineer();
            workspaceView = makeWorkspaceView();
            events.publish(USER_CHANGED);
            const numButtonsBefore = workspaceView.$('button').length;
            makeRando();
            events.publish(USER_CHANGED);
            const numButtonsAfter = workspaceView.$('button').length;
            expect(numButtonsAfter).toBeLessThan(numButtonsBefore);
        });
    });

    describe("Board Builder", function () {
        it("has the right route when clicked", function () {
            makeEngineer();
            const deferred = $.Deferred();
            deferred.resolve({
                module_id: null,
                module_name: null,
                module_locked: false,
                excluded_module_ids: [],
                categories: [],
            });
            spyOn(BoardBuilderProfileGateway, 'getBoardBuilderProfileGateway').and.callFake(() => {
                return {
                    getConfigurationForPath: () => deferred.promise(),
                };
            });
            workspaceView = makeWorkspaceView();
            const builderButton = workspaceView.el.querySelector('#boardbuilder');
            const navigateSpy = spyOn(Backbone.history, 'navigate').and.callThrough();
            ReactTestUtils.Simulate.click(builderButton);
            expect(navigateSpy).toHaveBeenCalledWith('!/workspace/boardbuilder');
        });
    });
});


describe("Working area toolbutton", () => {

    it('refocus button works', () => {
        const w = new Workspace(true, true);
        const container = makeWorkingAreaToolbar(w);
        const refocus = container.querySelector('#refocus-icon');
        let eventFired = false;
        eventDispatcher.subscribe(REFOCUS, () => eventFired = true);
        ReactTestUtils.Simulate.click(refocus);
        expect(eventFired).toBe(true);
    });

    it('zoom in button works', () => {
        const w = new Workspace(true, true);
        const container = makeWorkingAreaToolbar(w);
        const zoomIn = container.querySelector('#zoom-in');
        ReactTestUtils.Simulate.click(zoomIn);
        expect(w.getZoom() === 0.8).toBe(true);
    });

    it('zoom out button works', () => {
        const w = new Workspace(true, true);
        const container = makeWorkingAreaToolbar(w);
        const zoomOut = container.querySelector('#zoom-out');
        ReactTestUtils.Simulate.click(zoomOut);
        expect(w.getZoom() === 0.4).toBe(true);
    });

    it('help button works', () => {
        const w = new Workspace(true, true);
        const container = makeWorkingAreaToolbar(w);
        const helpButton = container.querySelector('#help');
        let eventFired = false;
        eventDispatcher.subscribe(HELP, () => eventFired = true);
        ReactTestUtils.Simulate.click(helpButton);
        expect(eventFired).toBe(true);
    });
});