import {CustomerModuleCreate} from "../../CustomerModuleCreate";
import {CustomerBus} from "../../CustomerBus";
import {ColourPool, createColourPool} from "../../../../utils/ColourPool";

/**
 * Generate colours to visually group signals of a bus together.
 */
export class AssignableBusColours {

    private readonly colourPool: ColourPool;

    constructor(private readonly customerModuleCreate: CustomerModuleCreate) {
        this.colourPool = createColourPool(customerModuleCreate.maxBuses);
    }

    public static of(customerModule: CustomerModuleCreate): AssignableBusColours {
        return new AssignableBusColours(customerModule);
    }

    /**
     * Get a colour corresponding to a particular bus.
     */
    public getColour(bus: CustomerBus): string {
        return this.getColourByIndex(this.customerModuleCreate.getBuses().indexOf(bus));
    }

    public getColourByPinNumber(pinNumber: string): string | null {
        for (const domain of this.customerModuleCreate.voltageDomains) {
            for (const net of domain.getNets()) {
                if (net.pinNumber === pinNumber) {
                    return this.getColour(net.bus);
                }
            }
        }
        return null;
    }

    private getColourByIndex(i: number, alpha = 0.8): string {
        if (i > -1) {
            return this.colourPool.getColour(i, alpha);
        }
        return '';
    }
}
