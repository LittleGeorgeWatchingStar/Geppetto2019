import * as React from "react";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {EditableBusTemplate} from "./EditableBusTemplate";

interface BusTemplatePickerProps {
    availableBusTemplates: BusTemplate[];
    selectedTemplate: EditableBusTemplate | null;
    onConfirmTemplate: (template: EditableBusTemplate) => void;
    createTemplate: (template: BusTemplate) => EditableBusTemplate;
    onClickClose: () => void;
}

interface BusTemplatePickerState {
    selectedTemplate: EditableBusTemplate | null;
}

/**
 * A view that allows the user to add a BusTemplate to a Require Bus,
 * or set the BusTemplate on a Provide Bus.
 * TODO allow transfer signal assignments and auto-assignments like on GEng
 */
export class BusTemplatePicker extends React.Component<BusTemplatePickerProps, BusTemplatePickerState> {

    constructor(props) {
        super(props);
        this.state = {
            selectedTemplate: this.props.selectedTemplate
        };
    }

    render() {
        const selectedTemplate = this.state.selectedTemplate;
        return (
            <section className="bus-template-picker">
                <button type="button"
                        onClick={this.props.onClickClose}
                        className="close-btn"/>
                <div className="row">
                    <div>
                        <h4>Choose Functionality</h4>
                        <ul className="template-list">
                            {this.props.availableBusTemplates.map(template =>
                                <li onClick={() => this.onClickTemplate(template)}
                                    className={this.isSelectedTemplate(template) ? 'selected-js' : ''}>
                                    {template.name}
                                </li>
                            )}
                        </ul>
                    </div>
                    <div className="preview">
                        <div className="preview-header-container">
                            <div className="preview-header">{selectedTemplate ? selectedTemplate.name : ''}</div>
                            {this.numSignalsLabel}
                            {!selectedTemplate &&
                            <div>
                                Select a Template on the left to preview its Signals. Templates form the functionality
                                of a Bus.
                            </div>}
                        </div>
                        {selectedTemplate &&
                        <ul className="signals-list">
                            {selectedTemplate.assignableSignals.map(s =>
                                <li>{s.name}</li>
                            )}
                        </ul>
                        }
                        <div>
                            <button type="button"
                                    className="cta select-template-btn"
                                    disabled={!selectedTemplate}
                                    onClick={() => this.props.onConfirmTemplate(selectedTemplate)}>
                                Select Template
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    private get numSignalsLabel(): JSX.Element | null {
        const selectedTemplate = this.state.selectedTemplate;
        if (!selectedTemplate) {
            return null;
        }
        return (
            <span className="num-signals">
                {selectedTemplate.assignableSignals.length} {selectedTemplate.assignableSignals.length === 1 ? 'Signal' : 'Signals'}
            </span>
        );
    }

    private isSelectedTemplate(template: BusTemplate): boolean {
        return this.state.selectedTemplate && this.state.selectedTemplate.id === template.id;
    }

    private onClickTemplate(template: BusTemplate): void {
        this.setState({
            selectedTemplate: this.props.createTemplate(template)
        });
    }
}
