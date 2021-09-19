import {AddNewLogo, RemoveLogo, ResizeLogo,} from "../../src/logo/actions";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {PlacedLogoBuilder, testSvgData} from "../placedlogo/PlacedLogoBuilder";
import {actions, executeAction} from "../../src/core/action";
import {RotateBlock} from "../../src/placeditem/actions";


describe("AddNewLogo", function () {
    describe("execute", function () {
        it('adds the new logo to the design revision', function () {
            const designRev = new DesignRevisionBuilder().build();
            const position = {x: 40, y: 105};
            new AddNewLogo(designRev, position, testSvgData).execute();
            expect(designRev.getPlacedLogos().length).toEqual(1);
        });
    });

    describe("reverse", function () {
        it("removes the logo from the design revision", function () {
            const designRev = new DesignRevisionBuilder().build();
            const position = {x: 40, y: 105};
            const action = new AddNewLogo(designRev, position, testSvgData);
            action.execute();
            action.reverse();
            expect(designRev.getPlacedLogos().length).toEqual(0);
        });
        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const position = {x: 40, y: 105};
            const action = new AddNewLogo(designRev, position, testSvgData);
            executeAction(action);
            const pl = designRev.getPlacedLogos()[0];
            const removeAction = new RemoveLogo(pl);
            executeAction(removeAction);
            actions.undo();
            actions.undo();
            expect(designRev.getPlacedLogos().length).toEqual(0);
        });
    });

    describe("redo", function () {
        it("re-adds the logo to the design revision", function () {
            const designRev = new DesignRevisionBuilder().build();
            const position = {x: 40, y: 105};
            const action = new AddNewLogo(designRev, position, testSvgData);
            executeAction(action);
            actions.undo();
            actions.redo();
            expect(designRev.getPlacedLogos().length).toEqual(1);
            expect(designRev.getPlacedLogos()[0].position.x).toEqual(40);
            expect(designRev.getPlacedLogos()[0].position.y).toEqual(105);
        });
        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const position = {x: 40, y: 105};
            const action = new AddNewLogo(designRev, position, testSvgData);
            executeAction(action);
            const pl = designRev.getPlacedLogos()[0];
            const removeAction = new RemoveLogo(pl);
            executeAction(removeAction);
            actions.undo();
            actions.redo();
            expect(designRev.getPlacedLogos().length).toEqual(0);
        });
    });
});

describe("RotateLogo", function () {
    it("rotates the logo 90 degrees", function () {
        const pl = new PlacedLogoBuilder().build();
        const action = new RotateBlock(pl);

        executeAction(action);

        expect(pl.rotation).toEqual(90);
    });
});

describe("RemoveLogo", function () {
    describe("execute", function () {
        it("removes the logo", function () {
            const pl = new PlacedLogoBuilder().build();
            const designRev = pl.designRevision;
            const action = new RemoveLogo(pl);

            executeAction(action);

            expect(designRev.getPlacedLogos().length).toEqual(0);
        });
    });
    describe("reverse", function () {
        it("restores the logo", function () {
            const pl = new PlacedLogoBuilder().build();
            const designRev = pl.designRevision;
            const action = new RemoveLogo(pl);

            executeAction(action);
            actions.undo();

            const logos = designRev.getPlacedLogos();
            expect(logos.length).toEqual(1);
            expect(logos.find(
                current => current.toJSON().toString() === pl.toJSON().toString()
            )).not.toBeUndefined();
        });
        it("puts the logo in the original position", function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(5, 10)
                .build();
            const designRev = pl.designRevision;
            const action = new RemoveLogo(pl);

            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedLogos()[0];
            expect(restored.position.equals({x: 5, y: 10})).toEqual(true);
        });
        it("restores the logo's rotation", function () {
            const pl = new PlacedLogoBuilder()
                .withRotation(180)
                .build();
            const designRev = pl.designRevision;
            const action = new RemoveLogo(pl);

            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedLogos()[0];
            expect(restored.rotation).toBe(180);
        });
    });
    describe("redo", function () {
        it("remove the logo", function () {
            const pl = new PlacedLogoBuilder().build();
            const designRev = pl.designRevision;
            const action = new RemoveLogo(pl);

            executeAction(action);
            actions.undo();
            actions.redo();

            const logos = designRev.getPlacedLogos();
            expect(logos.length).toEqual(0);
        });
    });
});

describe("ResizeLogo", function () {

    describe("execute", function () {
        it("resizes the logo",function () {
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .build();
            const action = new ResizeLogo(pl, 'left', {x: -5, y: 0});

            executeAction(action);

            expect(pl.width).toEqual(55);
            expect(pl.height).toEqual(50);
        });
        it("snaps",function () {
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .build();
            const action = new ResizeLogo(pl, 'left', {x: -3, y: 0});

            executeAction(action);

            expect(pl.width).toEqual(55);
            expect(pl.height).toEqual(50);
        });
    });
    describe("reverse", function () {
        it("unresizes the logo",function () {
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .build();
            const action = new ResizeLogo(pl, 'left', {x: -5, y: 0});

            executeAction(action);
            actions.undo();

            expect(pl.width).toEqual(50);
            expect(pl.height).toEqual(50);
        });
        it("original position is restored",function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(5, 10)
                .withSize(50, 50)
                .build();
            const designRev = pl.designRevision;
            const action = new ResizeLogo(pl, 'left', {x: -5, y: 0});

            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedLogos()[0];

            expect(restored.position.equals({x: 5, y: 10})).toEqual(true);
        });
        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .withDesignRevision(designRev)
                .build();

            const resizeAction = new ResizeLogo(pl, 'left', {x: -5, y: 0});
            executeAction(resizeAction);
            const removeAction = new RemoveLogo(pl);
            executeAction(removeAction);
            actions.undo();
            actions.undo();

            expect(designRev.getPlacedLogos()[0].width).toEqual(50);
            expect(designRev.getPlacedLogos()[0].height).toEqual(50);
        });
    });
    describe("redo", function () {
        it("resizes the logo",function () {
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .build();
            const action = new ResizeLogo(pl, 'left', {x: -5, y: 0});

            executeAction(action);
            actions.undo();
            actions.redo();

            expect(pl.width).toEqual(55);
            expect(pl.height).toEqual(50);
        });
        it("latest position is restored",function () {
            const pl = new PlacedLogoBuilder()
                .withPosition(5, 10)
                .withSize(50, 50)
                .build();
            const designRev = pl.designRevision;
            const action = new ResizeLogo(pl, 'left', {x: -5, y: 0});

            executeAction(action);
            actions.undo();
            actions.redo();

            const restored = designRev.getPlacedLogos()[0];

            expect(restored.position.equals({x: 0, y: 10})).toEqual(true);
        });
        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pl = new PlacedLogoBuilder()
                .withSize(50, 50)
                .withDesignRevision(designRev)
                .build();

            const resizeAction = new ResizeLogo(pl, 'left', {x: -5, y: 0});
            executeAction(resizeAction);
            const removeAction = new RemoveLogo(pl);
            executeAction(removeAction);
            actions.undo();
            actions.undo();
            actions.redo();

            expect(designRev.getPlacedLogos()[0].width).toEqual(55);
            expect(designRev.getPlacedLogos()[0].height).toEqual(50);
        });
    });
});
