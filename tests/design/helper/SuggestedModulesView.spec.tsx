import * as React from "react";
import * as ReactDOM from "react-dom";
import {SuggestedModulesView} from "../../../src/design/helper/SuggestedModulesView";
import {ModuleBuilder} from "../../module/ModuleBuilder";
import {Workspace} from "../../../src/workspace/Workspace";
import * as $ from "jquery";

describe("SuggestedModulesView", () => {

    let container = null;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
            container = null;
        }
    });

    it('renders recommended modules', () => {
        const module = new ModuleBuilder().withName('Pejoy').build();
        ReactDOM.render(<SuggestedModulesView recommendedModules={[module]}
                                              message={''}
                                              workspace={new Workspace(true, true)}/>, container);
        expect(container.textContent).toContain('Pejoy');
        expect(container.querySelectorAll('.module-tile').length).toEqual(1);
    });

    it('renders the recommended message', () => {
        const module = new ModuleBuilder().withName('Pejoy').build();
        ReactDOM.render(<SuggestedModulesView recommendedModules={[module]}
                                              message={'Add mounting holes to your design, plebian!'}
                                              workspace={new Workspace(true, true)}/>, container);
        expect(container.textContent).toContain('Add mounting holes to your design, plebian!');
    });

    it('does not contain the Compatible section if compatible modules are not being queried', () => {
        const module = new ModuleBuilder().withName('Pejoy').build();
        ReactDOM.render(<SuggestedModulesView recommendedModules={[module]}
                                              message={'Add mounting holes to your design, plebian!'}
                                              workspace={new Workspace(true, true)}/>, container);
        expect(container.textContent).not.toContain('Compatible');
    });

    describe("Compatible modules", () => {

        it('queries compatible modules if the function exists', () => {
            const module = new ModuleBuilder().withModuleId(1).withName('Pejoy').build();
            const queryCompatible = () => {
                const deferred = $.Deferred();
                deferred.resolve([new ModuleBuilder().withModuleId(2).withName('Pretz').build()]);
                return deferred.promise() as JQuery.jqXHR;
            };
            ReactDOM.render(<SuggestedModulesView recommendedModules={[module]}
                                                  message={'Add mounting holes to your design, plebian!'}
                                                  queryCompatibleModules={queryCompatible}
                                                  workspace={new Workspace(true, true)}/>, container);
            expect(container.textContent).toContain('Pretz');
            expect(container.querySelectorAll('.module-tile').length).toEqual(2);
        });

        it('does not show a module under the Compatible section if it is already a Recommended module', () => {
            const module = new ModuleBuilder().withModuleId(1).withName('Pejoy').build();
            const queryCompatible = () => {
                const deferred = $.Deferred();
                deferred.resolve([module]);
                return deferred.promise() as JQuery.jqXHR;
            };
            ReactDOM.render(<SuggestedModulesView recommendedModules={[module]}
                                                  message={'Add mounting holes to your design, plebian!'}
                                                  queryCompatibleModules={queryCompatible}
                                                  workspace={new Workspace(true, true)}/>, container);
            expect(container.querySelectorAll('.module-tile').length).toEqual(1);
        });
    });
});
