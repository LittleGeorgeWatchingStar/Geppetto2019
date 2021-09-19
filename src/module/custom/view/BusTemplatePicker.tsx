import * as React from "react";
import {BusTemplate} from "../BusTemplate";
import {CustomerBusType} from "../CustomerBus";
import {AssignableNetGroup} from "../AssignableNetGroup";
import {Signal} from "../Signal";

interface BusTemplatePickerProps {
    busTemplates: BusTemplate[];
    busType: CustomerBusType;
    voltageDomainGroup: AssignableNetGroup;
    onAddBus: (bus: BusTemplate) => void;
    onClose: () => void;
    isLoading: boolean;
}

interface BusTemplatePickerState {
    selectedBus: BusTemplate | null;
}

export class BusTemplatePicker extends React.Component<BusTemplatePickerProps, BusTemplatePickerState> {

    constructor(props) {
        super(props);
        this.state = {
            selectedBus: this.props.busTemplates.length ?
                this.props.busTemplates[0] :
                null,
        };
    }

    componentWillReceiveProps(nextProps: Readonly<BusTemplatePickerProps>): void {
        if (this.props.isLoading && !nextProps.isLoading && nextProps.busTemplates.length) {
            this.setState({
                selectedBus: nextProps.busTemplates[0],
            });
        }
    }

    private get inputOrOutputLabel(): string {
        return this.props.busType === CustomerBusType.REQUIRE ? 'Board Signal' : 'External Signal';
    }

    render() {
        return (
            <div className="bus-templates">
                <div className="header-container">
                    <h3>Add a Bus ( {this.inputOrOutputLabel} )</h3>
                    <button className="close-btn"
                        onClick={this.props.onClose}/>
                </div>
                {this.getBody()}
                <div className="pointer"/>
            </div>
        );
    }

    private getBody(): JSX.Element {
        const eligibleBusTemplates = this.props.busTemplates.filter(bus => this.isEligibleBus(bus));
        const selectedBus = this.state.selectedBus;
        if (this.props.isLoading) {
            return (
                <div className="body-container">
                    Loading, please wait...
                </div>
            );
        }

        let selectedBusEl;
        if (selectedBus) {
            selectedBusEl = <div>
                <div>
                    <span className="header">{selectedBus.name}</span>
                    <div><i>{selectedBus.getSignals().length} Signals / {this.props.voltageDomainGroup.numOpenPins} Open Pins</i></div>
                    <ul>
                        {selectedBus.getSignals().map(makeSignalNode)}
                    </ul>
                </div>
                <button className="cta"
                        onClick={() => this.props.onAddBus(this.state.selectedBus)}
                        data-test="selectBus">
                    Create {this.inputOrOutputLabel} Bus
                </button>
            </div>;
        } else {
            selectedBusEl = <div>Please select a bus.</div>;
        }

        return (
            <div className="body-container">
                <select multiple={true}
                        onChange={event => {this.onChangeBus(event)}}
                        defaultValue={[this.props.busTemplates[0].id]}>
                    {eligibleBusTemplates.map(template =>
                        <option value={template.id}
                                key={template.id}>
                            {template.name}
                        </option>)}
                </select>
                {selectedBusEl}
            </div>
        );
    }

    private onChangeBus(event): void {
        const templateId = event.target.value;
        const template = this.props.busTemplates.find(t => t.id.toString() === templateId.toString());
        if (template) {
            this.setState({
                selectedBus: template
            });
        }
    }

    /**
     * Don't show options with requirements that can't be fulfilled!!
     * Ie. cases where the number of assignable signals exceeds the number of pins.
     */
    private isEligibleBus(busTemplate: BusTemplate): boolean {
        const numMandatorySignals = busTemplate.getSignals().filter(signal => signal.mandatory).length;
        const hasEnoughNets = this.props.voltageDomainGroup.getNets().length >= numMandatorySignals;
        if (this.props.busType === CustomerBusType.REQUIRE) {
            return hasEnoughNets;
        }
        return hasEnoughNets && busTemplate.isPower(); // For provides, only power templates are currently supported.
    }
}

function makeSignalNode(signal: Signal): JSX.Element {
    const selectors = ['bus-signal-name'];
    if (signal.mandatory) {
        selectors.push('required');
    }
    return (
        <li className={selectors.join(' ')}
            key={signal.name}>
            {signal.name} {signal.mandatory ? '(Required)' : ''}
        </li>
    );
}
