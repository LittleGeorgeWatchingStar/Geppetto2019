import {BusTemplate} from 'module/custom/BusTemplate';

let i2cTemplate = {
    signals: [
        {
            id: 161,
            name: "SCL",
            bus_template: 69
        }
    ],
    id: 69,
    name: "SCL",
    power: false,
    min_path_length: null,
    max_path_length: null,
    path_width: null
};
let spiTemplate = {
    signals: [
        {
            id: 393,
            name: "CLK",
            bus_template: 125
        },
        {
            id: 395,
            name: "MOSI",
            bus_template: 125
        },
        {
            id: 396,
            name: "MISO",
            bus_template: 125
        },
        {
            id: 2306,
            name: "CS0",
            bus_template: 125
        },
        {
            id: 2307,
            name: "CS1",
            bus_template: 125
        }
    ],
    id: 125,
    name: "SPI",
    power: false,
    min_path_length: null,
    max_path_length: null,
    path_width: null
};

describe("BusTemplate", function() {
    let i2cBus;

    beforeEach(function() {
        i2cBus = new BusTemplate(i2cTemplate);
    });

    it("is defined", function() {
        expect(i2cBus).toBeDefined();
    });

    it("has a name", function() {
        expect(i2cBus.name).toBe("SCL");
    });

    it("has an id", function() {
        expect(i2cBus.getId()).toBe(69);
    });

    it("returns the correct number of signals", function() {
        expect(i2cBus.getSignals().length).toEqual(1);
    });

    it("defensively copies its signals", function() {
        let template = new BusTemplate(spiTemplate);
        let signals = template.getSignals();
        signals.splice(0, 2);
        expect(template.getSignals().length).toEqual(5); // unchanged
    });

});
