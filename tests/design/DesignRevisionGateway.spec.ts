import {getDesignRevisionGateway} from "../../src/design/DesignRevisionGateway";
import {DesignRevision} from "../../src/design/DesignRevision";
import Auth from "../../src/auth/Auth";
import {makeSimpleFootprint} from "../module/TestModule";
import {Module} from "../../src/module/Module";


describe('DesignRevisionGateway', function () {

    const designRevisionUrl = 'http://geppetto.mystix.com/api/v3/design/revision/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getDesignRevision", function () {
        const responseData = {
            title: 1,
            width: 100,
            height: 100,
            placed_modules: [
                { // the board
                    id: 0,
                    module_revision: 1,
                    x: 0,
                    y: 0,
                    rotation: 0
                }
            ],
            connections: [],
            dimensions: []
        };

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(`${designRevisionUrl}2/`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignRevisionGateway();
            const xhr = gateway.getDesignRevision('2');
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(`${designRevisionUrl}2/`).length).toEqual(1);
        });

        it('returns a DesignRevision instance', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignRevisionGateway();
            gateway.getDesignRevision('2').done(results => {
                expect(results).toEqual(jasmine.any(DesignRevision));
            });
        });
    });

    describe("getDesignRevisionModules", function () {
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
                .stubRequest(`${designRevisionUrl}2/module/library`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignRevisionGateway();
            const xhr = gateway.getDesignRevisionModules('2');
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(`${designRevisionUrl}2/module/library`).length).toEqual(1);
        });

        it('returns an array of Module instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignRevisionGateway();
            gateway.getDesignRevisionModules('2').done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(Module));
                });
            });
        });
    });
});
