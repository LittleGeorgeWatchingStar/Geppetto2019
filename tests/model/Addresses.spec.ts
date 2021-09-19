import {AddressSpace, ReservableAddressSpace} from 'bus/ReservableAddressSpace';

/**
 * Test the Addresses model.
 */
describe("AddressSpace", () => {
    describe("constructor", () => {
        it("filters out duplicates", () => {
            const space = new AddressSpace([1, 1]);
            expect(space.size).toEqual(1);
        });

        it("filters out null", () => {
            const space = new AddressSpace([null]);
            expect(space.size).toEqual(0);
        });

        it("filters out NaN", () => {
            const space = new AddressSpace([Number.NaN]);
            expect(space.size).toEqual(0);
        });

        it("filters out undefined", () => {
            const space = new AddressSpace([undefined]);
            expect(space.size).toEqual(0);
        });

        it("does not filter out 0", () => {
            const space = new AddressSpace([0]);
            expect(space.size).toEqual(1);
        })
    });

    describe("fromDelimitedString", () => {
        it("returns an empty space for an empty string", () => {
            const space = AddressSpace.fromDelimitedString('');
            expect(space.size).toEqual(0);
        });

        it("accepts a single number", () => {
            const space = AddressSpace.fromDelimitedString('13');
            expect(space.size).toEqual(1);
            expect(space.contains(13)).toBe(true);
        });

        it("accepts comma-separated numbers", () => {
            const space = AddressSpace.fromDelimitedString('13,14,22');
            expect(space.size).toEqual(3);
            expect(space.contains(22)).toBe(true);
        });

        it("accepts ranges", () => {
            const space = AddressSpace.fromDelimitedString('13-16');
            expect(space.size).toEqual(4);
            expect(space.contains(15)).toBe(true);
        });

        it("accepts all kinds of stuff", () => {
            const space = AddressSpace.fromDelimitedString('13-16,18,41-43');
            expect(space.size).toEqual(8);
            expect(space.contains(15)).toBe(true);
            expect(space.contains(18)).toBe(true);
            expect(space.contains(41)).toBe(true);
            expect(space.contains(42)).toBe(true);
        });
    });
});

describe("ReservableAddressSpace", function () {
    describe("constructor", function () {
        it("accepts undefined as a constructor argument", function () {
            const a = new ReservableAddressSpace(undefined);
            expect(a.numAvailable()).toEqual(0);
        });

        it("accepts an empty string as a constructor argument", function () {
            const a = new ReservableAddressSpace('');
            expect(a.numAvailable()).toEqual(0);
        });

    });

    describe("reserve", function () {
        it("can reserve an address", function () {
            const a = new ReservableAddressSpace('13-15');
            const space = new AddressSpace([14]);
            a.reserve(space);
            expect(a.isAvailable(space)).toBe(false);
        });
        it("does not reserve null", function () {
            const a = new ReservableAddressSpace('0-2');
            a.reserve(null);
            expect(a.numAvailable()).toBe(3);
        });
    });

    describe("release", function () {
        it("can release a space", function () {
            const a = new ReservableAddressSpace('13-15');
            const space = new AddressSpace([14]);
            a.reserve(space);
            a.release(space);
            expect(a.isAvailable(space)).toBe(true);
        });
        it("does not release null", function () {
            const a = new ReservableAddressSpace('0-2');
            a.reserve(new AddressSpace([0]));
            a.release(null);
            expect(a.numAvailable()).toBe(2);
        });
    });

    describe("isAvailable", function () {
        it("reports a null space as always available", function () {
            const a = new ReservableAddressSpace('');
            expect(a.isAvailable(null)).toBe(true);
        });

        it("reports an empty space as always available", function () {
            const a = new ReservableAddressSpace('');
            const space = AddressSpace.empty();
            expect(a.isAvailable(space)).toBe(true);
        });
    });
});
