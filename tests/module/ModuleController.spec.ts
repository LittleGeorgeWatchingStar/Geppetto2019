import {ModuleBuilder} from "./ModuleBuilder";
import events from "../../src/utils/events";
import {MODULE_PUT, ModulePlacementEvent} from "../../src/module/events";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";

describe("ModuleController", function () {
    describe("On module put", function () {
        /**
         * TODO this test only works in isolation because there is no way to properly remove the dialog from here.
         */
        xit("creates a customizable module dialog if the module added was customizable", function () {
            const user = new User();
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const module = new ModuleBuilder().build();
            module.isTemplateModule = () => true;
            events.publishEvent(MODULE_PUT, {
                designRevision: new DesignRevisionBuilder().build(),
                model: module,
                position: {x: 0, y: 0},
            } as ModulePlacementEvent);
            expect($('.custom-module-dialog').length).toEqual(1);
        });

        it("does not add the module to the design if the module is customizable", function () {
            const module = new ModuleBuilder().build();
            module.isTemplateModule = () => true;
            const designRev = new DesignRevisionBuilder().build();
            events.publishEvent(MODULE_PUT, {
                designRevision: designRev,
                model: module,
                position: {x: 0, y: 0},
            } as ModulePlacementEvent);
            expect(designRev.getPlacedModules().length).toEqual(0);
        });

        it("handles the lack of position gracefully", function () {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            events.publishEvent(MODULE_PUT, {
                designRevision: designRev,
                model: module
            } as ModulePlacementEvent);
            expect(designRev.getPlacedModules().length).toEqual(1);
        });
    });
});