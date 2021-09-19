import * as React from "react";
import {EditableBus} from "../ModuleData";
import {BusGroupResource} from "../../../bus/api";

/**
 * The ways to add a Voltage Domain to a Bus.
 */
export enum VoltageDomainSetMode {
    SELECT_EXISTING = 'Select Existing',
    CREATE_NEW = 'Create New'
}

interface VoltageDomainEditorProps {
    voltageDomains: BusGroupResource[];
    selectedVoltageDomain: BusGroupResource | null;
    onSelectVoltageDomain: (voltageDomain: BusGroupResource) => void;
    initialIsExpanded: boolean;
}

interface VoltageDomainEditorState {
    voltageDomainSetMode: VoltageDomainSetMode;
    isExpanded: boolean;

    title: string; // Title for new Voltage Domain.
    levels: string[]; // Levels for new Voltage Domain.
}

export class VoltageDomainEditor extends React.Component<VoltageDomainEditorProps, VoltageDomainEditorState> {
    private allowedVoltages: string[];

    constructor(props: VoltageDomainEditorProps) {
        super(props);
        this.allowedVoltages = [
            '0.0',
            '1.2',
            '1.5',
            '1.8',
            '2.5',
            '3.0',
            '3.3',
            '4.0',
            '5.0',
            '16.0',
            '36.0'
        ]; // Query!!
        this.state = {
            voltageDomainSetMode: VoltageDomainSetMode.SELECT_EXISTING,
            isExpanded: this.props.initialIsExpanded,

            title: '',
            levels: [],
        };

        if (!this.props.selectedVoltageDomain && this.props.voltageDomains.length > 0) {
            this.props.onSelectVoltageDomain(this.props.voltageDomains[0]);
        }
    }

    render() {
        return (
            <section className={"voltage-domain-editor"}>
                <div className="field-header">
                    <span className="required-input">Voltage Domain</span>
                    <button type="button"
                            className="edit-btn"
                            onClick={() => this.setState({isExpanded: !this.state.isExpanded})}>
                        {this.state.isExpanded ? 'Collapse' : 'Edit'}
                    </button>
                </div>
                {this.state.isExpanded && this.voltageDomainEditor}
                {!this.state.isExpanded && this.voltageDomainSummary}
            </section>
        );
    }

    private get voltageDomainSummary(): JSX.Element {
        const title = this.state.voltageDomainSetMode === VoltageDomainSetMode.CREATE_NEW ?
            this.state.title :
            this.props.selectedVoltageDomain ? this.props.selectedVoltageDomain.title : null;

        const levels = this.state.voltageDomainSetMode === VoltageDomainSetMode.CREATE_NEW ?
            this.state.levels :
            this.props.selectedVoltageDomain ? this.props.selectedVoltageDomain.levels : null;

        return (
            <div onClick={() => this.setState({isExpanded: true})}>
                {title && <b>{title}</b>}
                {!title && <i>Unnamed voltage domain</i>}
                {levels && levels.map(l =>
                    <span key={l} className="voltage-domain">{l}V</span>
                )}
            </div>
        )
    }

    private onSelectVoltageDomain(event): void {
        const id = event.target.value;
        const voltageDomain = this.props.voltageDomains
            .find(voltageDomain => voltageDomain.id.toString() === id);
        if (voltageDomain) {
            this.props.onSelectVoltageDomain(voltageDomain);
        }
    }

    private get voltageDomainEditor(): JSX.Element {
        const domainSelectors = mode =>
            `voltage-domain-form ${this.isVoltageDomainSetMode(mode) ? 'selected-js' : ''}`;
        return (
            <div>
                <p className="note">Voltage levels that the Bus can take. Buses
                    with the same Domain will operate at the same voltage level within a design. <b>Pick one of two ways
                        to set the Domain:</b></p>
                <div className="row">
                    <div className={`select-existing ${domainSelectors(VoltageDomainSetMode.SELECT_EXISTING)}`}
                         onClick={() => this.onToggleVoltageDomainMode(VoltageDomainSetMode.SELECT_EXISTING)}>
                        <label>
                            <input type="radio"
                                   checked={this.isVoltageDomainSetMode(VoltageDomainSetMode.SELECT_EXISTING)}/>
                            <b>Select Existing</b>
                        </label>
                        <select size={6}
                                value={this.props.selectedVoltageDomain ?
                                    this.props.selectedVoltageDomain.id.toString() :
                                    null}
                                onChange={event => this.onSelectVoltageDomain(event)}>
                            {
                                this.props.voltageDomains.map(d =>
                                    <option key={d.id} value={d.id}>{d.title}</option>
                                )
                            }
                        </select>
                    </div>
                    <div className={domainSelectors(VoltageDomainSetMode.CREATE_NEW)}
                         onClick={() => this.onToggleVoltageDomainMode(VoltageDomainSetMode.CREATE_NEW)}>
                        <label>
                            <input type="radio"
                                   checked={this.isVoltageDomainSetMode(VoltageDomainSetMode.CREATE_NEW)}/>
                            <b>Create New</b>
                        </label>
                        <input type="text"
                               placeholder="Voltage Domain name..."
                               value={this.state.title}
                               onChange={event => this.onChangeName(event)}/>
                        <div className="allowed-voltages-container">
                            Allowed Voltages
                            <div>
                                {this.allowedVoltages.map(v => (
                                    <label key={v} className="allowed-voltage">
                                        <input type="checkbox"
                                               value={v}
                                               onChange={event => this.onClickAllowedVoltage(event)}
                                               checked={this.state.levels.some(level => level === v)}/>{v}V
                                    </label>)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    private onChangeName(event): void {
        const title = event.target.value;
        this.setState({
            title: title,
        });
    }

    private onClickAllowedVoltage(event): void {
        const level = event.target.value;
        const levels = this.state.levels;
        const index = levels.indexOf(level);
        if (index < 0) {
            levels.push(level);
        } else {
            levels.splice(index, 1);
        }
        this.setState({
            levels: levels,
        });
    }

    private isVoltageDomainSetMode(mode: VoltageDomainSetMode): boolean {
        return this.state.voltageDomainSetMode === mode;
    }

    private onToggleVoltageDomainMode(mode: VoltageDomainSetMode) {
        this.setState({
            voltageDomainSetMode: mode
        });
    }

    public clearCreateNew(): void {
        this.setState({
            voltageDomainSetMode: VoltageDomainSetMode.SELECT_EXISTING,
            title: '',
            levels: [],
        });
    }
}
