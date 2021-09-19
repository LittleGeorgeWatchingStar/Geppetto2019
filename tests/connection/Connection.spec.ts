import {Connection, createConnection} from 'connection/Connection';
import events from "utils/events";
import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";
import makeModule from "../module/TestModule";
import makePlacedModuleBase from "../placedmodule/TestPlacedModule";
import {Workspace} from "../../src/workspace/Workspace";


function makeProvideBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new ProvideBus(attributes);
}

function makeRequireBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new RequireBus(attributes);
}

function makePlacedModule(revisionId, attributes = {}) {
    const module = makeModule({revision_id: revisionId});
    return makePlacedModuleBase(module, attributes);
}

function makeConnection(requireBus, provideBus) {
    return createConnection({
        require: requireBus,
        provide: provideBus
    });
}

describe("Connection", function () {

    beforeEach(function () {
        spyOn(Workspace, "boardPointSnap").and.callFake(point => point);
        spyOn(events, "publish").and.callFake(() => {
        });
    });

    it('generates correct JSON', function () {
        const provider = makePlacedModule(20, {x: 10, y: 20});
        const providerUuid = provider.uuid;
        const provideBus = makeProvideBus(provider, {id: 200});

        const requirer = makePlacedModule(30, {x: 50, y: 60, rotation: 180});
        const requirerUuid = requirer.uuid;
        const requireBus = makeRequireBus(requirer, {id: 300});
        const conn = makeConnection(requireBus, provideBus);

        const json = conn.toJSON();
        expect(json).toEqual({
            provider: providerUuid,
            provide_bus: 200,
            requirer: requirerUuid,
            require_bus: 300,
            path: null,
        });
    });

    it('generates correct resource', function () {
        const provider = makePlacedModule(20, {x: 10, y: 20});
        const providerUuid = provider.uuid;
        const provideBus = makeProvideBus(provider, {
            id: 200,
            name: 'provide',
        });

        const requirer = makePlacedModule(30, {x: 50, y: 60, rotation: 180});
        const requirerUuid = requirer.uuid;
        const requireBus = makeRequireBus(requirer, {
            id: 300,
            name: 'require',
        });
        const conn = makeConnection(requireBus, provideBus);

        const resource = conn.toResource();
        expect(resource).toEqual({
            id: undefined,
            provide_bus: 200,
            provider_uuid: providerUuid,
            provide_bus_name: 'provide',
            require_bus: 300,
            requirer_uuid: requirerUuid,
            require_bus_name: 'require',
            path: null,
        });
    });

    it('generates correct toString()', function () {
        const provider = makePlacedModule(20);
        const provideBus = makeProvideBus(provider, {name: 'pb'});

        const requirer = makePlacedModule(30);
        const requireBus = makeRequireBus(requirer, {name: 'rb'});
        const conn = makeConnection(requireBus, provideBus);
        expect(conn.toString()).toMatch('pb -> rb');
    });

    describe("requirerOverhead", function () {
        it("returns the correct value", function () {
            const conn = createConnection({
                require: {
                    getPowerDraw: () => 500,
                    getPlacedModule: function () {
                        return {downstreamPowerDraw: 433};
                    },
                } as RequireBus,
                provide: {} as ProvideBus,
            });

            expect(conn.requirerOverhead).toEqual(67);
        });
    });
});
