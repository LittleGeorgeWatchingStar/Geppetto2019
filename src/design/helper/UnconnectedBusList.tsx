import * as React from "react";
import {ProvideBus} from "../../bus/ProvideBus";
import {Workspace} from "../../workspace/Workspace";
import {suggestedModulesDialogOptions} from "./showSuggestedModules";
import {Module} from "../../module/Module";
import {toggleBlink} from "./DesignHelper";
import {Bus} from "../../bus/Bus";

interface UnconnectedBusListProps {
    getWarning: (bus: Bus) => string;
    filterSuggestedModules: () => Module[];
    provides: ProvideBus[];
    workspace: Workspace;
    onClickOption: (params: suggestedModulesDialogOptions) => void;
}

/**
 * A view for hard-coded validation on unconnected RESET/Console Port provide buses.
 */
export class UnconnectedBusList extends React.Component<UnconnectedBusListProps> {
    render(): JSX.Element[] {
        return this.props.provides.map((bus, i) =>
            <div key={i}
                 onMouseOver={() => toggleBlink(bus.placedModule, true)}
                 onMouseOut={() => toggleBlink(bus.placedModule, false)}>
                {this.props.getWarning(bus)} <span onClick={() => this.onClickViewOptions(bus)}
                                             className={"cta-link"}>Options</span>
            </div>
        );
    }

    private onClickViewOptions(provide: ProvideBus): void {
        const modules = this.props.filterSuggestedModules();
        if (!modules.length) {
            return;
        }
        this.props.onClickOption({
            recommended: modules,
            busToQuery: provide,
            message: this.props.getWarning(provide),
            workspace: this.props.workspace
        });
    }
}
