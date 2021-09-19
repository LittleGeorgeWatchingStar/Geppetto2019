import {createConnection} from 'connection/Connection';
import {ConnectionCollection} from 'connection/ConnectionCollection';
import {RequireBus} from "../../src/bus/RequireBus";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {ProvideBus} from "../../src/bus/ProvideBus";

function makeProvideBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new ProvideBus(attributes);
}

function makeRequireBus(placedModule, attributes) {
    attributes.placed_module = placedModule;
    return new RequireBus(attributes);
}

describe("ConnectionSet", () => {
    let conn,
        provideBus,
        requireBus;

    beforeEach(function () {
        provideBus = makeProvideBus(new PlacedModuleBuilder().build(), {name: 'pb'});
        requireBus = makeRequireBus(new PlacedModuleBuilder().build(), {name: 'rb'});
        conn = createConnection({
            require: requireBus,
            provide: provideBus
        });
    });

    it('generates correct toString()', ()  => {
        const coll = new ConnectionCollection();
        coll.add(conn);
        expect(coll.toString()).toEqual('pb -> rb');
    });

    it('silently fails if the same connections gets added', () =>  {
        const connColl = new ConnectionCollection();
        connColl.add(conn);
        connColl.add(conn);
        expect(connColl.connections.length).toEqual(1);
    });
});

