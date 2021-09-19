export interface Part {
    designators: string[];
    device: string;
    deviceset: string;
    package: string;
    library: string;
    value: string;
    quantity: number;
    mpn: string;
}

export interface SplitPart {
    name: string;
    device: string;
    deviceset: string;
    package: string;
    library: string;
    value: string;
    mpn: string;
}

const DO_NOT_POPULATE = 'DNP';

export function convertSplitPartToPart(splitParts: SplitPart[]): Part[] {
    // Temporary dictionary.
    const bomTable = {};

    splitParts
        .filter(splitPart => splitPart.package)
        .forEach(splitPart => {
            const key = splitPart.value ?
                `${splitPart.package}:${splitPart.value}` :
                splitPart.package;

            if (bomTable.hasOwnProperty(key)) {
                bomTable[key].designators.push(splitPart.name);
            } else if (splitPart.value !== DO_NOT_POPULATE) {
                bomTable[key] = {
                    designators: [splitPart.name],
                    device: splitPart.device,
                    deviceset: splitPart.deviceset,
                    value: splitPart.value,
                    package: splitPart.package,
                    library: splitPart.library,
                    mpn: splitPart.mpn,
                }
            }
        });

    return Object.keys(bomTable).map(key => {
        const part = bomTable[key];

        let quantity = 0;
        part.designators.forEach(designator => {
            const designatorParts = designator.split('&');
            quantity += designatorParts.length;
        });

        part.quantity = quantity;

        return part;
    });
}
