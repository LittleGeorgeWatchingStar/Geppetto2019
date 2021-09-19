import {BomOption} from "../../src/module/BomOption/BomOption";
import {BomOptionResourceBuilder} from "./BomOptionBuilder";
import BomOptionView from "../../src/module/BomOption/BomOptionView";
import {actions} from "../../src/core/action";

describe("BomOptionView", function () {

    let view = null;

    afterEach(() => {
        if (view) {
            view.remove();
            view = null;
        }
    });

    describe("On click", function () {
        it("can select the bom option", function () {
            const bomOption = new BomOption(new BomOptionResourceBuilder().build());
            view = new BomOptionView({model: bomOption});
            view.$('li').last().trigger('click');
            expect(bomOption.selected.id).toEqual(bomOption.choices[1].id);
        });

        it("highlights the selected bom option", function () {
            const bomOption = new BomOption(new BomOptionResourceBuilder().build());
            view = new BomOptionView({model: bomOption});
            view.$('li').last().trigger('click');
            expect(view.$('li').last().hasClass('selected')).toBe(true);
        });

        it("creates an action that can be undone", function () {
            const bomOption = new BomOption(new BomOptionResourceBuilder().build());
            const initialSelected = bomOption.selected;
            view = new BomOptionView({model: bomOption});
            view.$('li').last().trigger('click');
            actions.undo();
            expect(bomOption.selected).toEqual(initialSelected);
        });

        it("rerenders when the action is undone", function () {
            const bomOption = new BomOption(new BomOptionResourceBuilder().build());
            view = new BomOptionView({model: bomOption});
            view.$('li').last().trigger('click');
            actions.undo();
            expect(view.$('li').first().hasClass('selected')).toBe(true);
        });
    });
});