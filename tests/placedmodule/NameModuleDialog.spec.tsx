import {NameModuleDialog} from "../../src/placedmodule/NameModuleDialog";
import ModuleController from "../../src/module/ModuleController";
import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";
import * as $ from "jquery";
import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import * as ReactTestUtils from 'react-dom/test-utils';


describe("NameModuleDialog", function () {
    function makeDialog(pm) {
        return new NameModuleDialog({
            model: pm
        });
    }

    function triggerSave() {
        $('.ui-button:contains("Save")').click();
    }

    it("displays instructions", function () {
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        expect(dialog.$el.html()).toContain('Enter a name for this module');
    });

    it("current custom name shows in text box", function () {
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        expect(dialog.el.querySelector('input').value).toEqual(pm.customName);
    });

    it("has a character limit", function () {
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        expect(dialog.el.querySelector('input').maxLength).toEqual(100)
    });

    it("shows an 'invalid name' error when the name is invalid", function () {
        spyOn(UserController, "getUser").and.returnValue({isEngineer: () => false} as User);
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        const input = dialog.el.querySelector('input');
        input.value = 'invalid-name<>';
        ReactTestUtils.Simulate.change(input);
        triggerSave();
        const error = dialog.el.querySelector('.error').innerHTML;
        expect(error).toEqual('Invalid name');
    });

    it("changes the module name", function () {
        spyOn(UserController, "getUser").and.returnValue({isEngineer: () => false} as User);
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        const input = dialog.el.querySelector('input');
        input.value = 'name after changed';
        ReactTestUtils.Simulate.change(input);
        triggerSave();
        expect(pm.customName).toEqual('name after changed');
    });

    it("hits enter to rename the module", function () {
        spyOn(UserController, "getUser").and.returnValue({isEngineer: () => false} as User);
        const pm = new PlacedModuleBuilder().build();
        const dialog = makeDialog(pm);
        const input = dialog.el.querySelector('input');
        input.value = 'name after changed';
        ReactTestUtils.Simulate.change(input);
        ReactTestUtils.Simulate.keyDown(input, {which: 13});
        expect(pm.customName).toEqual('name after changed');
    });
});
