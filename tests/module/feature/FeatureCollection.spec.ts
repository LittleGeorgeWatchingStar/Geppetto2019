import {FeatureCollection} from "../../../src/module/feature/FeatureCollection";
import {FeatureResource} from "../../../src/module/feature/api";

function lineResource(): FeatureResource {
    return {
        id: 4,
        type: 'footprint',
        points: [
            {x: 0, y: 10},
            {x: 20, y: 10},
        ]
    };
}

describe("FeatureCollection", function () {
    describe("get", function () {
        it("returns undefined when it doesn't exist", function () {
            const coll = new FeatureCollection();
            coll.add(lineResource());

            const result = coll.get(12);
            expect(result).toBeUndefined();
        });
    });
});
