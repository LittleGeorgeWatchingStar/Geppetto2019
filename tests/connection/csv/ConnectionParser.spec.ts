import ConnectionController from "../../../src/connection/ConnectionController";
import {ConnectionParser} from "../../../src/connection/csv/ConnectionParser";
import {getConnectedModules} from "./TestCsv";
import {overrideDesignRevision} from "../../design/TestDesign";


describe('ConnectionParser', function () {
    let designRev;
    let requirePM;
    let providePM;
    let parser;

    beforeEach(function () {
        designRev = overrideDesignRevision();
        const connectedModules = getConnectedModules(designRev);
        requirePM = connectedModules.requirerPM;
        providePM = connectedModules.providerPM;
        parser = new ConnectionParser();
    });

    describe('parses csv', function () {

        it('to serialized connections', function () {
            const csv = `from, to, provide, require\r\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('to serialized connections', function () {
            const csv = `from, to, provide, require\r\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('with multiple line feeds to serialized connections', function () {
            const csv = `from, to, provide, require\r\n\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('with multiple carriage returns to serialized connections', function () {
            const csv = `from, to, provide, require\r\r\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('with only line feeds to serialized connections', function () {
            const csv = `from, to, provide, require\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('with only carriage returns to serialized connections', function () {
            const csv = `from, to, provide, require\rprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });

        it('with a missing column to serialized connections', function () {
            const csv = `from, to, provide, require\r\nprovider,requirer,provideBus`;
            expect(parser.csvToSerialized(csv)).toEqual(null);
        });

        it('with a missing value to serialized connections', function () {
            const csv = `from, to, provide, require\r\nprovider,requirer,provideBus,`;
            expect(parser.csvToSerialized(csv)).toEqual(null);
        });

        it('with empty line to serialized connections', function () {
            const csv = `from, to, provide, require\r\n \r\nprovider,requirer,provideBus,requireBus`;
            expect(parser.csvToSerialized(csv)).toEqual([
                {
                    from: 'provider',
                    to: 'requirer',
                    provide: 'provideBus',
                    require: 'requireBus'
                }
            ]);
        });
    });

    it("parses placed module's connections to csv", function () {
        const csvConnections = parser.parseToCsv(requirePM);
        expect(csvConnections).toBe(`from, to, provide, require\r\nprovider,requirer,provide power,require power`);
    });

    it('correctly parses a connectionless placed module to csv', function () {
        requirePM.disconnect();
        const csv = parser.parseToCsv(requirePM);
        expect(csv).toBeNull();
    });

    it('correctly parses an empty csv to serialized connections', function () {
        const csv = '';
        const serializedConnections = parser.csvToSerialized(csv);
        expect(serializedConnections).toEqual([]);
    });

    it('sanitizes csv upload', function () {
        const csv = 'from, to, provide, require\r\nprovi"der,requirer,<provide power,require power>';
        const serializedConnections = parser.csvToSerialized(csv);
        let foundIllegalCharacter = false;
        const forbidden = /[<>"]/g;
        for (const serializedConnection of serializedConnections) {
            Object.keys(serializedConnection).forEach(key => {
                if (serializedConnection[key].match(forbidden)) {
                    foundIllegalCharacter = true;
                }
            });
        }
        expect(foundIllegalCharacter).toBe(false);
    });
});
