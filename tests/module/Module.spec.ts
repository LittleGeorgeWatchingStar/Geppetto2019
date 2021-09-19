import {Module} from "module/Module";
import {ModuleBuilder} from "./ModuleBuilder";
import {ModuleResourceBuilder} from "./ModuleResourceBuilder";
import ModuleController from "../../src/module/ModuleController";
import {busResource} from "../bus/TestBus";
import Auth from "../../src/auth/Auth";

/** The limited data we get back from a list request to the server */
const listData = {
    module_id: 1,
    revision_id: 10,
    name: 'Test module',
    description: "A test module",
    price: 5.99,
    marketing: [{
        resource_uri: "https://madison.gumstix.com/app.php/api/features/523/",
        name: "TexasInstruments",
        description: "Primary functionality is provided by a TI chip.",
        image_uri: "https://d3iwea566ns1n1.cloudfront.net/images/feature/523/523.png"
    }],
    features: [
        {
            type: 'footprint',
            points: [{x: 0, y: 0}, {x: 3, y: 0}]
        },
        {
            type: 'footprint',
            points: [{x: 3, y: 0}, {x: 3, y: 3}]
        },
        {
            type: 'footprint',
            points: [{x: 3, y: 3}, {x: 0, y: 3}]
        },
        {
            type: 'footprint',
            points: [{x: 0, y: 3}, {x: 0, y: 0}]
        }
    ]
};

/** The full data we get back from a single-record request. */
const detailData = Object.assign(listData, {
    provides: [{
        id: 12199,
        title: "UART1",
        address: null,
        level: "1.80000",
        capacity: "1",
        exclusions: [
            12257,
            12285,
            12253
        ]
    }],
    requires: [{
        id: 3205,
        title: "1.8V",
        address: null,
        level: "1.80000",
        amount: "10",
        exclusions: []

    }]
});


describe("Module", function () {
    let module;

    beforeEach(function () {
        module = new Module(listData);
    });

    it("returns the correct unique ID", function () {
        expect(module.getId()).toEqual(10);
    });

    it("returns the correct module ID", function () {
        expect(module.getModuleId()).toEqual(1);
    });

    it("returns the correct revision ID", function () {
        expect(module.getRevisionId()).toEqual(10);
    });

    it("returns the correct title", function () {
        expect(module.title).toEqual("Test module");
    });

    it("knows its area", function () {
        expect(module.getArea()).toEqual(9);
    });

    it("is power module", function () {
        module.set('category', {name: 'Lots of POWER'});
        expect(module.isPowerModule).toBe(true);
    });

    it("is not power module", function () {
        module.set('category', {name: 'Lots of OTHER STUFF POW!'});
        expect(module.isPowerModule).toBe(false);
    });

    describe("compareLaunch", function () {
        it("can sort modules in order of launch", function () {
            const m = new ModuleBuilder().withLaunchDate('Jan 1, 2000').build();
            const m2 = new ModuleBuilder().withLaunchDate('Jan 3, 2000').build();
            const m3 = new ModuleBuilder().withLaunchDate('Jan 2, 2000').build();
            const sorted = [m, m2, m3].sort((a, b) => b.compareLaunch(a));
            expect(sorted[0].launch).toEqual('Jan 3, 2000');
            expect(sorted[1].launch).toEqual('Jan 2, 2000');
        });

        it("can handle cases where a launch date is null", function () {
            const m = new ModuleBuilder().withLaunchDate('Jan 1, 2000').build();
            const m2 = new ModuleBuilder().withLaunchDate(null).build();
            const m3 = new ModuleBuilder().withLaunchDate(null).build();
            const sorted = [m, m2, m3].sort((a, b) => b.compareLaunch(a));
            expect(sorted[0].launch).toEqual('Jan 1, 2000');
        });
    });

    describe('isCategory function', function () {
        it("returns true for category names with mismatched casing", function () {
            module.set('category', {name: 'case-insensitive category'});
            expect(module.isCategory('CASE-insensitive CATeGORY')).toBe(true);
        });

        it("returns true for category names with identical casing", function () {
            module.set('category', {name: 'test category'});
            expect(module.isCategory('test category')).toBe(true);
        });

        it("returns false for different category names", function () {
            module.set('category', {name: 'category1'});
            expect(module.isCategory('category2')).toBe(false);
        });
    });

    describe("functional group", function () {
        it('is null by default', function () {
            const m = new ModuleBuilder().build();
            expect(m.functionalGroup == null).toBe(true);
        });

        it('denies membership if undefined', function () {
            const m = new ModuleBuilder().build();
            expect(m.isFunctionalGroup(1)).toBe(false);
            expect(m.isFunctionalGroup(null)).toBe(false);
            expect(m.isFunctionalGroup(undefined)).toBe(false);
        });

        it('confirms membership if set', function () {
            const m = new ModuleBuilder()
                .withFunctionalGroup(12)
                .build();
            expect(m.isFunctionalGroup(1)).toBe(false);
            expect(m.isFunctionalGroup(12)).toBe(true);
            expect(m.isFunctionalGroup(null)).toBe(false);
            expect(m.isFunctionalGroup(undefined)).toBe(false);
        });
    });

    describe("loading details(buses)", function () {
        function simulateAnonymousUser() {
            spyOn(Auth, "isLoggedIn").and.returnValue(false);
        }

        let module;
        beforeEach(function (done) {
            jasmine.Ajax.install();
            simulateAnonymousUser();

            const resource = Object.assign(new ModuleResourceBuilder().build(), {
                is_summary: true
            });
            const detailedResource = Object.assign({}, resource,{
                is_summary: false,
                requires: [
                    busResource(),
                    busResource()
                ]
            });

            jasmine.Ajax
                .stubRequest(`http://geppetto.mystix.com/api/v3/module/library/1/`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(detailedResource)
                });

            module = new Module(resource);
            expect(module.get('requires')).toBeUndefined();

            ModuleController.loadDetailedModule(module).then(() => {
                done();
            });

        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it("loads to module attributes", function() {
            expect(module.get('requires')).toBeDefined();
            expect(module.get('requires').length).toEqual(2);
        });
    });
});
