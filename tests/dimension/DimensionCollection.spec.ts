import {DimensionServerResource} from "../../src/dimension/api";
import {FeatureResource} from "../../src/module/feature/api";
import {Module} from "../../src/module/Module";
import {BoardBuilder} from "../board/BoardBuilder";
import {FeatureBuilder} from "../module/feature/FeatureBuilder";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {ServerID} from "../../src/model/types";
import {overrideDesignRevision} from "../design/TestDesign";
import {createDimensionCollection} from "../../src/dimension/DimensionCollection";

describe("DimensionCollection", function () {

    function getPoints() {
        return [
            {x: 3, y: 0},
            {x: 0, y: 3}
        ];
    }

    function getLineResource(id: ServerID): FeatureResource {
        return new FeatureBuilder()
            .withId(id)
            .withPoints(getPoints())
            .withType('footprint')
            .resource();
    }

    function getDimensionResource(dimensionable?): DimensionServerResource[] {
        return [{
            anchor1: {
                type: 'module',
                module_uuid: dimensionable.uuid,
                feature: getLineResource(1)
            },
            anchor2: {
                type: 'module',
                module_uuid: dimensionable.uuid,
                feature: getLineResource(3)
            },
            locked: false,
            hidden: false,
        }];
    }

    function makeModule(): Module {
        return new ModuleBuilder().withModuleId(1).build();
    }

    it('initializes on design revision', () => {
        const design = overrideDesignRevision();
        const dimensions = design.dimensions;
        expect(dimensions).not.toBe(undefined);
    });

    it('can load dimensions from resources', () => {
        const design = overrideDesignRevision();
        design.loadDimensions();
        const dimensionCollection = createDimensionCollection(design);
        const placedModule = design.addModule(makeModule(), {x: 0, y: 0});
        dimensionCollection.initializeFromResources(
            getDimensionResource(placedModule),
            [new BoardBuilder().build(), placedModule]
        );
        expect(dimensionCollection.dimensions.length > 0).toBe(true);
    });
});
