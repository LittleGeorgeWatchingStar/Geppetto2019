import {DesignRevision} from "../../src/design/DesignRevision";
import {busResource} from "../bus/TestBus";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {ConnectionFinder} from "../../src/connection/ConnectionFinder";
import {BusGroup} from "../../src/bus/BusGroup";
import {BusResource} from "../../src/bus/api";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {RequireBus} from "../../src/bus/RequireBus";
import {ProvideBus} from "../../src/bus/ProvideBus";

describe("ConnectionFinder", function () {

    function makeModule(designRev: DesignRevision): PlacedModule {
        return designRev.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
    }

    function addRequire(pm: PlacedModule): RequireBus {
        return pm.addRequire(getBusResource(pm));
    }

    function addProvide(pm: PlacedModule): ProvideBus {
        return pm.addProvide(getBusResource(pm));
    }

    function getBusResource(pm: PlacedModule): BusResource {
        return busResource({
            busgroup: new BusGroup({
                levels: ['1'],
                placed_module: pm
            }),
            is_power: false,
            num_connections: 1
        });
    }

    function makeRequires(pm: PlacedModule, numRequires: number): void {
        for (let i = 0; i < numRequires; ++i) {
            addRequire(pm);
        }
    }

    function makeProvides(pm: PlacedModule, numProvides: number): void {
        for (let i = 0; i < numProvides; ++i) {
            addProvide(pm);
        }
    }

    function getPriorityBus(pm: PlacedModule): BusResource {
        return busResource({
            busgroup: new BusGroup({
                levels: ['1'],
                placed_module: pm
            }),
            is_power: false,
            num_connections: 1,
            priorities: [{
                group: 1,
                priority: 1,
            }]
        })
    }

    it("can make a single connection", function () {
        const designRev = new DesignRevision();
        const requirer = makeModule(designRev);
        addRequire(requirer);
        const provider = makeModule(designRev);
        addProvide(provider);
        new ConnectionFinder(designRev).connectAll();
        const isConnected = requirer.getRequires().every(require => require.isConnected());
        expect(isConnected).toBe(true);
    });

    it("can connect all available requirements", function () {
        const designRev = new DesignRevision();
        const requirer = makeModule(designRev);
        makeRequires(requirer, 2);
        const requirer2 = makeModule(designRev);
        makeRequires(requirer2, 1);
        const provider = makeModule(designRev);
        makeProvides(provider, 3);
        const provider2 = makeModule(designRev);
        makeProvides(provider2, 2);

        new ConnectionFinder(designRev).connectAll();

        const allConnected = requirer.isConnected() && requirer2.isConnected();
        expect(allConnected).toBe(true);
    });

    it("does not connect a requirer to itself", function () {
        const designRev = new DesignRevision();
        const requirer = makeModule(designRev);
        const require = addRequire(requirer);
        addProvide(requirer);
        new ConnectionFinder(designRev).connectAll();
        expect(require.isConnected()).toBe(false);
    });

    it("prefers priority connections", function () {
        const designRev = new DesignRevisionBuilder().build();
        const requirer = makeModule(designRev);
        const requireBus = requirer.addRequire(getPriorityBus(requirer));

        const provider = makeModule(designRev);
        makeProvides(provider, 2);
        const priority = provider.addProvide(getPriorityBus(provider));
        makeProvides(provider, 1);
        new ConnectionFinder(designRev).connectAll();
        expect(requireBus.isConnectedToBus(priority)).toBe(true);
    });

    it("connects requires that only have one available provider, superseding priorities", function () {
        const setSeparateTemplate = (bus) => bus.templates = [
            {id: 24, name: 'POWER', power: true},
        ];

        const designRev = new DesignRevisionBuilder().build();
        const requirer = makeModule(designRev);
        const priorityReq = getPriorityBus(requirer);
        setSeparateTemplate(priorityReq);
        requirer.addRequire(priorityReq);
        const regularRequire = addRequire(requirer);

        const provider = makeModule(designRev);
        const priorityProv = getPriorityBus(provider);
        priorityProv.id = 1;
        const regular = getBusResource(provider);
        regular.id = 2;
        priorityProv.exclusions = [regular.id];
        setSeparateTemplate(priorityProv);
        regular.exclusions = [priorityProv.id];
        provider.addProvide(priorityProv);
        provider.addProvide(regular);
        const regular2 = getBusResource(provider);
        setSeparateTemplate(regular2);
        provider.addProvide(regular2);
        new ConnectionFinder(designRev).connectAll();
        expect(regularRequire.isConnected()).toBe(true);
    });
});