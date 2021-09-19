import {PlacedLogoBuilder, testSvgData} from "./PlacedLogoBuilder";
import {AddNewLogo, RemoveLogo, ResizeLogo} from "../../src/logo/actions";
import DialogManager from "../../src/view/DialogManager";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {MoveBlock} from "../../src/placeditem/actions";

describe("PlacedLogo actions", function () {

    // Adding a placed logo prompts a dialog. Bypass it here.
    function mockDialog() {
        spyOn(DialogManager, 'create').and.callFake(
            (dialog, options) => {
                options.callback('Fake-svg-data');
            }
        );
    }

    describe("on add", function () {
        it("adds the logo to the design revision", function () {
            const rev = new DesignRevisionBuilder().build();
            mockDialog();
            const action = new AddNewLogo(rev, {x: 0, y: 0}, testSvgData); // should cause an overlap
            action.execute();
            expect(rev.getPlacedLogos().length).toEqual(1);
        });

        it("Computes overlaps", function () {
            const rev = new DesignRevisionBuilder().build();
            mockDialog();
            new AddNewLogo(rev, {x: 0, y: 0}, testSvgData).execute();
            new AddNewLogo(rev, {x: 0, y: 0}, testSvgData).execute();
            const logo = rev.getPlacedLogos()[0];
            expect(logo.overlaps()).toBe(true);
        });
    });

    describe("translate", function () {
        it("recomputes overlaps", function () {
            const rev = new DesignRevisionBuilder().build();
            const logo = new PlacedLogoBuilder()
                .withPosition(50, 50)
                .withDesignRevision(rev)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withDesignRevision(rev)
                .build();
            const action = new MoveBlock(logo, {x: -50, y: -50}); // should cause an overlap
            action.execute();
            expect(logo.overlapsWith(other)).toBe(true);
        });
    });

    describe("resize", function () {
        it("recomputes overlaps", function () {
            const rev = new DesignRevisionBuilder().build();
            const logo = new PlacedLogoBuilder()
                .withPosition(0, 30)
                .withSize(30, 30)
                .withDesignRevision(rev)
                .build();
            const other = new PlacedLogoBuilder()
                .withPosition(0, 0)
                .withSize(30, 30)
                .withDesignRevision(rev)
                .build();
            const action = new ResizeLogo(logo, 'bottom', {x: 0, y: -150}); // should cause an overlap
            action.execute();
            expect(logo.overlapsWith(other)).toBe(true);
        });
    });

    describe("remove", function () {
        it("recomputes overlaps", function () {
            const rev = new DesignRevisionBuilder().build();
            mockDialog();
            new AddNewLogo(rev, {x: 0, y: 0}, testSvgData).execute();
            new AddNewLogo(rev, {x: 0, y: 0}, testSvgData).execute();
            const logo = rev.getPlacedLogos()[0];
            const other = rev.getPlacedLogos()[1];
            expect(logo.overlapsWith(other)).toBe(true);
            new RemoveLogo(logo).execute();
            expect(other.overlaps()).toBe(false);
        });
    });
});