import * as React from "react";
import {Module} from "../../module/Module";
import {ModuleTile} from "../../view/librarypanel/ModuleTile";
import {Workspace} from "../../workspace/Workspace";
import {categorizeModules, createMapFromList} from "../../module/helpers";

interface SuggestedModulesViewProps {
    // TODO sometimes these haven't been loaded yet
    recommendedModules: Module[];
    queryCompatibleModules?: () => JQuery.jqXHR<Module[]>;
    message: string;
    workspace: Workspace;
}

interface SuggestedModulesViewState {
    compatibleModules: null | { [moduleCategory: string]: Module[] };
    isLoading: boolean;
}

/**
 * Shows draggable modules pertaining to a Design Recommendation.
 * For the way the app opens this dialog,
 * @see showSuggestedModules
 */
export class SuggestedModulesView extends React.Component<SuggestedModulesViewProps, SuggestedModulesViewState> {

    constructor(props) {
        super(props);
        this.state = {
            compatibleModules: null,
            isLoading: false
        };
    }

    componentDidMount(): void {
        if (!this.props.queryCompatibleModules) {
            return;
        }
        this.setState({isLoading: true});
        this.props.queryCompatibleModules().then(modules => {
            const lookupMap = createMapFromList(this.props.recommendedModules, module => module.moduleId);
            const notAlreadyRecommended = m => !lookupMap[m.moduleId];
            this.setState({
                compatibleModules: categorizeModules(modules.filter(notAlreadyRecommended)),
                isLoading: false
            });
        });
    }

    render(): JSX.Element {
        return (
            <div>
                <section className={"suggestion-message"}>
                    <p>{this.props.message}</p>
                </section>
                <section className={"recommended-modules"}>
                    {this.props.recommendedModules.length > 0 &&
                    <h3>Recommended</h3>}
                    {this.props.recommendedModules.map(m => this.makeModuleTile(m))}
                </section>
                <section className={"compatible-modules"}>
                    {this.props.queryCompatibleModules &&
                    <h3>Compatible</h3>}
                    {this.state.isLoading &&
                    <p className={"loading-message"}>
                        <span className={"blink"}>Loading...</span>
                    </p>
                    }
                    {this.compatibleModulesView()}
                </section>
            </div>
        )
    }

    private makeModuleTile(m: Module): JSX.Element {
        const noOp = () => {};
        return <ModuleTile key={m.moduleId}
                           module={m}
                           workspace={this.props.workspace}
                           onDragStart={noOp}
                           onDragStop={noOp}/>
    }

    private compatibleModulesView(): JSX.Element[] | null {
        if (!this.state.compatibleModules) {
            return null;
        }
        return Object.keys(this.state.compatibleModules).map(categoryName => {
            return (
                <section key={categoryName}
                         className={"category-section"}>
                    <h4>{categoryName}</h4>
                    <div>
                        {this.state.compatibleModules[categoryName].map(m => this.makeModuleTile(m))}
                    </div>
                </section>
            )
        });
    }
}
