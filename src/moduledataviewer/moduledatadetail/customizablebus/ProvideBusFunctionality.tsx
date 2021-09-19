import * as React from "react";
import {SignalEditor} from "./SignalEditor";
import {BusTemplatePicker} from "./BusTemplatePicker";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import * as _ from "underscore";
import {ModuleData} from "../ModuleData";
import {
    createEditableProvideTemplate,
    EditableProvideTemplate
} from "./EditableBusTemplate";
import {ProvideSignal} from "./AssignableSignal";

interface ProvideBusFunctionalityProps {
    availableBusTemplates: BusTemplate[];
    busTemplates: EditableProvideTemplate[];
    data: ModuleData;
    onUpdateBusTemplates: (busTemplates: EditableProvideTemplate[]) => void;
}

interface ProvideBusFunctionalityState {
    selectedSignal: ProvideSignal | null;
    signalEditorPosition: null | { left: string, top: string };
    busTemplates: EditableProvideTemplate[];
    isSelectingFunctionality: boolean;
}

/**
 * A view that allows adding functionality (Bus Templates) to an editable Provide Bus.
 * Unlike Require Buses, a Provide Bus only ever has one template.
 */
export class ProvideBusFunctionality extends React.Component<ProvideBusFunctionalityProps, ProvideBusFunctionalityState> {
    private selectedSignalRef;

    constructor(props) {
        super(props);

        this.state = {
            selectedSignal: null,
            busTemplates: props.busTemplates.slice(),
            signalEditorPosition: null,
            isSelectingFunctionality: this.props.busTemplates.length === 0
        };
        this.selectedSignalRef = React.createRef();
    }

    render(): JSX.Element {
        return (
            <div onClick={() => this.setState({selectedSignal: null})}>
                <span className="field-header required-input">Functionality</span>
                <br/>
                {!this.state.isSelectingFunctionality && this.templateView}
                {(this.state.isSelectingFunctionality || this.state.busTemplates.length === 0) && this.templatePicker}
            </div>
        )
    }

    componentDidUpdate(prevProps: Readonly<ProvideBusFunctionalityProps>,
                       prevState: Readonly<ProvideBusFunctionalityState>): void {
        const ref = this.selectedSignalRef.current;
        if (!ref) {
            return;
        }
        const newPos = {
            left: `${ref.offsetLeft + ref.offsetWidth}px`,
            top: `${ref.closest('.bus-view__bus-template').offsetTop + ref.offsetTop}px`
        };
        if (!_.isEqual(prevState.signalEditorPosition, newPos)) {
            this.setState({
                signalEditorPosition: newPos
            });
        }
    }

    private get templateView(): JSX.Element | null {
        const template = this.props.busTemplates[0]; // Provide buses only ever have 1 template.
        if (!template) {
            return null;
        }
        const cpu = this.props.data.cpu;
        const isSignalSelected = signal => this.state.selectedSignal && this.state.selectedSignal === signal;
        return (
            <div className="bus-view__bus-template">
                <h3>{template.name}
                    <button type="button"
                            className="edit-btn"
                            onClick={() => this.setState({isSelectingFunctionality: true})}>
                        Change
                    </button>
                </h3>
                <table>
                    <thead>
                    <tr>
                        <th>Signal</th>
                        <th>Assigned Net</th>
                        <th>{cpu ? 'CPU Ball' : ''}</th>
                        <th>{cpu ? 'Ball Mux' : ''}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        template.assignableSignals.map((s: ProvideSignal, i) => (
                            <tr key={i}
                                className={`assignable-signal-row ${isSignalSelected(s) ? 'selected-js' : ''}`}>
                                <td className="signal-name"
                                    onClick={event => this.onSelectSignal(event, s)}>
                                    {s.name}
                                </td>
                                <td className={`signal-value ${isSignalSelected(s) ? 'assigning-js' : ''}`}
                                    onClick={event => this.onSelectSignal(event, s)}
                                    ref={isSignalSelected(s) ? this.selectedSignalRef : null}>{s.getValue() ? s.getValue() : 'None'}</td>
                                <td>{s.getCpuBall() ? s.getCpuBall().trm_pin_name : ''}</td>
                                <td>{s.getBallMux() ? s.getBallMux().trm_signal : ''}</td>
                            </tr>
                            )
                        )
                    }
                    </tbody>
                </table>
                {this.state.selectedSignal &&
                <div className="signal-editor-container"
                     style={this.state.signalEditorPosition}
                     onClick={event => event.stopPropagation()}>
                    <SignalEditor signal={this.state.selectedSignal}
                                  onClickClose={() => this.setState({selectedSignal: null})}
                                  nets={this.props.data.nets}
                                  onAssignNet={() => this.setState({})}/>
                </div>}
            </div>
        );
    }

    private get templatePicker(): JSX.Element {
        const onConfirmTemplate = template => {
            this.state.busTemplates[0] = template;

            this.props.onUpdateBusTemplates([template]);

            this.setState({
                isSelectingFunctionality: false
            });
        };
        return (
            <div className="bus-template-picker-container">
                <BusTemplatePicker availableBusTemplates={this.props.availableBusTemplates}
                                   selectedTemplate={this.props.busTemplates[0]}
                                   onConfirmTemplate={onConfirmTemplate}
                                   onClickClose={() => this.setState({isSelectingFunctionality: false})}
                                   createTemplate={template => createEditableProvideTemplate(template, this.props.data.cpuBallNetMap)}/>
            </div>
        );
    }

    private onSelectSignal(event, signal: ProvideSignal): void {
        if (this.state.selectedSignal === signal) {
            this.setState({selectedSignal: null});
        } else {
            this.setState({selectedSignal: signal});
        }
        event.stopPropagation();
    }
}
