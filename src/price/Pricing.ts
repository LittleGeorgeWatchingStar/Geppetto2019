/**
 * Pricing model
 */
import {DesignRevision} from "../design/DesignRevision";

export class PricingModel {

    // TODO: This should really come from a data-driven Marketing source.
    private static readonly boardPricing = {
        20: {
            1: 1,
            100: 0.95,
            480: 0.91,
        },
    };

    private static readonly componentPricing = {
        1: 1,
        100: 0.95,
        480: 0.91,
    };

    static designUnitPrice(design: DesignRevision, qty: number, lead: number): number | null {
        const board_price = this.getBoardPrice(design.getBoardPrice(), qty, lead);
        const component_price = this.getComponentPrice(design.getComponentsPrice(), qty);

        if (board_price !== null && component_price !== null) {
            return (board_price + component_price);
        }
        return null;
    }

    private static getBoardPrice(base: number, qty: number, lead: number): number | null {
        if (this.boardPricing.hasOwnProperty(lead)) {
            if (this.boardPricing[lead].hasOwnProperty(qty)) {
                return (base * this.boardPricing[lead][qty]);
            }
        }
        return null;
    }

    private static getComponentPrice(base: number, qty: number): number | null{
        if (this.componentPricing.hasOwnProperty(qty)) {
            return (base * this.componentPricing[qty]);
        }
        return null;
    }
}
