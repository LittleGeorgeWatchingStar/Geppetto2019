import {ReviewDialog} from "design/review/ReviewDialog";
import 'lib/jquery-ui';
import {DesignRevisionBuilder} from "../DesignRevisionBuilder";
import * as ReactTestUtils from 'react-dom/test-utils';
import {DESIGN_HELPER} from "../../../src/view/events";
import events from "../../../src/utils/events";

describe("ReviewDialog", () => {

    let dialog = null;

    afterEach(() => {
        if (dialog) {
            dialog.close();
            dialog = null;
        }
    });

    function makeWarningDialog() {
        dialog = new ReviewDialog({
            model: new DesignRevisionBuilder().build(),
            warnings: ['A warning'],
        } as any)
    }

    describe("Proceed button", function () {

        beforeEach(makeWarningDialog);

        function getProceedButton(d: ReviewDialog): HTMLElement | null {
            return d.el.querySelector('.design-review__cta');
        }

        it("is visible after the warnings have loaded", function () {
            expect(getProceedButton(dialog)).not.toBeNull();
        });

        it("when clicked, opens a push dialog", function () {
            const button = getProceedButton(dialog);
            ReactTestUtils.Simulate.click(button);
            expect(document.querySelector('.push-dialog')).not.toBeNull();
        });
    });

    describe("Click Open Design Helper", () => {

        beforeEach(makeWarningDialog);

        it("publishes DESIGN_HELPER", () => {
            let eventFired = false;
            events.subscribe(DESIGN_HELPER, () => eventFired = true);
            const button = dialog.el.querySelector('[data-test="openDesignHelper"]');
            ReactTestUtils.Simulate.click(button);
            expect(eventFired).toBe(true);
        });
    });
});
