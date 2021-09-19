import {DesignRevision} from "../DesignRevision";
import {ModuleRecommendationResource} from "./DesignRecommendationsGateway";
import * as React from "react";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {PlacementAnalyzer} from "../placementanalyzer/PlacementAnalyzer";
import {ChangeRadiusBoard, FitBoard} from "../../view/actions";
import {RemoveModules} from "../../module/actions";
import {Workspace} from "../../workspace/Workspace";
import {RecommendedBusesList} from "./RecommendedBusesList";
import {RecommendedModulesList} from "./RecommendedModulesList";
import {filterBusRecommendations} from "./filterBusRecommendations";
import {Module} from "../../module/Module";
import {showSuggestedModules} from "./showSuggestedModules";
import {
    filterModuleRecommendations,
    filterRedundantModules,
    filterUnconnectedConsolePorts,
    filterUnconnectedReset,
    findDuplicatePower,
    isSuspiciousCornerRadius,
    MIN_CORNER_RADIUS
} from "./DesignReview";
import {UnconnectedBusList} from "./UnconnectedBusList";
import {DuplicatePowerList} from "./DuplicatePowerList";
import {toggleBlink} from "./DesignHelper";
import {Bus} from "../../bus/Bus";
import {ProvideBus} from "../../bus/ProvideBus";

interface DesignSuggestionsProps {
    design: DesignRevision;
    // All Module Recommendations, regardless whether the design fulfills them or not.
    moduleRecommendations: ModuleRecommendationResource[];
    workspace: Workspace;
    libraryModules: Module[];
}

/**
 * Optional suggestions that help optimize the design.
 */
export class DesignSuggestions extends React.Component<DesignSuggestionsProps> {

    render(): JSX.Element {
        const validations = this.designValidations();
        if (!validations.length) return null;
        return (
            <div className="design-helper__optional-suggestions">
                <div className="optional-suggestions-header">
                    Optional Suggestions
                </div>
                <ul>
                    {validations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
            </div>
        )
    }

    private designValidations(): JSX.Element[] {
        const validations = [];
        if (new PlacementAnalyzer(this.props.design).isBoardSizeOptimizable) {
            validations.push(this.boardSizeSuggestion);
        }

        if (isSuspiciousCornerRadius(this.props.design)) {
            validations.push(this.cornerRadiusSuggestion);
        }

        const duplicatePower = findDuplicatePower(this.props.design);
        if (Object.keys(duplicatePower).length) {
            validations.push(<DuplicatePowerList duplicatePower={duplicatePower}/>);
        }

        const moduleRecommendations = filterModuleRecommendations(this.props.design, this.props.moduleRecommendations);
        if (moduleRecommendations.length) {
            validations.push(<RecommendedModulesList filteredRecommendations={moduleRecommendations}
                                                     workspace={this.props.workspace}
                                                     onClickOption={showSuggestedModules}/>)
        }

        const busRecommendations = filterBusRecommendations(this.props.design);
        if (busRecommendations.length) {
            validations.push(<RecommendedBusesList libraryModules={this.props.libraryModules}
                                                   workspace={this.props.workspace}
                                                   busRecommendations={busRecommendations}
                                                   onClickOption={showSuggestedModules}/>)
        }

        const unconnectedConsolePorts = filterUnconnectedConsolePorts(this.props.design);
        if (unconnectedConsolePorts.length) {
            const filter = module => module.name.toLowerCase() === 'usb-uart'; // OMG
            const getWarning = bus => `To view kernel debug messages, connect ${bus.name} on ${bus.moduleName}.`;
            validations.push(this.makeUnconnectedBusView(filter, getWarning, unconnectedConsolePorts));
        }
        const unconnectedReset = filterUnconnectedReset(this.props.design);
        if (unconnectedReset.length) {
            const filter = module => module.name.toLowerCase().includes('tactile switch');  // OMG
            const getWarning = bus => `${bus.moduleName} has no reset button. Consider connecting a switch to ${bus.name}.`;
            validations.push(this.makeUnconnectedBusView(filter, getWarning, unconnectedReset));
        }

        const redundant = filterRedundantModules(this.props.design);
        if (redundant.length) {
            validations.push(this.getRedundantModulesView(redundant));
        }
        return validations;
    }

    private makeUnconnectedBusView(filter: (module: Module) => boolean,
                                   getWarning: (bus: Bus) => string,
                                   buses: ProvideBus[]): JSX.Element {
        return <UnconnectedBusList filterSuggestedModules={() => this.props.libraryModules.filter(filter)}
                                   getWarning={getWarning}
                                   provides={buses}
                                   workspace={this.props.workspace}
                                   onClickOption={showSuggestedModules}/>
    }

    private get boardSizeSuggestion(): JSX.Element {
        const fitBoard = () => FitBoard.addToStack(this.props.design);
        return <span>The board size can be optimized: <br/>
                <span className="cta-link fit-board"
                      onClick={fitBoard}>Fit board to modules</span></span>;
    }

    private get cornerRadiusSuggestion(): JSX.Element {
        const onClick = () => ChangeRadiusBoard.addToStack(this.props.design.board, 0);
        return <span>The board has a corner radius of less than {MIN_CORNER_RADIUS / 10}mm. Was this intentional?
                <span className="cta-link set-radius"
                      onClick={onClick}> Set radius to 0</span></span>;
    }

    private getRedundantModulesView(unconnectedModules: PlacedModule[]): JSX.Element {
        const onClick = (pm: PlacedModule) => this.props.design.selectPlacedItem(pm);
        return (
            <div>
                These components aren't providing any functionality:
                <ul className="unconnected-components">
                    {unconnectedModules.map(m =>
                        <li className="module-name"
                            key={m.uuid}
                            onClick={() => onClick(m)}
                            onMouseOver={() => toggleBlink(m, true)}
                            onMouseOut={() => toggleBlink(m, false)}>{m.name}</li>)}
                </ul>
                <span className="cta-link clean-up"
                      onClick={() => RemoveModules.addToStack(unconnectedModules)}>
                    Clean up
                </span>
            </div>
        )
    }
}
