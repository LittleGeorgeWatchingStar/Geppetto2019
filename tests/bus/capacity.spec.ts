import {ProvideBus} from "../../src/bus/ProvideBus";
import {RequireBus} from "../../src/bus/RequireBus";

const placedModule = {
    id: 4,
    powerProvides: [],
};

function makePowerRequire(milliwatts = 20) {
    return new RequireBus({
        is_power: true,
        power: true,
        milliwatts: milliwatts,
        efficiency: 0,
    }, placedModule);
}

function makePowerRegulator() {
    return new RequireBus({
        is_power: true,
        power: true,
        milliwatts: 4,
        efficiency: 0.6,
    }, placedModule);
}


function makeDataRequire(numConnections = 2) {
    return new RequireBus({
        is_power: false,
        power: false,
        num_connections: numConnections,
    }, placedModule);
}

describe("DataRequireCapacity", function () {
    function make(): RequireBus {
        return makeDataRequire();
    }

    it("makes a nice string", function () {
        const c = make();
        expect(c.getDescriptiveString())
            .toMatch('2');
    });

    it("draws no power", function () {
        const c = make();
        expect(c.powerDraw).toEqual(0);
    });
});


describe("PowerRequireCapacity", function () {
    describe("Not a regulator (efficiency = 0)", function () {
        function make(): RequireBus {
            return makePowerRequire();
        }

        it("makes a nice string", function () {
            const c = make();
            expect(c.getDescriptiveString())
                .toMatch('20mW');
        });

        it("draws  power", function () {
            const c = make();
            expect(c.powerDraw).toEqual(20);
        });
    });

    describe("An unconnected regulator (efficiency > 0)", function () {
        function make(): RequireBus {
            return makePowerRegulator();
        }

        it("renders base power when not connected", function () {
            const c = make();
            expect(c.getDescriptiveString())
                .toMatch('4mW');
        });

        it("draws base power when not connected", function () {
            const c = make();
            expect(c.getPowerDraw()).toEqual(4);
        });
    });

    describe("An connected regulator (efficiency > 0)", function () {
        function make(): RequireBus {
            const regulator = makePowerRegulator();
            regulator.addGraphChild({
                getUsed: () => 8
            } as any);
            return regulator;
        }

        it("draws base power when not connected", function () {
            const c = make();
            expect(c.powerDraw).toEqual(Math.ceil(4 + (8 / 0.6)));
        });

        it("renders base power before recalculating", function () {
            const c = make();
            expect(c.getDescriptiveString())
                .toMatch('4mW');
        });

        it("renders final draw after recalculating", function () {
            const c = make();
            c.getPowerDraw(); // causes it to recalculate
            expect(c.getDescriptiveString())
                .toMatch('18mW');
        });
    });
});


function makeDataProvide(numConnections = 3) {
    return new ProvideBus({
        is_power: false,
        power: false,
        num_connections: numConnections,
    }, placedModule);
}

function makePowerProvide(milliwatts = 40) {
    return new ProvideBus({
        is_power: true,
        power: true,
        milliwatts: milliwatts,
        efficiency: 0,
    }, placedModule);
}


describe("DataProvideCapacity", function () {
    describe("when unconnected", function () {
        function make(): ProvideBus {
            return makeDataProvide();
        }

        it("makes a nice string", function () {
            const c = make();
            expect(c.getDescriptiveString())
                .toMatch('3/3');
        });

        it("has remaining capacity", function () {
            const c = make();
            expect(c.getRemaining()).toEqual(3);
        });

        it("has zero used", function () {
            const c = make();
            c.calculateUsed();
            expect(c.getUsed()).toEqual(0);
        });

        it("has enough capacity to provide nothing", function () {
            const c = make();
            expect(c.hasEnoughCapacityFor(null)).toBeTruthy();
        });

        it("has enough capacity to provide one connection", function () {
            const capacity = make();
            const require = makeDataRequire(1);
            expect(capacity.hasEnoughCapacityFor(require)).toBeTruthy();
        });

        it("can provide three connections", function () {
            const capacity = make();
            const require = makeDataRequire(3);
            expect(capacity.hasEnoughCapacityFor(require)).toBeTruthy();
        });

        it("cannot provide four connections", function () {
            const capacity = make();
            const require = makeDataRequire(4);
            expect(capacity.hasEnoughCapacityFor(require)).toBeFalsy();
        });
    });

    describe("when connected", function () {
        function make(): ProvideBus {
            const provide = makeDataProvide(3);
            provide.addGraphChild(makeDataRequire(2));
            provide.calculateUsed();
            return provide;
        }

        it("has remaining capacity", function () {
            const c = make();
            expect(c.getRemaining()).toEqual(1);
        });

        it("shows amount available of total", function () {
            const c = make();
            expect(c.getDescriptiveString())
                .toMatch('1/3');
        });

        it("has correct quantity used", function () {
            const c = make();
            expect(c.getUsed()).toEqual(2);
        });

        it("has enough capacity to provide nothing", function () {
            const c = make();
            expect(c.hasEnoughCapacityFor(null)).toBeTruthy();
        });

        it("has enough capacity to provide one connection", function () {
            const capacity = make();
            const require = makeDataRequire(1);
            expect(capacity.hasEnoughCapacityFor(require)).toBeTruthy();
        });

        it("cannot provide two connections", function () {
            const capacity = make();
            const require = makeDataRequire(2);
            expect(capacity.hasEnoughCapacityFor(require)).toBeFalsy();
        });
    });

    describe("Enough total capacity", function () {
        it("is true when its total capacity meets the requirement", function () {
            const capacity = makeDataProvide(2);
            const require = makeDataRequire(2);
            expect(capacity.hasEnoughTotalCapacityFor(require)).toBeTruthy();
        });

        it("is false when its total capacity doesn't meet the requirement", function () {
            const capacity = makeDataProvide(1);
            const require = makeDataRequire(2);
            expect(capacity.hasEnoughTotalCapacityFor(require)).toBeFalsy();
        });
    });
});


describe("PowerProvideCapacity", function () {
    describe("when unconnected", function () {
        function make(): ProvideBus {
            const provide = makePowerProvide(40);
            provide.calculateUsed();
            return provide;
        }

        it("has full amount remaining", function () {
            const c = make();
            expect(c.getRemaining()).toEqual(40);
        });

        it("has zero used", function () {
            const c = make();
            expect(c.getUsed()).toEqual(0);
        });

        it("shows entire capacity available", function () {
            const c = make();
            expect(c.getDescriptiveString()).toMatch(('40/40mW'));
        });

        it("has enough capacity to provide nothing", function () {
            const c = make();
            expect(c.hasEnoughCapacityFor(null)).toBeTruthy();
        });

        it("has enough capacity to provide 40mW", function () {
            const capacity = make();
            const require = {
                getPowerDraw: () => 40,
            } as any;
            expect(capacity.hasEnoughCapacityFor(require)).toBeTruthy();
        });

        it("cannot provide more than 40mW", function () {
            const capacity = make();
            const require = {
                getPowerDraw: () => 41,
            } as any;
            expect(capacity.hasEnoughCapacityFor(require))
                .toBeFalsy("incorrectly provides 41mW");
        });
    });

    describe("when connected", function () {
        function make(): ProvideBus {
            const provide = makePowerProvide(40);
            const require = makePowerRequire(22);
            provide.addGraphChild(require);
            provide.calculateUsed();
            return provide;
        }

        it("has correct amount remaining", function () {
            const c = make();
            expect(c.getRemaining()).toEqual(18);
        });

        it("has correct amount used", function () {
            const c = make();
            expect(c.getUsed()).toEqual(22);
        });

        it("shows amount available of the total capacity", function () {
            const c = make();
            expect(c.getDescriptiveString()).toMatch(('18/40mW'));
        });

        it("has enough capacity to provide nothing", function () {
            const c = make();
            expect(c.hasEnoughCapacityFor(null)).toBeTruthy();
        });

        it("has enough capacity to provide 18mW", function () {
            const capacity = make();
            const require = {
                getPowerDraw: () => 18,
            } as any;
            expect(capacity.hasEnoughCapacityFor(require)).toBeTruthy();
        });

        it("cannot provide more than 18mW", function () {
            const capacity = make();
            const require = {
                getPowerDraw: () => 19,
            } as any;
            expect(capacity.hasEnoughCapacityFor(require))
                .toBeFalsy("incorrectly provides 41mW");
        });
    });

    describe("Enough total capacity", function () {
        it("is true when its total capacity meets the requirement", function () {
            const capacity = makePowerProvide(40);
            const require = makePowerRequire(40)
            expect(capacity.hasEnoughTotalCapacityFor(require)).toBeTruthy();
        });

        it("is false when its total capacity doesn't meet the requirement", function () {
            const capacity = makePowerProvide(30);
            const require = makePowerRequire(40)
            expect(capacity.hasEnoughTotalCapacityFor(require)).toBeFalsy();
        });
    });
});
