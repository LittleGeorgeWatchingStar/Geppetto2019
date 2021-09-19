import {PlacedModuleBuilder} from "./PlacedModuleBuilder";
import {RenamePlacedModule} from "../../src/placedmodule/actions";

describe("Rename Placed Module", function () {
    it("can set the name", function () {
        const pm = new PlacedModuleBuilder().build();
        new RenamePlacedModule(pm, "New Name").execute();
        expect(pm.customName).toEqual("New Name");
    });

    it("can be undone", function () {
        const pm = new PlacedModuleBuilder().build();
        const oldName = pm.customName;
        const action = new RenamePlacedModule(pm, "New Name");
        action.execute();
        action.reverse();
        expect(pm.customName).toEqual(oldName);
    });
});