import {ServerID} from "../../src/model/types";
import {Library} from "../../src/module/Library";
import {Module} from "../../src/module/Module";
import {ModuleBuilder} from "./ModuleBuilder";

let nextRevisionId = 100;

function makeModule(name: string, groupId: ServerID): Module {
    return new ModuleBuilder()
        .withName(name)
        .withRevisionId(nextRevisionId++)
        .withModuleId(nextRevisionId++)
        .withFunctionalGroup(groupId)
        .build();
}

describe("Library",function () {
    it("filters by functional group", function () {
        const moduleD = makeModule('d', 2);
        const library = new Library([
            makeModule('a', 1),
            makeModule('b', 2),
            makeModule('c', 3),
            moduleD,
            makeModule('e', 3),
            makeModule('f', 2),
        ]);

        const results = library.filterByFunctionalGroup(moduleD);
        expect(results.length).toEqual(2); // b and f, but not d itself
    });
});


