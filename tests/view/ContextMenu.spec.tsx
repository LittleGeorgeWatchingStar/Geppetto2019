import * as ReactTestUtils from "react-dom/test-utils";
import * as $ from "jquery";
import {ContextMenu} from "../../src/view/ContextMenu";

export function selectContextItem(label: string): void {
    const item = Array.from(document.querySelectorAll('.contextmenu li'))
        .find(li => li.textContent.includes(label));
    ReactTestUtils.Simulate.mouseDown(item, {nativeEvent: {which: 1} as MouseEvent});
}

describe("ContextMenu", function () {
    it("correctly disposes the document event listener on removal", function () {
        const event = $.Event('contextmenu', {which: 3});
        const context = new ContextMenu(event, []);
        context.remove();
        const removeSpy = spyOn(context, 'remove').and.callThrough();
        $(document).trigger($.Event('mousedown', {which: 1}));
        expect(removeSpy).not.toHaveBeenCalled();
    });
});