import {DesignBuilder} from "../design/DesignBuilder";
import OpenDialog, {OpenDialogOptions} from "../../src/view/OpenDialog";

describe("Open design dialog", function () {
    it("sorts designs from latest updated to earliest", function () {
        const designs = [
            new DesignBuilder()
                .withCreated(new Date('Jan 3, 2000'))
                .withUpdated(new Date('Jan 3, 2000'))
                .withTitle('first')
                .build(),
            new DesignBuilder()
                .withCreated(new Date('Jan 1, 2000'))
                .withUpdated(new Date('Jan 1, 2000'))
                .withTitle('third')
                .build(),
            new DesignBuilder()
                .withCreated(new Date('Jan 2, 2000'))
                .withUpdated(new Date('Jan 2, 2000'))
                .withTitle('second')
                .build()
        ];

        const dialog = new OpenDialog({designs: designs} as OpenDialogOptions);
        const first = dialog.$el.find('li')[0];
        const second = dialog.$el.find('li')[1];
        const third = dialog.$el.find('li')[2];
        expect(first.innerHTML).toContain('first');
        expect(second.innerHTML).toContain('second');
        expect(third.innerHTML).toContain('third');
    });
});