import Auth from "../../src/auth/Auth";
import {getNoticeGateway} from "../../src/notice/NoticeGateway";
import Notice from "../../src/notice/Notice";


describe('NoticeGateway', function () {

    const noticeUrl = 'http://geppetto.mystix.com/api/v3/marketing/notice/';

    beforeEach(function () {
        jasmine.Ajax.install();
    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    function simulateAnonymousUser() {
        spyOn(Auth, "isLoggedIn").and.returnValue(false);
    }

    describe("getNotices", function () {
        const responseData = [
            { text: 'testing' }
        ];

        function mockSuccessfulResponse() {
            jasmine.Ajax
                .stubRequest(noticeUrl)
                .andReturn({
                    status: 200,
                    contentType: 'application/json',
                    responseText: JSON.stringify(responseData)
                });
        }

        it('calls the expected URL', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getNoticeGateway();
            const xhr = gateway.getNotices();
            expect(xhr.state()).toEqual('resolved');
            expect(jasmine.Ajax.requests.filter(noticeUrl).length).toEqual(1);
        });

        it('returns an array of Notice instances', function () {
            simulateAnonymousUser();
            mockSuccessfulResponse();
            const gateway = getNoticeGateway();
            gateway.getNotices().done(results => {
                expect(results).toEqual(jasmine.any(Array));
                results.forEach(data => {
                    expect(data).toEqual(jasmine.any(Notice));
                });
            });
        });
    });
});
