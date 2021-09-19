import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {PricingModel} from "price/Pricing";

describe("PricingModel.designUnitPrice", () => {
    describe("calculates the price", () => {
        const design = (new DesignRevisionBuilder()).build();

        it("at 0% discount for 1 board", () => {
            expect(PricingModel.designUnitPrice(design, 1, 20))
                .toBe(design.getBoardPrice());
        });

        it("at 5% discount for 100 boards", () => {
            expect(PricingModel.designUnitPrice(design, 100, 20))
                .toBe(design.getBoardPrice() * 0.95);
        });

        it("at 9% discount for 480 boards", () => {
            expect(PricingModel.designUnitPrice(design, 480, 20))
                .toBe(design.getBoardPrice() * 0.91);
        });
    })
});