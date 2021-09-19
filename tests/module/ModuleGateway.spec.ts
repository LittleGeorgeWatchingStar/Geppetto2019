import Auth from "../../src/auth/Auth";
import {Module} from "../../src/module/Module";
import {getModuleGateway} from "../../src/module/ModuleGateway";
import {makeSimpleFootprint} from "./TestModule";


describe('ModuleGateway', function () {

    const moduleUrl = 'http://geppetto.mystix.com/api/v3/module/library/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getDetailedModule", function () {
        const responseData = {
            module_id: 12,
            revision_id: 44,
            revision_no: 2,
            name: 'my test module',
            features: makeSimpleFootprint(3),
        };

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(`${moduleUrl}12/`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getModuleGateway();
            const xhr = gateway.getDetailedModule('12');
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(`${moduleUrl}12/`).length).toEqual(1);
        });

        it('returns a Module instance', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getModuleGateway();
            gateway.getDetailedModule('12').done(results => {
                expect(results).toEqual(jasmine.any(Module));
                expect('getId' in results).toBe(true);
            });
        });
    });

    describe("getLibrary", function () {
        const responseData = [
            {
                module_id: 12,
                revision_id: 44,
                revision_no: 2,
                name: 'my test module',
                features: makeSimpleFootprint(3),
                category: {
                    id: 13,
                    name: 'Headers',
                    title: 'Headers'
                },
            },
            {
                module_id: 13,
                revision_id: 45,
                revision_no: 3,
                name: 'my other test module',
                features: makeSimpleFootprint(3),
                category: {
                id: 13,
                    name: 'Headers',
                    title: 'Headers'
                },
            }
        ];

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(moduleUrl)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getModuleGateway();
            const xhr = gateway.getCompatibleModules();
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(moduleUrl).length).toEqual(1);
        });

        it('returns an array of Module instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getModuleGateway();
            gateway.getCompatibleModules().done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(Module));
                });
            });
        });
    });
});
