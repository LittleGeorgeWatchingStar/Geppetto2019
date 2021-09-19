import {PlacedModule} from "../../placedmodule/PlacedModule";
import {Connection} from "../Connection";
import {SerializedConnection} from "./SerializedConnection";

/**
 * Parses connections to csv and csv to serialized connections.
 */
export class ConnectionParser {

    /**
     * Parse non-VLOGIC connections into a csv-formatted string.
     */
    public parseToCsv(pm: PlacedModule): string | null {
        const header = ['from, to, provide, require'];
        const provides = this.getCsvConnections(pm.providedConnections);
        const requires = this.getCsvConnections(pm.requiredConnections);
        const csvConnections = provides.concat(requires);
        if (csvConnections.length > 0) {
            return header.concat(csvConnections).join('\r\n');
        } else {
            return null;
        }
    }

    private getCsvConnections(connections: Connection[]): string[] {
        const csvConnections = [];
        for (const connection of connections) {
            if (!connection.isVlogic) {
                csvConnections.push(
                    [
                        connection.providerName,
                        connection.requirerName,
                        connection.provideBus.name,
                        connection.requireBus.name
                    ].join(',')
                );
            }
        }
        return csvConnections;
    }

    public csvToSerialized(csv: string): SerializedConnection[] | null {
        const connectionData: SerializedConnection[] = [];
        // Split on one or more of the following: \n, \r and \r\n.
        const csvLines = this.sanitizeCsv(csv).split(/[\r\n]+/);
        const header = csvLines[0];
        for (const record of csvLines) {
            //Ignore headers and empty lines.
            if (record != header && record.trim() !== '') {
                const fields = record.split(',');
                // If the line has a missing column or field.
                if (fields.length < 4 || this.hasEmptyField(fields)) {
                    return null;
                }
                connectionData.push({
                    from: fields[0].trim(),    //provider name
                    to: fields[1].trim(),      //requirer name
                    provide: fields[2].trim(), //provide name
                    require: fields[3].trim()  //require name
                } as SerializedConnection);
            }
        }
        return connectionData;
    }

    private sanitizeCsv(csv: string): string {
        return csv.replace(/[<>"]+/g, '');
    }

    private hasEmptyField(record: string[]): boolean {
        for (const field of record) {
            if (field.trim() == '') {
                return true;
            }
        }
        return false;
    }
}