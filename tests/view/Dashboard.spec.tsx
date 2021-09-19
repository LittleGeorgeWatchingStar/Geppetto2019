import {DesignBuilder} from "../design/DesignBuilder";
import {DesignController} from "../../src/design/DesignController";
import * as $ from "jquery";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import User from "../../src/auth/User";
import UserController from "../../src/auth/UserController";
import {Dashboard} from "../../src/view/dashboard/Dashboard";
import {TabNavigation, TabSpec} from "../../src/view/TabNavigation";
import * as Backbone from "backbone";
import * as Login from "../../src/controller/Login";
import WorkspaceView, {WorkspaceViewOptions} from "../../src/workspace/WorkspaceView";
import {Router} from "../../src/router";
import {overrideDesignRevision} from "../design/TestDesign";
import {Workspace} from "../../src/workspace/Workspace";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {PROCESSOR} from "../../src/module/Category";
import {Library} from "../../src/module/Library";
import {getMarketingIcon} from "./DesignPreview.spec";
import * as ReactDOM from "react-dom";
import {MiniDesignPreview} from "../../src/design/designpreview/MiniDesignPreview";
import * as React from "react";
import * as ReactTestUtils from "react-dom/test-utils";
import * as BoardBuilderProfileGateway
    from "../../src/design/boardbuilder/BoardBuilderPathGateway";
import {LoginController} from "../../src/controller/Login";
import {DashboardContent} from "../../src/view/dashboard/DashboardContent";
import {ServerConfigController} from "../../src/core/server-config/server-config.controller";

function mockDesignFetch(): void {
    const designs = [
        new DesignBuilder()
            .withDesignRevision(new DesignRevisionBuilder().build())
            .build()
    ];
    spyOn(DesignController, 'fetchDesigns').and.callFake(() => {
        const deferred = $.Deferred();
        deferred.resolve(designs);
        return deferred.promise() as any;
    });
    spyOn(ServerConfigController, 'init').and.returnValue({
        featuredTemplates: [],
    });
}

function makeUser(): User {
    const u = new User();
    spyOn(u, 'isLoggedIn').and.returnValue(true);
    spyOn(UserController, 'getUser').and.returnValue(u);
    return u;
}

function mockUserDesigns(): User {
    const user = makeUser();
    spyOn(user, 'fetchDesigns').and.callFake(() => {
        const deferred = $.Deferred();
        deferred.resolve([
            new DesignBuilder()
                .withUpdated(new Date('Jan 3, 2000'))
                .withTitle('first')
                .build(),
            new DesignBuilder()
                .withUpdated(new Date('Jan 1, 2000'))
                .withTitle('third')
                .build(),
            new DesignBuilder()
                .withUpdated(new Date('Jan 2, 2000'))
                .withTitle('second')
                .build()
        ]);
        return deferred.promise();
    });
    spyOn(user, 'fetchCollaboratorDesigns').and.callFake(() => {
        const deferred = $.Deferred();
        deferred.resolve([
            new DesignBuilder().build(),
            new DesignBuilder().build(),
        ]);
        return deferred.promise();
    });
    return user;
}

function mockEmptyDesigns(user: User): void {
    const callback = () => {
        const deferred = $.Deferred();
        deferred.resolve([]);
        return deferred.promise();
    };
    spyOn(user, 'fetchDesigns').and.callFake(callback);
    spyOn(user, 'fetchCollaboratorDesigns').and.callFake(callback);
}

describe("Dashboard", function () {

    let dashboard = null;
    UserController.init(new User());

    beforeEach(() => {
        mockDesignFetch();
    });

    afterEach(() => {
        if (dashboard) {
            dashboard.remove();
            dashboard = null;
        }
    });

    function makeDashboard(): void {
        dashboard = new Dashboard({
            pageTitle: "Dashboard",
            url: "dashboard",
            library: new Library()
        } as TabSpec);
    }

    /**
     * TODO cloneable designs are currently hard-coded
     */
    xit("loads cloneable designs if available", function (done) {
        mockUserDesigns();
        makeDashboard();
        dashboard.loadDesigns().then(() => {
            const designs = dashboard.el.querySelector('.clone-designs li');
            expect(designs).not.toBeNull();
            done();
        });
    });

    it("loads user designs if available", function (done) {
        mockUserDesigns();
        makeDashboard();
        dashboard.loadDesigns().then(() => {
            const designs = dashboard.el.querySelector('.user-designs li');
            expect(designs).not.toBeNull();
            done();
        });
    });

    it("loads user designs by order of updated date", function (done) {
        mockUserDesigns();
        makeDashboard();
        dashboard.loadDesigns().then(() => {
            const names = dashboard.$('.user-designs .name');
            expect(names[0].innerHTML).toBe('first');
            expect(names[1].innerHTML).toBe('second');
            expect(names[2].innerHTML).toBe('third');
            done();
        });
    });

    it("loads a user message if there are no user designs", function (done) {
        const user = makeUser();
        mockEmptyDesigns(user);
        makeDashboard();
        dashboard.loadDesigns().then(() => {
            expect(dashboard.el.getElementsByClassName('dashboard-message')).not.toBeNull();
            done();
        });
    });

    it("loads designs shared to the user if available", function (done) {
        mockUserDesigns();
        makeDashboard();
        dashboard.loadDesigns().then(() => {
            const designs = dashboard.el.querySelector('.shared-designs li');
            expect(designs).not.toBeNull();
            done();
        });
    });

    describe("Welcome message", function () {
        it("contains the user's first name if logged in", function () {
            const u = new User({
                first_name: "Pejoy"
            });
            u.isLoggedIn = () => true;
            mockEmptyDesigns(u);
            spyOn(UserController, 'getUser').and.returnValue(u);
            makeDashboard();
            expect(dashboard.$('h2')[0].innerHTML.includes('Pejoy'));
        });

        it("is a generic message if the user is logged out", function () {
            const u = new User();
            u.isLoggedIn = () => false;
            mockEmptyDesigns(u);
            spyOn(UserController, 'getUser').and.returnValue(u);
            makeDashboard();
            expect(dashboard.$('h2')[0].innerHTML.includes('Welcome to Geppetto'));
        });
    });

    describe("On initialization", function () {
        it("does not show designs", function () {
            mockUserDesigns();
            makeDashboard();
            const designs = [
                dashboard.el.querySelector('.clone-designs li'),
                dashboard.el.querySelector('.user-designs li'),
                dashboard.el.querySelector('.shared-designs li')
            ];
            let isLoaded = false;
            for (const list of designs) {
                if (null != list) {
                    isLoaded = true;
                    break;
                }
            }
            expect(isLoaded).toBe(false);
        });
    });

    describe("Log in button", function () {
        it("shows when the user isn't logged in", function () {
            spyOn(UserController.getUser(), 'isLoggedIn').and.returnValue(false);
            makeDashboard();
            expect(dashboard.$('.log-in').length).toEqual(1);
        });

        it("calls log in", function () {
            const loginController = new LoginController();
            loginController.init('http://login.url');
            LoginController.setInstance(loginController);
            const loginSpy = spyOn(LoginController.getInstance(), 'login').and.callFake(() => {});

            spyOn(UserController.getUser(), 'isLoggedIn').and.returnValue(false);

            makeDashboard();
            ReactTestUtils.Simulate.click(dashboard.el.querySelector('.log-in'));
            expect(loginSpy).toHaveBeenCalled();
        });
    });

    describe("Navigation", function () {

        let workspaceView = null;

        function createNavigation(): void {
            $('body').html('<div class="tabbuttons">' +
                '<div class="tabcontainer"></div></div>');
            spyOn(UserController, 'isTutorialEnabled').and.callFake(() => true);
            workspaceView = new WorkspaceView({
                model: new Workspace(true, true),
                panel: {
                    $el: $('<div></div>'),
                    remove: () => {}
                }
            } as WorkspaceViewOptions);
            TabNavigation.initialize(true, [],  $('.tabbuttons'), $('.tabcontainer'), workspaceView);
            new Router(TabNavigation.designTabs, DashboardContent.dashboardMenuUrls);
        }

        afterEach(() => {
            if (workspaceView) {
                workspaceView.remove();
                workspaceView = null;
            }
            Backbone.history.stop();
        });

        it('can open the board builder', () => {
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

            createNavigation();
            makeDashboard();
            const button = dashboard.el.querySelectorAll('.default-options .option')[1];
            ReactTestUtils.Simulate.click(button);
            expect($('.board-builder-dialog').length).toEqual(1);
            expect($('.tabview.workspace').is(':visible')).toBe(true);
        });

        /**
         * TODO These are broken due to the ModuleInfoBox React changes and I don't know why.
         */
        xit("can call create new design when the design is clean", function () {
            createNavigation();
            makeDashboard();
            overrideDesignRevision(new DesignRevisionBuilder().build());
            const navSpy = spyOn(DesignController, 'createNewDesign').and.callThrough();
            const button = dashboard.el.querySelectorAll('.default-options .option')[0];
            ReactTestUtils.Simulate.click(button);
            expect($('.tabview.workspace').is(':visible')).toBe(true);
            expect(navSpy).toHaveBeenCalled();
        });

        xit("does not call create new design when the design is not clean", function () {
            createNavigation();
            makeDashboard();
            const designRev = new DesignRevisionBuilder().asDirty().build();
            overrideDesignRevision(designRev);
            const navSpy = spyOn(DesignController, 'createNewDesign').and.callThrough();
            const button = dashboard.el.querySelectorAll('.default-options .option')[0];
            ReactTestUtils.Simulate.click(button);
            expect($('.tabview.workspace').is(':visible')).toBe(true);
            expect(navSpy).not.toHaveBeenCalled();
        });

        it("can go to the gumstix tab", function (done) {
            createNavigation();
            mockUserDesigns();
            makeDashboard();
            dashboard.loadDesigns().then(() => {
                const button = dashboard.el.querySelector('.clone-designs-container a');
                ReactTestUtils.Simulate.click(button);
                expect($('.gumstix.tabview').css('display')).not.toEqual('none');
                done();
            });
        });

        it("can go to the my designs tab", function (done) {
            createNavigation();
            mockUserDesigns();
            makeDashboard();
            dashboard.loadDesigns().then(() => {
                const button = dashboard.el.querySelector('.user-design-container a');
                ReactTestUtils.Simulate.click(button);
                expect($('.tabview.my-designs').css('display')).not.toEqual('none');
                done();
            });
        });

        it("can go to the shared tab", function (done) {
            createNavigation();
            mockUserDesigns();
            makeDashboard();
            dashboard.loadDesigns().then(() => {
                const button = dashboard.el.querySelector('.shared-design-container a');
                ReactTestUtils.Simulate.click(button);
                expect($(`.tabview.${TabNavigation.SHARED}`).css('display')).not.toEqual('none');
                done();
            });
        });
    });
});

describe("MiniDesignPreview", function () {

    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.clear();
    });

    describe("Render", function () {
        it("displays the design name", function () {
            const d = new DesignBuilder()
                .withTitle('Pretz')
                .build();
            ReactDOM.render(<MiniDesignPreview design={d}
                                               url='dashboard'
                                               library={null}/>, container);
            expect(container.innerHTML.includes('Pretz')).toBe(true);
        });

        it("can show the COM/Processor icon if available", function () {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            ReactDOM.render(<MiniDesignPreview design={design}
                                               url='dashboard'
                                               library={new Library(modules)}/>, container);
            expect(container.querySelectorAll('.icons img').length).toEqual(1);
        });

        it("does not show the COM/Processor icon if there is no library", function () {
            const module = new ModuleBuilder()
                .withCategory({
                    id: 1,
                    name: PROCESSOR
                })
                .withMarketing([getMarketingIcon()])
                .build();
            const modules = [module];
            const moduleIds = modules.map(m => m.getModuleId());
            const design = new DesignBuilder().withModuleIds(moduleIds).build();
            ReactDOM.render(<MiniDesignPreview design={design}
                                               url='dashboard'
                                               library={null}/>, container);
            expect(container.querySelectorAll('.icons img').length).toEqual(0);
        });
    });

    describe("On click", function () {
        it("correctly traverses the URL", function () {
            const design = new DesignBuilder()
                .withId(13)
                .build();
            ReactDOM.render(<MiniDesignPreview design={design}
                                               url='dashboard'
                                               library={null}/>, container);
            const navigateSpy = spyOn(Backbone.history, 'navigate').and.callThrough();
            ReactTestUtils.Simulate.click(container.querySelector('.design-preview-mini-container'));
            expect(navigateSpy).toHaveBeenCalledWith('!/dashboard/preview/13', Object({ trigger: true }));
        });
    });
});
