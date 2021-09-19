import validate from 'utils/validate';

describe("isValid function", function () {
    it("returns false for empty string", function () {
        expect(validate.isValid('')).toBe(false);
    });

    it("returns false for a left angle bracket", function () {
        expect(validate.isValid('<')).toBe(false);
    });

    it("returns false for a right angle bracket", function () {
        expect(validate.isValid('>')).toBe(false);
    });

    it("returns false for double quotes", function () {
        expect(validate.isValid('"')).toBe(false);
    });

    it("returns false for single quotes", function () {
        expect(validate.isValid(`'`)).toBe(false);
    });

    it("returns false for backticks", function () {
        expect(validate.isValid('`')).toBe(false);
    });

    it("returns false for only whitespaces", function () {
        expect(validate.isValid(' ')).toBe(false);
    });

});

