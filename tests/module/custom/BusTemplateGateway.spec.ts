import Auth from "../../../src/auth/Auth";
import {getBusTemplateGateway} from "../../../src/module/custom/BusTemplateGateway";
import {BusTemplate} from "../../../src/module/custom/BusTemplate";


describe('BusTemplateGateway', function () {

    const busTemplateUrl = 'http://geppetto.mystix.com/api/v3/module/assignable-bustemplates/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getBusTemplates", function () {
        const responseData = [
            {
                isPower: false,
                signals: [
                    {
                        id: 161,
                        name: "SCL",
                        bus_template: 69
                    },
                    {
                        id: 162,
                        name: "SDA",
                        bus_template: 69
                    }
                ],
                id: 69,
                name: "I2C",
                power: false,
                min_path_length: null,
                max_path_length: null,
                path_width: null
            },
            {
                isPower: false,
                    signals: [
                        {
                            id: 393,
                            name: "CLK",
                            bus_template: 125
                        },
                        {
                            id: 395,
                            name: "MOSI",
                            bus_template: 125
                        },
                        {
                            id: 396,
                            name: "MISO",
                            bus_template: 125
                        },
                        {
                            id: 2306,
                            name: "CS0",
                            bus_template: 125
                        },
                        {
                            id: 2307,
                            name: "CS1",
                            bus_template: 125
                        }
                    ],
                id: 125,
                name: "SPI",
                power: false,
                min_path_length: null,
                max_path_length: null,
                path_width: null
            }
        ];

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(busTemplateUrl)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getBusTemplateGateway();
            const xhr = gateway.getBusTemplates();
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(busTemplateUrl).length).toEqual(1);
        });

        it('returns an array of BusTemplate instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getBusTemplateGateway();
            gateway.getBusTemplates().done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(BusTemplate));
                });
            });
        });
    });
});
