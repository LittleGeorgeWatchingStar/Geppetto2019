import makeModule from "../../module/TestModule";
import {busResource} from "../../bus/TestBus";
import {DesignRevision} from "../../../src/design/DesignRevision";

function makeRequirer() {
    return makeModule({
        name: 'requirer',
        requires: [
            busResource({
                name: 'require power',
                milliwatts: 20,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            }),
            busResource({
                name: 'require vlogic',
                milliwatts: 5,
                templates: [
                    {id: 100, name: 'VLOGIC', power: true},
                ],
            }),
        ],
        provides: [
            busResource({
                name: 'provide data',
                is_power: false,
                power: false,
                connections: 5,
                templates: [
                    {id: 163, name: 'GPIO', power: false},
                ],
            }),
        ]
    });
}

function makeProvider() {
    return makeModule({
        name: 'provider',
        provides: [
            busResource({
                name: 'provide power',
                milliwatts: 40,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            }),
            busResource({
                name: 'provide vlogic',
                milliwatts: 50,
                templates: [
                    {id: 100, name: 'VLOGIC', power: true},
                ],
            }),
        ],
    });
}

export function makeOtherModule() {
    return makeModule({
        name: 'requirer',
        requires: [
            busResource({
                name: 'require data',
                is_power: false,
                power: false,
                num_connection: 1,
                templates: [
                    {id: 163, name: 'GPIO', power: false},
                ],
            }),
        ],
    });
}

export function getConnectedModules(designRev: DesignRevision) {
    const requirer = makeRequirer();
    const provider = makeProvider();
    const requirerPM = designRev.addModule(requirer, {x: 0, y: 0});
    const providerPM = designRev.addModule(provider, {x: 0, y: 0});
    designRev.connectPair(requirerPM.getRequires()[0], providerPM.getProvides()[0]);
    designRev.connectPair(requirerPM.getRequires()[1], providerPM.getProvides()[1]);
    return {
        requirerPM: requirerPM,
        providerPM: providerPM,
    };
}



