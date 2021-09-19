import Auth from "../../src/auth/Auth";
import {Design} from "../../src/design/Design";
import {getDesignGateway} from "../../src/design/DesignGateway";


describe('DesignGateway', function () {

    const designUrl = 'http://geppetto.mystix.com/api/v3/design/design/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getDesign", function () {
        const responseData = {
            title: 'My great board',
            description: 'It is so great!',
            'public': false,
            current_revision: {
                title: '2',
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
            }
        };

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(`${designUrl}2/`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignGateway();
            const xhr = gateway.getDesign('2');
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(`${designUrl}2/`).length).toEqual(1);
        });

        it('returns a Design instance', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignGateway();
            gateway.getDesign('2').done(results => {
                expect(results).toEqual(jasmine.any(Design));
            });
        });
    });

    describe("getDesigns", function () {
        const responseData = [
            {
                title: 'My great board',
                description: 'It is so great!',
                'public': false,
                current_revision: {
                    title: '2',
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
                }
            },
            {
                title: 'My great 2nd board',
                description: 'It is still so great!',
                'public': false,
                current_revision: {
                    title: '2',
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
                }
            }
        ];

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(designUrl)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignGateway();
            const xhr = gateway.getDesigns();
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(designUrl).length).toEqual(1);
        });

        it('returns an array of Design Instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignGateway();
            gateway.getDesigns().done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(Design));
                });
            });
        });
    });

    describe("deleteDesign", function () {
        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(`${designUrl}2/`)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify([])
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getDesignGateway();
            const xhr = gateway.deleteDesign('2');
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(`${designUrl}2/`).length).toEqual(1);
        });
    });
});

