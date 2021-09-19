import {FeatureBuilder} from "../module/feature/FeatureBuilder";
import {
    DimensionController,
    DimensionDirection
} from "../../src/dimension/DimensionController";
import {CONTEXT_MODE, ESC, WORKSPACE_CLICK} from "../../src/workspace/events";
import eventDispatcher from 'utils/events';
import {BLOCK_ROTATE} from "../../src/placedmodule/events";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {RemoveModule} from "../../src/module/actions";
import {ModuleAnchorBuilder} from "./Anchor/ModuleAnchorBuilder";
import {ModuleAnchor} from "../../src/dimension/Anchor/ModuleAnchor";
import {ContextModes} from "../../src/workspace/Workspace";
import {AnchorExtensionsController} from "../../src/dimension/Anchor/AnchorExtension/AnchorExtensionsController";
import {EventsController} from "../../src/Events/EventsController";

describe("DimensionController", function () {
    beforeEach(() => {
        AnchorExtensionsController.setInstance(new AnchorExtensionsController());
        DimensionController.setInstance(new DimensionController());
    });

    afterEach(() => {
        DimensionController.getInstance().destructor();

    });

    it('cancels dimensioning on ESC', () => {
        const anchor = new ModuleAnchorBuilder().build();
        DimensionController.getInstance().onClickDimensionAnchor(anchor);
        expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);

        eventDispatcher.publish(ESC);
        expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
    });

    it('cancels dimensioning on WORKSPACE_CLICK', () => {
        const anchor = new ModuleAnchorBuilder().build();
        DimensionController.getInstance().onClickDimensionAnchor(anchor);
        expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);

        eventDispatcher.publish(WORKSPACE_CLICK);
        expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
    });

    describe('on toggle context mode', () => {
        it('can set dimension direction to both', () => {
            eventDispatcher.publishEvent(CONTEXT_MODE, {mode: ContextModes.DIMENSIONING});
            expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
        });

        it('cancels the current dimension in progress', () => {
            const anchor = new ModuleAnchorBuilder().build();
            DimensionController.getInstance().onClickDimensionAnchor(anchor);
            expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);

            eventDispatcher.publishEvent(CONTEXT_MODE, {mode: ContextModes.DIMENSIONING});
            expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
        });
    });

    it('cancels dimensioning on BLOCK_ROTATE', () => {
        const anchor = new ModuleAnchorBuilder().build();
        DimensionController.getInstance().onClickDimensionAnchor(anchor);
        expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);

        eventDispatcher.publishEvent(BLOCK_ROTATE, {
            model: new PlacedModuleBuilder().build()
        });
        expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
    });

    describe('removing dimensionable', () => {
        it('cancels dimensioning when its dimensionable is removed', () => {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            const anchor = pm.anchors[0] as ModuleAnchor;
            DimensionController.getInstance().onClickDimensionAnchor(anchor);
            expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);


            new RemoveModule(pm).execute();
            expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.NONE);
        });
        it('does not cancels dimensioning when other dimensionable is removed', () => {
            const designRev = new DesignRevisionBuilder().build();
            const otherPm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            const anchor = pm.anchors[0] as ModuleAnchor;
            DimensionController.getInstance().onClickDimensionAnchor(anchor);
            expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);

            new RemoveModule(otherPm).execute();
            expect(DimensionController.getInstance().dimensionDirection).not.toEqual(DimensionDirection.NONE);
        });
    });

    it('sets the correct dimension direction on clicking an anchor', () => {
        const points = [
            {x: 0, y: 5},
            {x: 0, y: 50},
        ]; // Vertical
        const feature = new FeatureBuilder()
            .withPoints(points)
            .build();
        const anchor = new ModuleAnchorBuilder()
            .withFeature(feature)
            .build();
        DimensionController.getInstance().onClickDimensionAnchor(anchor);
        expect(DimensionController.getInstance().dimensionDirection).toEqual(DimensionDirection.VERTICAL);
    });

    describe('AnchorExtensions', () => {
        it('adds AnchorExtension when dimensioning is started', () => {
            const anchor = new ModuleAnchorBuilder().build();
            expect(AnchorExtensionsController.getInstance().extensions.length).toEqual(0);

            DimensionController.getInstance().onClickDimensionAnchor(anchor);
            expect(AnchorExtensionsController.getInstance().extensions.length).toEqual(1);
            expect(AnchorExtensionsController.getInstance().extensions[0].anchor).toEqual(anchor);

        });
        it('removes AnchorExtension when dimensioning is complete', () => {
            // Stop finishDimension from publishing events, and triggering things we are not testing.
            spyOn(EventsController.getInstance(), 'publishEvent');

            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            const anchor1 = pm.anchors[0] as ModuleAnchor;
            const anchor2 = pm.anchors[1] as ModuleAnchor;

            DimensionController.getInstance().onClickDimensionAnchor(anchor1);
            expect(AnchorExtensionsController.getInstance().extensions.length).toEqual(1);

            DimensionController.getInstance().onClickDimensionAnchor(anchor2);
            expect(AnchorExtensionsController.getInstance().extensions.length).toEqual(0);

        });
    });
});