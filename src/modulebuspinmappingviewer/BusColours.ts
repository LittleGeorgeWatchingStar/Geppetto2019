import {BusResource} from "../bus/api";
import {ColourPool, createColourPool} from "../utils/ColourPool";

export interface BusColours {
    getColour: (bus: BusResource) => string | null;
    getColourByPinName: (pinName: string) => string | null;
}

export function createBusColours(buses: BusResource[]): BusColours {
    const colourPool = createColourPool(buses.length);

    function getColour(bus: BusResource): string | null {
        const index = buses.findIndex(item =>
            bus.id === item.id);
        if (index >= 0) {
            return colourPool.getColour(index);
        }
        return null;
    }

    function getColourByPinName(pinName: string): string | null {
        for (const bus of buses) {
            for (const net of bus.nets) {
                if (net.value === pinName) {
                    return getColour(bus);
                }
            }
        }
        return null;
    }

    return {
        getColour: getColour,
        getColourByPinName: getColourByPinName,
    }
}
