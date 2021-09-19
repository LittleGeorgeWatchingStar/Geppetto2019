import * as React from "react";
import {PlacedModuleView} from "../placedmodule/PlacedModuleView";

interface ProviderOptionsViewProps {
    tooManyOptions: boolean;
    requireName: string;
    placedModuleViews: PlacedModuleView[];
}

interface ProviderOptionsViewState {
    selectedPm: PlacedModuleView | null;
    suppressAllProvides: boolean;
}

export class ProviderOptionsView extends React.Component<ProviderOptionsViewProps, ProviderOptionsViewState> {

    constructor(props) {
        super(props);
        this.state = {
            selectedPm: null,
            suppressAllProvides: props.tooManyOptions
        };
        this.refreshProvideSuppressions();
    }

    componentWillReceiveProps(nextProps): void {
        this.setState({
            selectedPm: null,
            suppressAllProvides: nextProps.tooManyOptions
        }, () => this.refreshProvideSuppressions());
    }

    render(): JSX.Element {
        const numResults = this.props.placedModuleViews.length;
        return (
            <div className="provider-options">
                {numResults === 0 && this.getHeader(<span className="provider-span-unready">Add a compatible module from the library.</span>)}
                {numResults === 1 && this.oneCompatibleModuleElement()}
                {numResults > 1 && this.multipleCompatibleModulesElement()}
            </div>
        )
    }

    private oneCompatibleModuleElement(): JSX.Element {
        const pmView = this.props.placedModuleViews[0];
        const moduleName = (
            <span data-test={'moduleName'}
                  className={`provider-module-name truncate`}
                  onMouseOver={() => this.onMouseover(pmView)}
                  onMouseOut={() => this.onMouseout(pmView)}>
                    {pmView.name}
                </span>
        );
        const connectedProvide = pmView.findCurrentlyConnectedProvide();
        if (connectedProvide) {
            return this.getHeader(<span
                className="provider-span-connected">Connected to {moduleName} {connectedProvide.name}.</span>);
        }
        return this.getHeader(<span className="provider-span-ready">Compatible with {moduleName} on board.</span>);
    }

    private multipleCompatibleModulesElement(): JSX.Element {
        const numResults = this.props.placedModuleViews.length;
        return (
            <div>
                {this.getHeader(
                    <span
                        className={this.isProvideConnected() ? "provider-span-connected" : "provider-span-ready"}>
                        {this.isProvideConnected() && <>Connected - {numResults} switchable modules on board</>}
                        {!this.isProvideConnected() && <>Available - {numResults} compatible modules on board:</>}
                        {this.props.tooManyOptions &&
                        <span className="provider-span-suppression">
                            <br/>(<i>Provide buses hidden by default due to volume.</i>
                            <button type="button"
                                    data-test={"toggleSuppression"}
                                    className={"toggle-suppression-btn"}
                                    onClick={() => this.onToggleProvideSuppression()}>
                                {this.state.suppressAllProvides ? 'Show' : 'Hide'}
                            </button>)
                        </span>}
                    </span>
                )}
                <ul className={this.isProvideConnected() ? "provider-list-connected" : "provider-list-ready"}>
                    {this.props.placedModuleViews.map(pmView => this.pmViewListItem(pmView))}
                </ul>
            </div>
        );
    }

    private pmViewListItem(pmView: PlacedModuleView): JSX.Element {
        const connectedProvide = pmView.findCurrentlyConnectedProvide();
        return (
            <li key={pmView.cid}>
                <span className={`provider-module-name-container ${this.isSelectedPm(pmView) ? 'selected-js' : ''}`}
                      title={pmView.name}>
                    <span data-test={'moduleName'}
                          className={`provider-module-name ${connectedProvide ? 'truncate' : ''}`}
                          onMouseOver={() => this.onMouseover(pmView)}
                          onMouseOut={() => this.onMouseout(pmView)}
                          onClick={() => this.onClick(pmView)}>
                        {pmView.name}
                    </span>
                </span>
                {connectedProvide && <span className="connected-message">Connected: {connectedProvide.name}</span>}
            </li>
        )
    }

    private getHeader(message: JSX.Element): JSX.Element {
        return (
            <div className="provider-options-header-container">
                <b>Connecting {this.props.requireName}</b> - {message}
            </div>
        );
    }

    private isProvideConnected(): boolean {
        if (this.props.placedModuleViews.filter(view => view.findCurrentlyConnectedProvide()).length > 0) return true;
        return false;
    }

    private onMouseover(pmView: PlacedModuleView): void {
        pmView.blink();
        this.props.placedModuleViews.forEach(v => v.hideProvideMenu());
        pmView.showProvideMenu();
        if (this.state.selectedPm) {
            this.state.selectedPm.showProvideMenu();
        }
    }

    private onMouseout(pmView: PlacedModuleView): void {
        pmView.stopBlinking();
        this.refreshProvideSuppressions();
    }

    private onClick(pmView: PlacedModuleView): void {
        this.setState({
            selectedPm: this.state.selectedPm !== pmView ? pmView : null
        }, () => this.refreshProvideSuppressions());
    }

    private refreshProvideSuppressions(): void {
        let isSuppressed = pmView => false;
        if (this.state.selectedPm) {
            isSuppressed = pmView => !this.isSelectedPm(pmView);
        } else if (this.state.suppressAllProvides) {
            isSuppressed = pmView => !pmView.findCurrentlyConnectedProvide();
        }
        this.props.placedModuleViews.forEach(pmView => pmView.setProvidesSuppressed(isSuppressed(pmView)));
    }

    private isSelectedPm(pmView: PlacedModuleView): boolean {
        return this.state.selectedPm && this.state.selectedPm.cid === pmView.cid;
    }

    private onToggleProvideSuppression(): void {
        this.setState({
            suppressAllProvides: !this.state.suppressAllProvides
        }, () => this.refreshProvideSuppressions());
    }
}
