import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactTestUtils from "react-dom/test-utils";
import {UserFlagEditor} from "../../src/auth/UserFlagEditor";
import {AVAILABLE_FLAGS, AVAILABLE_TOOL_FLAGS} from "../../src/auth/FeatureFlag";
import User from "../../src/auth/User";
import createSpy = jasmine.createSpy;

describe("UserFlagEditor", () => {
    let container;
    let gateway;

    beforeEach(() => {
        container = document.createElement('div');
        gateway = {
            toggleFlag: createSpy().and
                .returnValue($.Deferred().resolve()),
        };
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.clear();
    });

    it("calls toggleFlag when a feature flag is clicked", () => {
        ReactDOM.render(<UserFlagEditor user={new User()}
                                        gateway={gateway}
                                        availableFlags={AVAILABLE_FLAGS}
                                        availableToolFlags={AVAILABLE_TOOL_FLAGS}/>,
            container);
        const flag = container.querySelector('.flag');
        ReactTestUtils.Simulate.click(flag);
        expect(gateway.toggleFlag).toHaveBeenCalled();
    });
});
