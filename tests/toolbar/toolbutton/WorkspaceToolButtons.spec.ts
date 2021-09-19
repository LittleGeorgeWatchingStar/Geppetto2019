import User from "../../../src/auth/User";
import UserController from "../../../src/auth/UserController";
import {DesignRevisionBuilder} from "../../design/DesignRevisionBuilder";
import {DesignController} from "../../../src/design/DesignController";
import {order} from "../../../src/toolbar/toolbutton/WorkspaceToolbuttons";
import {Workspace} from "../../../src/workspace/Workspace";

describe("Order toolbutton props", () => {
    describe("if the user is an engineer", () => {
        const user = new User({id: 1});
        user.isEngineer = () => true;
        user.isLoggedIn = () => true;

        beforeEach(() => {
            spyOn(UserController, 'getUser').and.returnValue(user);
        });

        it("has no error if the design is not connected", () => {
            const designRevision = (new DesignRevisionBuilder())
                .withOwner(user.getId())
                .build();
            designRevision.connected = () => false;
            spyOn(DesignController, 'getCurrentDesign')
                .and.returnValue(designRevision);

            expect(order(new Workspace(true, true)).props.error).toBe(null);
        })
    });

    describe("if the user is not an engineer", () => {
        const user = new User({id: 1});
        user.isEngineer = () => false;
        user.isLoggedIn = () => true;

        beforeEach(() => {
            spyOn(UserController, 'getUser').and.returnValue(user);
        });

        it("has an error if the design is not connected", () => {
            const designRevision = (new DesignRevisionBuilder())
                .withOwner(user.getId())
                .build();
            designRevision.connected = () => false;
            spyOn(DesignController, 'getCurrentDesign')
                .and.returnValue(designRevision);

            expect(order(new Workspace(true, true)).props.error).toContain('connected');
        })
    });
});