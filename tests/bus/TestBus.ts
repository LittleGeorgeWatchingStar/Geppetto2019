import {BusGroupResource, BusResource} from "../../src/bus/api";
import {BusGroup} from "../../src/bus/BusGroup";

let currentId = 0;

export function busResource(attributes?): BusResource {
    const id = ++currentId;
    return Object.assign({
        id: id,
        name: id.toFixed(),
        // TODO Bus checks is_power but the server API property is power?
        power: true,
        is_power: true,
        milliwatts: 0,
        efficiency: 0,
        num_connections: 0,
        address: '',
        bus_group: {
            id: 12,
        },
        templates: [
            {id: 44, name: 'POWER', power: true},
        ],
        exclusions: [],
        priorities: []
    }, attributes);
}

export function groupResource(attributes?): BusGroupResource {
    return Object.assign({
        id: 12,
        title: 'The bus group',
        levels: ['1.8', '3.3'],
    }, attributes);
}
