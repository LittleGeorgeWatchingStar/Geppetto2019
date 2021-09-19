import User from "../../src/auth/User";
import {ENGINEER} from "../../src/auth/Group";

import * as $ from "jquery";
import {DesignBuilder} from "../design/DesignBuilder";
import * as DesignGateway from "../../src/design/DesignGateway";
import {getDesignGateway} from "../../src/design/DesignGateway";
import {EngineeringToolFlag, FeatureFlag} from "../../src/auth/FeatureFlag";


describe("User", function () {
    describe("isEngineer", function () {
        it("yes", function () {
            const u = new User({
                groups: [
                    {name: ENGINEER}
                ],
            });
            expect(u.isEngineer()).toBe(true);
        });

        it("no", function () {
            const u = new User({
                groups: [
                    {name: 'nice folks'},
                    {name: 'other people'},
                ],
            });
            expect(u.isEngineer()).toBe(false);
        });
    });

    describe("isFeatureEnabled", () => {
        it("is true if User has the flag set", () => {
            const u = new User({
                feature_flags: [
                    FeatureFlag.UPVERTER_MODULE_EDIT
                ],
            });
            expect(u.isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT))
                .toBe(true);
        });
        it("is false if User does not have the flag set", () => {
            const u = new User({
                feature_flags: [
                    FeatureFlag.UPVERTER_MODULE_EDIT
                ],
            });
            expect(u.isFeatureEnabled(EngineeringToolFlag.CHAT_HIDE))
                .toBe(false);
        });
    });

    describe("Designs", function () {

        let user;

        beforeEach(function () {
            const gateway = getDesignGateway();
            spyOn(gateway, 'getDesigns').and.callFake(() => {
                const deferred = $.Deferred();
                const designs = [
                    new DesignBuilder()
                        .withTitle('test title')
                        .build()
                ];
                deferred.resolve(designs);
                return deferred.promise();
            });
            spyOn(DesignGateway, 'getDesignGateway').and.callFake(() => {
                return gateway;
            });
            user = new User();
            user.fetchDesigns(); // Set user designs.
        });

        it('finds design by title using identical letter capitalization', function () {
            expect(user.findDesignByTitle('test TITLE')).toBeTruthy();
        });

        it('finds design by title using different letter capitalization', function () {
            expect(user.findDesignByTitle('TEST title')).toBeTruthy();
        });

        it('does not find design by title', function () {
            expect(user.findDesignByTitle('title')).toBeUndefined();
        });
    })
});
