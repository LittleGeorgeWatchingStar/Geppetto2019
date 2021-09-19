import * as React from "react";
import {ServerID} from "../../../model/types";
import {SignalEditor} from "./SignalEditor";
import {BusTemplatePicker} from "./BusTemplatePicker";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import * as _ from "underscore";
import {createEditableRequireTemplate, EditableRequireTemplate} from "./EditableBusTemplate";
import {RequireSignal} from "./AssignableSignal";


interface RequireBusFunctionalityProps {
    availableBusTemplates: BusTemplate[];
    busTemplates: EditableRequireTemplate[];
    nets: string[];
    onUpdateBusTemplates: (busTemplates: EditableRequireTemplate[]) => void;
}

interface RequireBusFunctionalityState {
    selectedSignal: RequireSignal | null;
    signalEditorPosition: null | { left: string, top: string };
    busTemplates: EditableRequireTemplate[];
    removedTemplateIds: ServerID[];
    isAddingFunctionality: boolean;
}

/**
 * A view that allows adding functionality (Bus Templates) to an editable Require Bus.
 * Unlike Provide Buses, a Require Bus can have multiple templates.
 *
 * TODO BusTemplate deletions are staged, rather than altering the BusTemplates[] prop.
 * The deletions need to be filtered from busTemplates or something before the save request
 */
export class RequireBusFunctionality extends React.Component<RequireBusFunctionalityProps, RequireBusFunctionalityState> {
    private selectedSignalRef;

    constructor(props: RequireBusFunctionalityProps) {
        super(props);

        this.state = {
            selectedSignal: null,
            busTemplates: props.busTemplates.slice(),
            removedTemplateIds: [],
            isAddingFunctionality: false,
            signalEditorPosition: null
        };
        this.selectedSignalRef = React.createRef();
    }

    render(): JSX.Element {
        return (
            <div onClick={() => this.setState({selectedSignal: null})}>
                <span className="field-header required-input">Functionality</span>
                <br/>
                {this.state.busTemplates.map(t => this.getTemplateView(t))}
                {this.state.busTemplates.length === 0 &&
                <p>
                    <i>There is currently no functionality set on this bus.
                        Click + Add Functionality to get started.</i>
                </p>
                }
                {!this.state.isAddingFunctionality &&
                    <button type="button"
                            className="add-functionality-btn"
                            onClick={() => this.onClickAddFunctionality()}>
                        + Add Functionality
                    </button>
                }
                {this.state.isAddingFunctionality && this.templatePicker}
                {this.state.selectedSignal &&
                    <div className="signal-editor-container"
                         style={this.state.signalEditorPosition}
                         onClick={event => event.stopPropagation()}>
                        <SignalEditor signal={this.state.selectedSignal}
                                      onClickClose={() => this.setState({selectedSignal: null})}
                                      nets={this.props.nets}
                                      onAssignNet={() => this.setState({})}/>
                    </div>
                }
            </div>
        )
    }

    componentDidUpdate(prevProps: Readonly<RequireBusFunctionalityProps>,
                       prevState: Readonly<RequireBusFunctionalityState>): void {
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

    private getTemplateView(t: EditableRequireTemplate): JSX.Element {
        if (this.state.removedTemplateIds.some(id => id === t.id)) {
            return (
                <div className="bus-view__bus-template"
                     key={t.id}>
                    <div className="row">
                        <span className="removed-template-name">{t.name} - Removed</span>
                        <button className="restore-template-btn"
                                onClick={() => this.onClickRestoreTemplate(t.id)}>
                            Undo
                        </button>
                    </div>
                </div>
            )
        }
        return this.getEditableTemplate(t);
    }

    private getEditableTemplate(t: EditableRequireTemplate): JSX.Element {
        const isSignalSelected = signal => this.state.selectedSignal && this.state.selectedSignal === signal;
        return (
            <div className={`bus-view__bus-template`}
                 key={t.id}>
                <span className="template-name">{t.name}</span>
                <button type="button"
                        className="remove-btn"
                        onClick={() => this.onClickRemoveTemplate(t)}>
                    Remove
                </button>
                <table>
                    <thead>
                    <tr>
                        <th>Signal</th>
                        <th>Assigned Net</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        t.assignableSignals.map((s: RequireSignal, i) => (
                            <tr key={i}
                                className={`assignable-signal-row ${isSignalSelected(s) ? 'selected-js' : ''}`}
                                onClick={event => this.onSelectSignal(event, s)}>
                                <td className="signal-name">{s.name}</td>
                                <td className={`signal-value ${isSignalSelected(s) ? 'assigning-js' : ''}`}
                                    ref={isSignalSelected(s) ? this.selectedSignalRef : null}>
                                        {s.getValue() ? s.getValue() : 'None'}
                                </td>
                            </tr>
                            )
                        )
                    }
                    </tbody>
                </table>
            </div>
        );
    }
    private get templatePicker(): JSX.Element {
        const onConfirmTemplate = template => {
            const existingIndex = this.state.busTemplates.map(template => template.id).indexOf(template.id);
            if (existingIndex > -1) {
                this.state.busTemplates[existingIndex] = template;
            } else {
                this.state.busTemplates.push(template);
            }

            this.props.onUpdateBusTemplates(
                this.state.busTemplates.filter(busTemplate =>
                    this.state.removedTemplateIds.indexOf(busTemplate.id) < 0)
            );

            this.setState({
                isAddingFunctionality: false,
                removedTemplateIds: this.state.removedTemplateIds.filter(id => id !== template.id)
            });
        };
        const isRemoved = template => this.state.removedTemplateIds.some(id => id === template.id);
        const isInUse = template => this.state.busTemplates.some(t => t.id === template.id);
        const availableTemplates = this.props.availableBusTemplates.filter(t => isRemoved(t) || !isInUse(t));
        return (
            <div className="bus-template-picker-container">
                <BusTemplatePicker availableBusTemplates={availableTemplates}
                                   selectedTemplate={null}
                                   onConfirmTemplate={onConfirmTemplate}
                                   onClickClose={() => this.setState({isAddingFunctionality: false})}
                                   createTemplate={createEditableRequireTemplate}/>
            </div>
        );
    }

    private onClickAddFunctionality(): void {
        this.setState({
            selectedSignal: null,
            isAddingFunctionality: true
        });
    }

    private onClickRemoveTemplate(template: EditableRequireTemplate): void {
        this.state.removedTemplateIds.push(template.id);
        this.props.onUpdateBusTemplates(
            this.state.busTemplates.filter(busTemplate =>
                this.state.removedTemplateIds.indexOf(busTemplate.id) < 0)
        );
        this.setState({}); // Force rerender
    }

    private onClickRestoreTemplate(templateId: ServerID): void {
        const removedTemplateIds = this.state.removedTemplateIds.filter(id => id !== templateId);
        this.setState({
            removedTemplateIds: removedTemplateIds
        });
        this.props.onUpdateBusTemplates(
            this.state.busTemplates.filter(busTemplate =>
                removedTemplateIds.indexOf(busTemplate.id) < 0)
        );
    }

    private onSelectSignal(event, signal: RequireSignal): void {
        this.setState({
            selectedSignal: this.state.selectedSignal !== signal ? signal : null,
            isAddingFunctionality: false
        });
        event.stopPropagation();
    }
}
