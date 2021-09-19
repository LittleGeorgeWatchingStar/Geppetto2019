import {enumerateString} from "../../src/utils/StringEnumerator";

describe("StringEnumerator", function () {
    it("returns an enumerated version of the string input if it is found in the list", function () {
        const enumerated = enumerateString('tazdingo', ['tazdingo']);
        expect(enumerated).toEqual('tazdingo 1');
    });

    it("returns the same alphachar string if not found in the list", function () {
        const enumerated = enumerateString('tazdingo', ['yeeeaah']);
        expect(enumerated).toEqual('tazdingo');
    });

    it("returns the same string if it is only a subset match for strings in the list", function () {
        const enumerated = enumerateString('tazdingo', ['tazdingo eee', 'tazdingo 222', 'tazdingo ooo 1', 'tazdingo tazdingo']);
        expect(enumerated).toEqual('tazdingo');
    });

    it("returns the same numeric string if not found in the list", function () {
        const enumerated = enumerateString('5555', ['3232', 'socks']);
        expect(enumerated).toEqual('5555');
    });

    it("returns the same string if only enumerations of it exist", function () {
        const enumerated = enumerateString('tazdingo',
            ['tazdingo 3', 'tazdingo 1', 'tazdingo 2']);
        expect(enumerated).toEqual('tazdingo');
    });

    it("does not increment a numeric string input if found in the list", function () {
        const enumerated = enumerateString('5555', ['5555', 'socks']);
        expect(enumerated).toEqual('5555 1');
    });

    it("returns the same alphanumeric string if not found in the list", function () {
        const enumerated = enumerateString('wol0lol0l0', ['3232', 'socks']);
        expect(enumerated).toEqual('wol0lol0l0');
    });

    it("returns the next available number for a string input with an enumeration", function () {
        const enumerated = enumerateString('tazdingo 1',
            ['tazdingo 1', 'tazdingo 3', 'tazdingo 4']);
        expect(enumerated).toEqual('tazdingo 2');
    });

    it("returns the next available number for a string input without an enumeration", function () {
           const enumerated = enumerateString('tazdingo',
            ['tazdingo 1', 'tazdingo', 'tazdingo 3', 'tazdingo 4']);
        expect(enumerated).toEqual('tazdingo 2');
    });

    it("returns the next available number when the string list ends in the same entry", function () {
           const enumerated = enumerateString('tazdingo',
            ['tazdingo 3', 'tazdingo 1', 'tazdingo']);
        expect(enumerated).toEqual('tazdingo 2');
    });
});
