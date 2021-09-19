import * as React from "react";
import {DesignRevision} from "../DesignRevision";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {PowerFinder, PowerFinderResults} from "./PowerFinder";
import {Module} from "../../module/Module";
import {ReactNode} from "react";

interface PowerFinderDialogContentProps {
    designRevision: DesignRevision;
    powerFinder: PowerFinder;
    powerFinderResults: PowerFinderResults;
    closeDialog: () => void;
    setRemoveModules: (module: PlacedModule[]) => void;
    setInProgress: () => void;
    addPower: (selection: Module[]) => void;
}

interface PowerFinderDialogContentState {
    existingPower: PlacedModule[];
    loading: boolean;
    error: boolean;
    selections: { [type: string]: Module };
}

export class PowerFinderDialogContent extends React.Component<PowerFinderDialogContentProps, PowerFinderDialogContentState> {
    constructor(props: PowerFinderDialogContentProps) {
        super(props);
        this.state = {
            existingPower: this.props.designRevision.getPlacedModules().filter(pm => pm.module.isPowerModule),
            loading: false,
            error: false,
            selections: {},
        }
    }

    componentDidMount() {
        this.props.setRemoveModules(this.state.existingPower);
        if (this.props.designRevision.isNew()
            && !this.props.designRevision.isDirty()
            || this.props.designRevision.getPlacedModules().filter(pm => !pm.module.isPowerModule).length === 0) return this.setState({error: true});
        if (this.state.existingPower.length === 0 && !this.state.error && !this.state.loading && !this.props.powerFinderResults) {
            this.props.setInProgress();
            this.setState({loading: true});
        }
    }

    componentDidUpdate(prevProps: Readonly<PowerFinderDialogContentProps>, prevState: Readonly<PowerFinderDialogContentState>, snapshot?: any) {
        if (this.state.existingPower.length === 0 && !this.state.error && !this.state.loading && !this.props.powerFinderResults) {
            this.props.setInProgress();
            this.setState({loading: true});
        }
        if (this.props.powerFinderResults && this.state.loading) {
            this.setState({loading: false});
            if (Object.getOwnPropertyNames(this.state.selections).length === 0) this.defaultSelection();
        }
    }

    render() {
        return (
            <>
                {this.state.error && this.error()}
                {this.state.existingPower.length > 0 && !this.state.error && this.warning()}
                {this.state.existingPower.length === 0 && !this.state.error && this.finder()}
            </>
        );
    }

    private warning(): React.ReactNode {
        return (
            <div className="message">
                <p>Your board already contains power modules.
                    This tool can find and suggest replacements for them.</p>
                <p>You can cancel any time by closing this dialog.</p>
                <div className="warning-button-container">
                    <button className="cta" onClick={() => this.removeExistingPower()}>Proceed</button>
                    <button onClick={() => this.props.closeDialog()}>Cancel</button>
                </div>
            </div>
        )
    }

    private finder(): React.ReactNode {
        let powerModules, sortedLevels, connectors;

        if (this.props.powerFinderResults) {
            powerModules = this.props.powerFinderResults.powerModules;
            sortedLevels = Object.keys(powerModules).sort((a, b) => powerModules[b].length - powerModules[a].length);
            connectors = this.props.powerFinderResults.connectors;
        }

        return (
            <>
                {this.state.loading &&
                <div className="loader">
                    <div className="loading"/>
                    <b>Checking your board's power requirements. <br/> This may take a moment...</b>
                </div>}
                {!this.state.loading &&
                <div className="power-finder-content">
                    <div className="suggestions">
                        <div className="heading">
                            <h3>Choose power sources</h3>
                        </div>
                        <div className="options-container">
                            <div className="connector-options-container">
                                <p>You may have <b>one <span>connector</span></b> at once.</p>
                                <div>
                                    {connectors &&
                                    <form className="connector-options">
                                        <h3>Connectors</h3>
                                        {connectors.map((connector, i) => {
                                            return (this.connectorItem(i, connector))
                                        })}
                                    </form>}
                                    {this.props.powerFinderResults && this.connectorMessage()}
                                </div>
                            </div>
                            <div>
                                <p>Please choose one option per voltage level.</p>
                                <div className="options">
                                    {sortedLevels && this.optionView(sortedLevels, powerModules)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="preview-container">
                        <div>
                            <div className="preview-wrapper">
                                <div className="preview">
                                    {this.getPrice()}
                                </div>
                                <div className="pointer"/>
                            </div>
                            <div className="button-container">
                                <button onClick={() => this.addPower()} className="add-power cta">Add Power</button>
                            </div>
                        </div>
                    </div>
                </div>
                }
            </>
        )
    }

    private optionView(sortedLevels: string[], powerModules: Module[]): React.ReactNode {
        const view = [];
        sortedLevels.forEach((level) => {
            view.push(this.optionList(powerModules[level], level));
        })
        return view;
    }

    private optionList(powerModules: Module[], level: string): React.ReactNode {
        const listView = [];
        powerModules.forEach((module, i) => {
            listView.push(this.optionItem(i, module, level));
        })

        return (
            <form id={level} key={level}>
                <h3>{level}V</h3>
                {listView}
            </form>
        );
    }

    private optionItem(key: number, option: Module, level: string): React.ReactNode {
        const isLikeConnector = this.props.powerFinder.isLikeConnector(option);
        const isChecked = this.state.selections[level] === option;
        const isDisabled = this.checkDisabledConnectors(this.state.selections["connector"], option);
        const isDisabledInvalidLevel = this.checkInvalidLevelProviders(this.state.selections["connector"], option, level);

        return (
            <div key={key}>
                {isDisabledInvalidLevel && !isLikeConnector &&
                <label data-connector="true"
                       title="This module needs more power than your current connector can provide.">
                    <input type="radio" name={level}
                           value={option.getId() as string}
                           disabled={true}
                           onChange={() => this.onChangeSelection(option, level)}
                           checked={isChecked}/>
                    <span>{option.name}</span>
                </label>
                }
                {isLikeConnector &&
                <label data-connector="true"
                       title="This option is a connector. You can change your selection under 'Connectors'.">
                    <input type="radio" name={level}
                           value={option.getId() as string}
                           disabled={isDisabled}
                           onChange={() => this.onChangeSelection(option, level)}
                           checked={isChecked}/>
                    <span>{option.name}</span>
                </label>}
                {!isLikeConnector && !isDisabledInvalidLevel &&
                <label>
                    <input type="radio" name={level}
                           value={option.getId() as string}
                           onChange={() => this.onChangeSelection(option, level)}
                           disabled={isDisabled}
                           checked={isChecked}/>
                    <span>{option.name}</span>
                </label>}
                <span>{option.getFormattedPrice()}</span>
            </div>
        );
    }

    private connectorItem(key: number, connector: Module): React.ReactNode {
        const isChecked = this.state.selections['connector'] === connector;

        return (
            <div key={key}>
                <label>
                    <input type="radio" name="connectors"
                           value={connector.getId() as string}
                           onChange={() => this.onChangeSelection(connector, "connector")}
                           defaultChecked={isChecked}/>
                    <span>{connector.name}</span>
                </label>
                <span>{connector.getFormattedPrice()}</span>
            </div>
        )
    }

    private error(): React.ReactNode {
        const errorMessage = this.props.powerFinder.error ? this.props.powerFinder.error : "Your board currently has no power requirements.";

        return (
            <div className="message">
                {errorMessage}
                <div className="warning-button-container">
                    <hr/>
                    <button onClick={() => this.props.closeDialog()}>OK</button>
                </div>
            </div>
        )
    }

    private removeExistingPower(): void {
        this.setState({existingPower: []});
    }

    private defaultSelection(): void {
        const defaultSelection = {};
        const connectors = this.props.powerFinderResults.connectors;
        const powerModules = this.props.powerFinderResults.powerModules;
        const sortedLevels = Object.keys(powerModules).sort((a, b) => powerModules[b].length - powerModules[a].length);
        if (connectors) defaultSelection['connector'] = (connectors[0]);
        sortedLevels.forEach((level) => {
            if (powerModules[level]) {
                for (let i = 0; i < powerModules[level].length; i++) {
                    if (this.props.powerFinder.isLikeConnector(powerModules[level][i])) {
                        if (!this.checkDisabledConnectors(defaultSelection['connector'], powerModules[level][i])) {
                            defaultSelection[level] = (powerModules[level][i]);
                            break;
                        }
                    } else {
                        if (!this.checkInvalidLevelProviders(defaultSelection['connector'], powerModules[level][i], level)) {
                            defaultSelection[level] = (powerModules[level][i]);
                            break;
                        }
                    }
                }
            }
        });
        this.setState({selections: defaultSelection});
    }

    private onChangeSelection(selection: Module, type: string): void {
        let newSelection = this.state.selections;
        newSelection[type] = selection;
        if (type === 'connector') newSelection = this.resetOptionSelection(newSelection);
        this.setState({selections: newSelection});
    }

    /**
     * If a disabled input has been selected in a form, automatically switch to a non-disabled input.
     */
    private resetOptionSelection(newSelection: { [type: string]: Module }): { [type: string]: Module } {
        const powerModules = this.props.powerFinderResults.powerModules;
        const sortedLevels = Object.keys(powerModules).sort((a, b) => powerModules[b].length - powerModules[a].length);
        sortedLevels.forEach((level) => {
            if (powerModules[level]) {
                for (let i = 0; i < powerModules[level].length; i++) {
                    if (this.props.powerFinder.isLikeConnector(powerModules[level][i])) {
                        if (!this.checkDisabledConnectors(newSelection['connector'], powerModules[level][i])) {
                            newSelection[level] = (powerModules[level][i]);
                            break;
                        }
                    } else {
                        if (!this.checkInvalidLevelProviders(newSelection['connector'], powerModules[level][i], level)) {
                            newSelection[level] = (powerModules[level][i]);
                            break;
                        }
                    }
                    if (i === powerModules[level].length - 1) {
                        delete newSelection[level];
                        break;
                    }
                }
            }
        });
        return newSelection;
    }

    private addPower(): void {
        const finalSelection = [];
        Object.keys(this.state.selections).forEach(key => {
            const selection = this.state.selections[key];
            const selectedConnector = this.state.selections['connector'];

            if (key === 'connector') return finalSelection.unshift(selectedConnector);
            if (key !== 'connector' && selectedConnector !== selection) {
                finalSelection.push(this.state.selections[key]);
            }
        })
        this.props.addPower(finalSelection);
    }

    /**
     * Level category connectors should appear disabled if they are not
     * the connector that has been selected under the master Connectors category.
     */
    private checkDisabledConnectors(connector: Module, currentModule: Module): boolean {
        if (connector && this.props.powerFinder.isLikeConnector(currentModule)) {
            return currentModule.getId() !== connector.getId();
        }
        return false;
    }

    private checkInvalidLevelProviders(connector: Module, currentModule: Module, level: string): boolean {
        const otherSelected = [];
        for (const s in this.state.selections) {
            if (s !== 'connector' && s !== level) {
                otherSelected.push(this.state.selections[s]);
            }
        }
        if (!this.props.powerFinder.isLikeConnector(currentModule)) {
            otherSelected.push(currentModule);
        }
        return !this.props.powerFinder.isValidCombination(otherSelected, connector);
    }

    private connectorMessage(): ReactNode {
        const levels = [];
        const powerModules = this.props.powerFinderResults.powerModules;
        const sortedLevels = Object.keys(powerModules).sort((a, b) => powerModules[b].length - powerModules[a].length);
        sortedLevels.forEach((level) => {
            if (powerModules[level]) {
                for (let i = 0; i < powerModules[level].length; i++) {
                    if (this.state.selections['connector'] === powerModules[level][i]) {
                        levels.push(`${level}V`);
                        break;
                    }
                }
            }
        });

        return (
            <>
                {levels.length > 0 &&
                <p className="connector-message">
                    {this.state.selections['connector'].name} can supply <b>{levels.join(', ')}</b>.
                </p>}
            </>
        )
    }

    private getPrice(): ReactNode {
        let totalPrice = 0;
        const name = [];
        for (const s in this.state.selections) {
            const selection = this.state.selections[s];
            const selectedConnector = this.state.selections['connector'];
            if (s === 'connector' || (s !== 'connector' && selectedConnector !== selection)) {
                name.push(selection.name);
                name.push(<br key={s}/>);
                totalPrice += selection.getPrice();
            }
        }

        return (
            <>
                {name}
                <b>Total cost: ${totalPrice.toFixed(2)}</b>
            </>
        )
    }
}