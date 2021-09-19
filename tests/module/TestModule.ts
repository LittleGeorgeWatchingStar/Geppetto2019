import {Module} from "../../src/module/Module";
import {groupResource} from "../bus/TestBus";
import {FeatureResource} from "../../src/module/feature/api";


export class TestModule extends Module {
}

export function makeSimpleFootprint(size: number) {
    return makeFootprint(size, size);
}

export function makeFootprint(width: number, height: number, edge?: string): FeatureResource[] {
    return [
        {
            id: 1,
            type: edge === 'top' ? 'edge' : 'footprint',
            points: [
                {x: width, y: height},
                {x: 0, y: height}
            ],
        },

        {
            id: 2,
            type: edge === 'right' ? 'edge' : 'footprint',
            points: [
                {x: width, y: 0},
                {x: width, y: height}
            ],
        },
        {
            id: 3,
            type: edge === 'bottom' ? 'edge' : 'footprint',
            points: [
                {x: 0, y: 0},
                {x: width, y: 0}
            ],
        },
        {
            id: 4,
            type: edge === 'left' ? 'edge' : 'footprint',
            points: [
                {x: 0, y: height},
                {x: 0, y: 0}
            ],
        }
    ];
}


/**
 * Factory method for creating modules for tests.
 */
export default function makeModule(attributes?): Module {
    attributes = Object.assign({
        revision_id: 20,
        module_id: 2,
        name: "Test module",
        description: "Test module",
        category: {id: 1, name: 'test category'},
        bus_groups: [
            groupResource(),
        ],
        features: makeSimpleFootprint(3),
        provides: [],
        requires: [],
    }, attributes);

    return new TestModule(attributes);
}
