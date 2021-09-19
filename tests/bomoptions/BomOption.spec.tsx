import {ModuleBuilder} from "../module/ModuleBuilder";
import {BomChoiceResourceBuilder, BomOptionResourceBuilder} from "./BomOptionBuilder";
import {BomOption} from "../../src/module/BomOption/BomOption";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ChangeBom} from "../../src/module/BomOption/actions";

describe("BomOption", function () {
    it("creates a default choice", function () {
        const bomOption = new BomOption(new BomOptionResourceBuilder().build());
        expect(bomOption.choices.some(c => c.isDefault));
    });

    it("selects the default choice by default", function () {
        const bomOption = new BomOption(new BomOptionResourceBuilder().build());
        expect(bomOption.selected.isDefault).toBe(true);
    });

    it("can select a choice correctly", function () {
        const resource = new BomOptionResourceBuilder()
            .withChoices([
                new BomChoiceResourceBuilder().withDescription("GREEN").build(),
                new BomChoiceResourceBuilder().withDescription("YELLOW").build(),
            ]).build();
        const bomOption = new BomOption(resource);
        const choice = bomOption.choices.find(c => !c.isDefault);
        choice.select();
        expect(bomOption.selected.description).toEqual(choice.description);
    });

    it("only has one choice selected at once", function () {
        const resource = new BomOptionResourceBuilder()
            .withChoices([
                new BomChoiceResourceBuilder().build(),
                new BomChoiceResourceBuilder().build(),
            ]).build();
        const bomOption = new BomOption(resource);
        bomOption.choices[1].select();
        bomOption.choices[2].select();
        expect(bomOption.choices.filter(c => c.isSelected).length).toEqual(1);
    })
});

describe("PlacedModule BomOption", function () {

    describe("On load", function () {
        it("are added", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            expect(pm.hasBomOptions()).toBe(true);
        });

        it("sets the choices to the ones stored", function () {
            const choice = new BomChoiceResourceBuilder().withId(10).build();
            const option = new BomOptionResourceBuilder()
                .withChoices([choice])
                .build();
            const module = new ModuleBuilder().withBomOptions([option]).build();
            const pm = new PlacedModule({
                module: module,
                design_revision: new DesignRevisionBuilder().build(),
                choices: [choice]
            });
            expect(pm.selectedChoices[0].id).toEqual(10);
        });

        it("sets the choices to the ones stored even if the ids are different", function () {
            // Eg. due to module uprevving.
            const option = new BomOptionResourceBuilder()
                .withChoices([
                    new BomChoiceResourceBuilder()
                        .withDescription("GREEN")
                        .withId(10)
                        .build()
                ])
                .build();
            const module = new ModuleBuilder().withBomOptions([option]).build();
            const pm = new PlacedModule({
                module: module,
                design_revision: new DesignRevisionBuilder().build(),
                choices: [
                    new BomChoiceResourceBuilder()
                        .withDescription("GREEN")
                        .withId(5)
                        .build()
                ]
            });
            expect(pm.selectedChoices[0].description).toEqual("GREEN");
        });
    });

    describe("Selected choices", function () {
        it("excludes default choices", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            expect(pm.selectedChoices.length).toEqual(0);
        });

        it("includes any non-default selections", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            const bomOption = pm.bomOptions[0];
            const choice = bomOption.choices.find(c => !c.isDefault);
            choice.select();
            expect(pm.selectedChoices[0]).toEqual(choice);
        });

        it("handles selections from multiple BOM options", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().withId(1).build(),
                    new BomOptionResourceBuilder().withId(2).build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            pm.bomOptions.forEach(b => b.choices.find(c => !c.isDefault).select());
            expect(pm.selectedChoices.length).toEqual(2);
        });

        it("generates the correct JSON", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            const bomOption = pm.bomOptions[0];
            const choice = bomOption.choices.find(c => !c.isDefault);
            choice.select();
            expect(pm.toJSON().choices[0]).toEqual(choice.id);
        });
    });
});

describe("ChangeBOM action", function () {
    it("creates a log", function () {
        const resource = new BomOptionResourceBuilder()
            .withChoices([
                new BomChoiceResourceBuilder().withDescription("GREEN").build()
            ]).build();
        const bomOption = new BomOption(resource);
        const choice = bomOption.choices[1];
        const action = new ChangeBom(bomOption, choice);
        expect(action.log).toEqual(`Select GREEN for ${bomOption.description}`);
    });
});