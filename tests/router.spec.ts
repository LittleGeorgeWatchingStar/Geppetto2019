import {DesignBuilder} from "./design/DesignBuilder";
import User from "../src/auth/User";
import UserController from "../src/auth/UserController";
import * as $ from "jquery";
import {Collaboration} from "../src/design/sharing/Collaboration";
import {checkPermission, Router} from "../src/router";
import * as Backbone from "backbone";
import {DesignController, DesignLoader} from "../src/design/DesignController";
import {TabSpec} from "../src/view/TabNavigation";
import {makeTabNav} from "./view/TabNavigation.spec";
import {Library} from "../src/module/Library";
import {Dashboard} from "../src/view/dashboard/Dashboard";
import {ServerConfigController} from "../src/core/server-config/server-config.controller";

const getPermissionUrl = 'http://geppetto.mystix.com/api/v3/design/share/permission/1/';

function mockSuccessfulResponse(response: string): void {
    jasmine.Ajax
        .stubRequest(getPermissionUrl)
        .andReturn({
            status: 200,
            contentType: 'application/json',
            responseText: JSON.stringify(response)
        });
}

describe("Router", function () {

    beforeEach(function () {
        $('body').empty();
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function makeEngineer(): User {
        const user = new User();
        spyOn(user, 'isEngineer').and.returnValue(true);
        return user;
    }

    function makeUser(): void {
        const u = new User();
        UserController.init(u);
    }

    it("knows to open the design if it's owned by the current user", function () {
        const u = new User({
            id: 10
        });
        UserController.init(u);
        const design = new DesignBuilder().withOwnerId(10).build();
        const spy = spyOn(DesignLoader.prototype, 'open').and.callThrough();
        checkPermission(design);
        expect(spy).toHaveBeenCalled();
    });

    it("knows to launch an open/clone dialog for engineers", function () {
        spyOn(UserController, 'getUser').and.returnValue(makeEngineer());
        const design = new DesignBuilder().withOwnerId(10).build();
        checkPermission(design);
        expect($('.ui-dialog').length).toEqual(1);
    });

    it("knows to launch an open/clone dialog for collaborators with edit privilege", function () {
        mockSuccessfulResponse(Collaboration.EDIT_PERMISSION);
        const u = new User();
        UserController.init(u);
        const design = new DesignBuilder().withId(1).withOwnerId(10).build();
        checkPermission(design);
        expect($('.ui-dialog').length).toEqual(1);
    });

    it("knows to clone the design for users who only have view permissions", function () {
        mockSuccessfulResponse(Collaboration.VIEW_PERMISSION);
        const u = new User();
        UserController.init(u);
        const spy = spyOn(DesignLoader.prototype, 'clone').and.callThrough();
        const design = new DesignBuilder().withId(1).withOwnerId(10).build();
        checkPermission(design);
        expect(spy).toHaveBeenCalled();
    });

    describe("ExpandedDesignDialog", function () {
        it("opens if we travel to the dashboard tab route that matches its relativePath", function (done) {
            $('body').empty();
            const tab = new Dashboard({
                pageTitle: "Dashboard",
                url: "dashboard",
                library: new Library()
            } as TabSpec);
            const menuTabUrl = ['my-design'];
            spyOn(DesignController, 'fetchDesigns').and.callFake(() => {
                const deferred = $.Deferred();
                deferred.resolve([
                    new DesignBuilder().withId(5).build()
                ]);
                return deferred.promise();
            });
            spyOn(ServerConfigController, 'init').and.returnValue({
                featuredTemplates: [],
            });
            new Router([tab], menuTabUrl);
            makeUser();
            tab.loadDesigns().then(() => {
                Backbone.history.navigate('!/dashboard/preview/5', {trigger: true});
                expect($('.design-preview-expanded').length).toEqual(1);
                // Stop the history started by Router as we can only have one history at a time.
                Backbone.history.stop();
                done();
                tab.remove();
            });
        });
    });

    describe("Open design on load", function () {
        it("opens the workspace", function () {
            // Not sure why other tests are now interfering with this one.
            spyOn(DesignController, 'fetchDesign').and.callFake(() => {
                const deferred = $.Deferred();
                deferred.resolve(new DesignBuilder().withId(5).build());
                return deferred.promise();
            });
            spyOn(ServerConfigController, 'init').and.returnValue({
                featuredTemplates: [],
            });
            const tab = new Dashboard({
                pageTitle: "Dashboard",
                url: "dashboard",
                library: new Library()
            } as TabSpec);
            const url = ['dashboard'];
            new Router([tab], url);
            makeTabNav();
            Backbone.history.navigate('!/design/5', {trigger: true});
            expect($('.workspace.tabview').css('display')).toEqual('block');
            expect($('.community.tabview').is(':visible')).toBe(false);
            Backbone.history.stop();
            tab.remove();
        });
    });

    describe("Filter design previews on load", function () {
        it("opens the specified design tab in dashboard", function () {
            makeTabNav();
            const tab = new Dashboard({
                pageTitle: 'Dashboard',
                url: 'dashboard',
                library: new Library()
            } as TabSpec);
            const url = ['community'];
            new Router([tab], url);
            Backbone.history.navigate('!/dashboard/community', {trigger: true});
            expect($('.community.tabview').css('display')).not.toEqual('none');
            Backbone.history.stop();
            tab.remove();
        });
    });
});
