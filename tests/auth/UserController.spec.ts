import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";
import {LOAD_DESIGN_DIALOG} from "../../src/toolbar/events";
import eventDispatcher from "utils/events";
import * as $ from "jquery";
import {DesignBuilder} from "../design/DesignBuilder";

describe("UserController", function () {
    describe("checkDescription function", function () {
        it("returns null for a valid description", function () {
            const error = UserController.checkDescription('some description');
            expect(error).toBe(null);
        });

        it("returns error for empty description", function () {
            const error = UserController.checkDescription('');
            expect(error).toBe("Description is required");
        });

        it("returns error for a description of just spaces", function () {
            const error = UserController.checkDescription('  ');
            expect(error).toBe("Description is required");
        });

        it("returns error for a description longer than 500 characters", function () {
            const description = new Array(505).join('A');
            const error = UserController.checkDescription(description);
            expect(error).toBe("The description cannot be more than 500 characters.");
        })
    });

    describe("Open dialog", function () {
        it("shows designs when triggered", function () {
            spyOn(User.prototype, 'getDesigns').and.returnValue(
                [new DesignBuilder()
                    .withTitle('test title')
                    .build()]
            );
            UserController.init(new User());
            eventDispatcher.publish(LOAD_DESIGN_DIALOG);
            expect($('.open-dialog-item').length).toBeGreaterThan(0);
        });

        it("fetches designs if they haven't been loaded", function () {
            const user = new User();
            spyOn(user, 'getDesigns').and.returnValue([]);
            spyOn(user, 'fetchDesigns').and.callFake(() => {
                const deferred = $.Deferred();
                deferred.resolve([
                    new DesignBuilder()
                        .withTitle('Skedazzle')
                        .build()
                ]);
                return deferred.promise();
            });
            UserController.init(user);
            eventDispatcher.publish(LOAD_DESIGN_DIALOG);
            expect($('.open-dialog-item').length).toBeGreaterThan(0);
        });
    });
});