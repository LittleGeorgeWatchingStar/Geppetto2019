import UserController from "../../src/auth/UserController";
import {ServerGateway} from "../../src/core/ServerGateway";
import Auth from "../../src/auth/Auth";
import {Logout} from "../../src/controller/Logout";


class TestGateway extends ServerGateway {
    public getTest(): JQuery.jqXHR<any> {
        return this.get('/test/')
            .then(data => data) as JQuery.jqXHR<any>;
    }

    public putTest(): JQuery.jqXHR<any> {
        return this.put('/test/', {})
            .then(data => data) as JQuery.jqXHR<any>;
    }

    public deleteTest(): JQuery.jqXHR<any> {
        return this.delete('/test/', {});
    }
}

describe('ServerGateway', function () {

    const gatewayUrl = 'http://geppetto.mystix.com/test/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateLogin() {
        new Logout().init();
        UserController.init({
            groups: [],
            username: 'uuid',
            first_name: '',
            last_name: '',
            email: ''
        });

        /**
         * Called by events triggered by UserController.init
         */
        jasmine.Ajax
            .stubRequest('/api/v3/design/design/?creator=uuid')
            .andReturn({
                status: 200,
                contentType: 'application/json',
                responseHeaders: {
                    'is-authenticated': '1'
                },
                responseText: JSON.stringify([])
            });
    }

    function getTestGateway(): TestGateway {
        jasmine.Ajax
            .stubRequest(gatewayUrl)
            .andReturn({
                status: 200,
                contentType: 'application/json',
                responseHeaders: {
                    'is-authenticated': ''
                },
                responseText: JSON.stringify([])
            });

        return new TestGateway();
    }

    describe("when receiving out-of-band logout", function () {
        describe("while doing a GET request", function () {
            it('logs the user out', function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.getTest();
                xhr.fail(() => {
                    expect(Auth.isLoggedIn()).toEqual(false);
                });
            });

            it('returns a rejected promise',function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.getTest();
                expect(xhr.state()).toEqual('rejected');
            });
        });

        describe("while doing a PUT request", function () {
            it('logs the user out', function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.putTest();
                xhr.fail(() => {
                    expect(Auth.isLoggedIn()).toEqual(false);
                });
            });

            it('returns a rejected promise',function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.putTest();
                expect(xhr.state()).toEqual('rejected');
            });
        });

        describe("while doing a DELETE request", function () {
            it('logs the user out', function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.deleteTest();
                xhr.fail(() => {
                    expect(Auth.isLoggedIn()).toEqual(false);
                });
            });

            it('returns a rejected promise',function () {
                simulateLogin();
                const gateway = getTestGateway();
                const xhr = gateway.deleteTest();
                expect(xhr.state()).toEqual('rejected');
            });
        });
    });
});
