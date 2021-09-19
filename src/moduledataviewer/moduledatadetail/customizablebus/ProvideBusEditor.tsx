import * as React from "react";
import {
    convertToEditableProvide,
    EditableProvideBus,
    ModuleData
} from "../ModuleData";
import {setBusType} from "./RequireBusEditor";
import {VoltageDomainEditor, VoltageDomainSetMode} from "./VoltageDomainEditor";
import {ProvideBusFunctionality} from "./ProvideBusFunctionality";
import {BusGroupResource, BusResource} from "../../../bus/api";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {EditableProvideTemplate} from "./EditableBusTemplate";
import {
    getProvideBusGateway,
    ProvideBusPatchData
} from "./BusGateway";
import {
    getVoltageDomainGateway,
    VoltageDomainData
} from "./VoltageDomainGateway";
import {RefObject} from "react";

interface ProvideBusEditorProps {
    bus: BusResource;
    data: ModuleData;
    voltageDomains: BusGroupResource[];
    availableBusTemplates: BusTemplate[];
    onCloseBusEditor: () => void;
    onSaveBus: (bus: BusResource) => void;
    onInsertBus: (bus: BusResource) => void;
    onInsertVoltageDomain: (voltageDomain: BusGroupResource) => void;
}

interface ProvideBusEditorState {
    isEditingVoltageDomain: boolean;

    busToEdit: EditableProvideBus;
}

/**
 * A view that allows editing the fields of a chosen Provide Bus.
 */
export class ProvideBusEditor extends React.Component<ProvideBusEditorProps, ProvideBusEditorState> {
    private readonly voltageDomainEditorRef: RefObject<VoltageDomainEditor>;

    constructor(props: ProvideBusEditorProps) {
        super(props);
        this.voltageDomainEditorRef = React.createRef<VoltageDomainEditor>();
        this.state = {
            isEditingVoltageDomain: props.bus.id === null,

            busToEdit: convertToEditableProvide(props.bus, this.props.data.cpuBallNetMap),
        };
    }

    render(): JSX.Element {
        const hasNoType = this.state.busToEdit.isPower === null;
        return (
            <section className="bus-editor">
                <div className="bus-editor__header-container">
                    <button type="button"
                            className='close-btn'
                            onClick={this.props.onCloseBusEditor}/>
                    <div className="row">
                        <h3>{this.heading}</h3>
                        {!hasNoType &&
                        <div>
                            <button type='button'
                                    className="save-btn cta"
                                    onClick={() => this.onClickSave()}>
                                Save Changes
                            </button>
                        </div>
                        }
                    </div>
                </div>
                {!hasNoType && this.busEditor}
                {hasNoType && this.whatKindOfBus}
            </section>
        );
    }
    private busToEditChangeHandler(event): void {
        const name = event.target.name;
        const type = event.target.type;
        const value = type === 'number' ? parseFloat(event.target.value) : event.target.value;

        const busToEdit = this.state.busToEdit;
        busToEdit[name] = value;
        this.setState({
            busToEdit: busToEdit,
        });
    }

    private onSelectVoltageDomain (voltageDomain: BusGroupResource): void {
        const busToEdit = this.state.busToEdit;
        busToEdit.voltageDomain = voltageDomain;
        this.setState({
            busToEdit: busToEdit,
        });
    }

    private get busEditor(): JSX.Element {
        const onUpdateBusTemplate = (busTemplates: EditableProvideTemplate[]) => {
            const busToEdit = this.state.busToEdit;
            busToEdit.busTemplates = busTemplates;
            this.setState({
                busToEdit: busToEdit,
            });
        };

        return (
            <div className="bus-editor__form">
                {this.nameFieldElement}
                <VoltageDomainEditor ref={this.voltageDomainEditorRef}
                                     voltageDomains={this.props.voltageDomains}
                                     selectedVoltageDomain={this.state.busToEdit.voltageDomain}
                                     onSelectVoltageDomain={v => this.onSelectVoltageDomain(v)}
                                     initialIsExpanded={this.state.busToEdit.id === null}/>
                {this.state.busToEdit.isPower && this.powerFieldElement}
                <section className={"bus-editor__functionality"}>
                    <ProvideBusFunctionality busTemplates={this.state.busToEdit.busTemplates}
                                             availableBusTemplates={this.filterAvailableTemplates()}
                                             data={this.props.data}
                                             onUpdateBusTemplates={onUpdateBusTemplate}/>
                </section>
            </div>
        )
    }

    /**
     * @return BusTemplate[] The bus templates that match the bus type,
     * eg. if it is a power bus, only show power bus templates.
     */
    private filterAvailableTemplates(): BusTemplate[] {
        return this.props.availableBusTemplates.filter(template => template.power === this.state.busToEdit.isPower);
    }

    private get heading(): string {
        const bus = this.state.busToEdit;
        const isBusUnsaved = null === bus.id;
        if (!isBusUnsaved) {
            return `Editing Provide: ${bus.name}`;
        }
        const isPower = this.state.busToEdit.isPower;
        if (isPower === null) {
            return '+ New Provide Bus';
        }
        return `+ New ${isPower ? 'Power' : 'Data'} Provide Bus`;
    }

    private get whatKindOfBus(): JSX.Element {
        return (
            <div className="bus-editor__type-selector">
                <div>What type of provide bus do you want to create?</div>
                <button type="button"
                        className="set-data-btn"
                        onClick={() => this.onClickBusType(false)}>
                    <h3>Data Bus</h3>
                    Provides data connections to other Buses. Example data sources may include GPIO or ADC.
                </button>
                <button type="button"
                        className="set-power-btn"
                        onClick={() => this.onClickBusType(true)}>
                    <h3>Power Bus</h3>
                    Provides power (mW) to other Buses. For example, this Bus may provide a 3.3V connection with a
                    capacity of 1000 mW.
                </button>
            </div>
        )
    }

    private get nameFieldElement(): JSX.Element {
        return (
            <section className="name-field">
                <div className="field-header required-input">Name</div>
                <input type='text'
                       placeholder='Bus name...'
                       name="name"
                       value={this.state.busToEdit.name}
                       onChange={event => this.busToEditChangeHandler(event)}/>
            </section>
        );
    }

    private get powerFieldElement(): JSX.Element {
        return (
            <section className="power-field">
                <span className="field-header required-input">Milliwatts</span>
                <br/>
                <input type="number"
                       min={0}
                       name="milliwatts"
                       value={this.state.busToEdit.milliwatts}
                       onChange={event => this.busToEditChangeHandler(event)}/>
            </section>
        );
    }

    private onClickBusType(isPower: boolean): void {
        setBusType(this.state.busToEdit, isPower);
        this.setState({}); // Force rerender
    }

    private onClickSave(): void {
        const busToEdit = this.state.busToEdit;

        const saveBus = () => {
            const nets = [];
            for (const busTemplate of busToEdit.busTemplates) {
                for (const signal of busTemplate.assignableSignals) {
                    nets.push({
                        netTemplate: signal.templateId,
                        value: signal.getValue(),
                    })
                }
            }

            const data: ProvideBusPatchData = {
                id: busToEdit.id,
                name: busToEdit.name,
                power: busToEdit.isPower,
                numConnections: busToEdit.numConnections,
                milliwatts: busToEdit.milliwatts,
                nets: nets,
                busGroup: this.state.busToEdit.voltageDomain.id,
            };

            if (busToEdit.id) {
                getProvideBusGateway().update(data).then(bus => {
                    this.props.onSaveBus(bus);
                    this.props.onCloseBusEditor();
                    // If we don't close the editor, we need to update BusToEdit
                });
            } else {
                getProvideBusGateway().insert(this.props.data.id, data).then(bus => {
                    this.props.onInsertBus(bus);
                    this.props.onCloseBusEditor();
                    // If we don't close the editor, we need to update BusToEdit
                });
            }
        };

        if (this.voltageDomainEditorRef.current.state.voltageDomainSetMode === VoltageDomainSetMode.CREATE_NEW) {
            const voltageDomainData: VoltageDomainData = {
                title: this.voltageDomainEditorRef.current.state.title,
                levels: this.voltageDomainEditorRef.current.state.levels,
            };
            getVoltageDomainGateway().insert(this.props.data.id, voltageDomainData)
                .then(voltageDomain => {
                    this.props.onInsertVoltageDomain(voltageDomain);
                    this.onSelectVoltageDomain(voltageDomain);
                    this.voltageDomainEditorRef.current.clearCreateNew();
                    saveBus();
                });
        } else {
            saveBus();
        }
    }
}
