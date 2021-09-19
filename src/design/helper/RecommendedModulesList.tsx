import * as React from "react";
import {ModuleRecommendationResource} from "./DesignRecommendationsGateway";
import {Module} from "../../module/Module";
import {Workspace} from "../../workspace/Workspace";
import {suggestedModulesDialogOptions} from "./showSuggestedModules";

interface RecommendedModulesListProps {
    filteredRecommendations: ModuleRecommendationResource[];
    workspace: Workspace;
    onClickOption: (params: suggestedModulesDialogOptions) => void;
}

export class RecommendedModulesList extends React.Component<RecommendedModulesListProps> {
    render(): JSX.Element[] {
        return this.props.filteredRecommendations.map((recommendation: ModuleRecommendationResource, i) =>
            (
                <span key={i}>
                    {recommendation.warning}
                    <span data-test={"viewOptions"}
                          className={"cta-link view-options"}
                          onClick={() => this.onClickOption(recommendation)}>
                        Options
                    </span>
                </span>
            ));
    }

    private onClickOption(recommendation: ModuleRecommendationResource): void {
        this.props.onClickOption({
            recommended: recommendation.modules.map(m => new Module(m)),
            message: recommendation.warning,
            workspace: this.props.workspace
        });
    }
}
