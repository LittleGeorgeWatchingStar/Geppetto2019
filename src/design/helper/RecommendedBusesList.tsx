import * as React from "react";
import {ProvideBus} from "../../bus/ProvideBus";
import {Workspace} from "../../workspace/Workspace";
import {Module} from "../../module/Module";
import {BusRecommendation} from "./filterBusRecommendations";
import {suggestedModulesDialogOptions} from "./showSuggestedModules";
import {toggleBlink} from "./DesignHelper";

interface RecommendedBusesListProps {
    workspace: Workspace;
    libraryModules: Module[];
    busRecommendations: BusRecommendation[];
    onClickOption: (params: suggestedModulesDialogOptions) => void;
}

/**
 * A view for suggesting that certain provide buses should be connected.
 */
export class RecommendedBusesList extends React.Component<RecommendedBusesListProps> {
    render(): JSX.Element[] {
        return this.props.busRecommendations.map((r, i) =>
            <div key={i}
                 onMouseOver={() => toggleBlink(r.placedModule, true)}
                 onMouseOut={() => toggleBlink(r.placedModule, false)}>
                {r.warning}
                <ul>
                    {r.provideBuses.filter(p => p).map((provide: ProvideBus, i: number) =>
                        <li key={i}>
                            <span data-test={"viewOptions"}
                                  className={"cta-link"}
                                  onClick={() => this.onClickProvideBus(provide, r)}>
                                Options for {provide.name}
                            </span>
                        </li>
                    )}
                </ul>
            </div>
        );
    }

    /**
     * TODO For multiple provide buses, probably perform a union on their compatible modules
     */
    private onClickProvideBus(provide: ProvideBus, recommendation: BusRecommendation): void {
        const getRecommendedModules = () => {
            const lookupMap = {} as {[moduleId: string]: Module[]};
            this.props.libraryModules.forEach(module => {
                if (!lookupMap.hasOwnProperty(module.moduleId)) {
                    lookupMap[module.moduleId] = [];
                }
                lookupMap[module.moduleId].push(module);
            });
            let modules = [];
            for (const id of recommendation.suggestedModuleIds) {
                if (lookupMap[id]) {
                    modules = modules.concat(lookupMap[id]);
                }
            }
            return modules;
        };
        this.props.onClickOption({
            recommended: getRecommendedModules(),
            busToQuery: provide,
            message: recommendation.warning,
            workspace: this.props.workspace
        });
    }
}
