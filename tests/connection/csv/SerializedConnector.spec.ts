import {getConnectedModules, makeOtherModule} from "./TestCsv";
import {ConnectionParser} from "../../../src/connection/csv/ConnectionParser";
import {SerializedConnector} from "../../../src/connection/csv/SerializedConnector";
import {DesignRevisionBuilder} from "../../design/DesignRevisionBuilder";
import {DesignRevision} from "../../../src/design/DesignRevision";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";


describe('SerializedConnector', function () {
    let designRev: DesignRevision;
    let requirePM: PlacedModule;
    let providePM: PlacedModule;
    let parser: ConnectionParser;

    beforeEach(function () {
        designRev = new DesignRevisionBuilder().build();
        const compatibleModules = getConnectedModules(designRev);
        requirePM = compatibleModules.requirerPM;
        providePM = compatibleModules.providerPM;
        parser = new ConnectionParser();
    });

    it('correctly establishes connections from an array of serialized connections', function () {
        const csv = parser.parseToCsv(requirePM);
        const serializedConnections = parser.csvToSerialized(csv);
        const connector = new SerializedConnector(requirePM, serializedConnections);
        connector.connect();
        expect(designRev.connections.length).toBe(2);
    });

    it('overwrites existing connections', function () {
        const csv = parser.parseToCsv(requirePM);
        const serializedConnections = parser.csvToSerialized(csv);
        const otherModule = makeOtherModule();
        const otherPM = designRev.addModule(otherModule, {x: 0, y: 0});
        // This connection is not included in the csv that will be uploaded. Hence, it will be disconnected post-upload.
        designRev.connectPair(otherPM.getRequires()[0], requirePM.getProvides()[0]);
        const numConnectionsPreUpload = designRev.connections.length;
        const connector = new SerializedConnector(requirePM, serializedConnections);
        connector.connect();
        const numConnectionsPostUpload = designRev.connections.length;
        expect(numConnectionsPreUpload).toBeGreaterThan(numConnectionsPostUpload);
    });

});