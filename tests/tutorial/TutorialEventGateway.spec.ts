import Auth from "../../src/auth/Auth";
import {getTutorialEventGateway} from "../../src/tutorial/TutorialEventGateway";
import {TutorialEvent} from "../../src/tutorial/TutorialEvent";


describe('TutorialEventGateway', function () {

    const TutorialEventUrl = 'http://geppetto.mystix.com/api/v3/tutorial/tutorialevents/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getTutorialEvents", function () {
        const responseData = [
            {
                id:6,
                trigger: 'newDesign',
                module_state: '',
                model_state: '',
                selector: '#panel',
                html: '<h3>testing 1</h3>',
                text: '<h3>testing 1</h3>',
                text_top: 10,
                text_left: 30,
                stop_after: 1,
                hide_after: 7000
            },
            {
                id:7,
                trigger: 'PlacedModule.loaded',
                module_state: '',
                model_state: '',
                selector: null,
                html: '<h3>testing 2</h3>',
                text: '<h3>testing 2</h3>',
                text_top: 10,
                text_left: 30,
                stop_after: 1,
                hide_after: 7000
            },
        ];

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(TutorialEventUrl)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getTutorialEventGateway();
            const xhr = gateway.getTutorialEvents();
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(TutorialEventUrl).length).toEqual(1);

        });

        it('returns an array of TutorialEvent instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getTutorialEventGateway();
            gateway.getTutorialEvents().done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(TutorialEvent));
                });
            });
        });
    });
});
