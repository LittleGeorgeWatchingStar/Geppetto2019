import {ModuleAnchorBuilder} from "../ModuleAnchorBuilder";
import {AnchorExtensionsController} from "../../../../src/dimension/Anchor/AnchorExtension/AnchorExtensionsController";

describe("AnchorExtensionsController", () => {
    let anchorExtensionsController: AnchorExtensionsController;

    beforeEach(() => {
       anchorExtensionsController = new AnchorExtensionsController();
    });

    it('cant get extensions', () => {
        const anchor1 = new ModuleAnchorBuilder().build();
        const extension1 = anchorExtensionsController.addExtension(anchor1);

        const anchor2 = new ModuleAnchorBuilder().build();
        const extension2 = anchorExtensionsController.addExtension(anchor2);

        const anchor3 = new ModuleAnchorBuilder().build();
        const extension3 = anchorExtensionsController.addExtension(anchor3);

        expect(anchorExtensionsController.extensions.length).toEqual(3);
        expect(anchorExtensionsController.extensions).toContain(extension1);
        expect(anchorExtensionsController.extensions).toContain(extension2);
        expect(anchorExtensionsController.extensions).toContain(extension3);
    });

    it('can add an extension', () => {
        const anchor = new ModuleAnchorBuilder().build();
        const extension = anchorExtensionsController.addExtension(anchor);

        expect(anchorExtensionsController.extensions.length).toEqual(1);
        expect(anchorExtensionsController.extensions[0]).toEqual(extension);
    });

    it('can remove an extension', () => {
        const anchor1 = new ModuleAnchorBuilder().build();
        const anchor2 = new ModuleAnchorBuilder().build();

        const extension1 = anchorExtensionsController.addExtension(anchor1);
        const extension2 = anchorExtensionsController.addExtension(anchor2);
        anchorExtensionsController.removeExtension(extension1);

        expect(anchorExtensionsController.extensions.length).toEqual(1);
        expect(anchorExtensionsController.extensions[0]).toEqual(extension2);
    });
});
