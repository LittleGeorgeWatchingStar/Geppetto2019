import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import makeModule from "../module/TestModule";
import {busResource} from "../bus/TestBus";

describe("ExplicitRequireNoConnection", function () {
    it('generates correct JSON', function () {
        // const require =
        const designRev = new DesignRevisionBuilder().build();
        const requirer = designRev.addModule(makeModule({
            requires: [
                busResource({
                    id: 345,
                    name: 'require',
                    is_optional: true, // Only optional require buses may have no connects.
                }),
            ],
        }), {
            x: 10, y: 20,
        });
        const requirerUuid = requirer.uuid;

        const require = requirer.findRequire(r => r.name === 'require');

        const noConn = designRev.addNoConnection(require);

        const json = noConn.toJSON();
        expect(json).toEqual({
            requirer: requirerUuid,
            require_bus: 345
        });
    });

    it('generates correct resource', function () {
        // const require =
        const designRev = new DesignRevisionBuilder().build();
        const requirer = designRev.addModule(makeModule({
            requires: [
                busResource({
                    id: 345,
                    name: 'require',
                    is_optional: true, // Only optional require buses may have no connects.
                }),
            ],
        }), {
            x: 10, y: 20,
        });
        const requirerUuid = requirer.uuid;

        const require = requirer.findRequire(r => r.name === 'require');

        const noConn = designRev.addNoConnection(require);

        const resource = noConn.toResource();
        expect(resource).toEqual({
            id:	undefined,
            requirer_uuid: requirerUuid,
            require_bus: 345,
            require_bus_name: 'require',
        });
    });
});
