import * as ReactDOM from "react-dom";
import * as React from "react";
import {ActionLog} from "../../src/workspace/ActionLog";
import * as ReactTestUtils from 'react-dom/test-utils';
import {actions} from "../../src/core/action";

function makeActionLog(logs: string[]) {
    const container = document.createElement('div');
    const element = <ActionLog actionLogs={logs} isOpen={true}/>;
    ReactDOM.render(element, container);
    return container;
}

describe("ActionLog", function () {

    let container = null;

    afterEach(() => {
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
        }
    });

    it("can render logs", function () {
        container = makeActionLog(['Move Pejoy']);
        expect(container.innerHTML).toContain('Move Pejoy');
    });

    it("can be closed, hiding the logs", function () {
        container = makeActionLog(['Move Pejoy']);
        ReactTestUtils.Simulate.click(container.querySelector('.action-log-close-button'));
        expect(container.innerHTML).toEqual('<div class="action-log"></div>');
    });
});