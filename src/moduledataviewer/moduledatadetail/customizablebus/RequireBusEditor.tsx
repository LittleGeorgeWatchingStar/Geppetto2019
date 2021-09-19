import * as React from "react";
import {RefObject} from "react";
import {VoltageDomainEditor, VoltageDomainSetMode} from "./VoltageDomainEditor";
import {RequireBusFunctionality} from "./RequireBusFunctionality";
import {
    convertToEditableRequire,
    EditableBus,
    EditableRequireBus,
    ModuleData
} from "../ModuleData";
import {BusGroupResource, BusResource} from "../../../bus/api";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {getRequireBusGateway, RequireBusPatchData} from "./BusGateway";
import {EditableRequireTemplate} from "./EditableBusTemplate";
import {
    getVoltageDomainGateway,
    VoltageDomainData
} from "./VoltageDomainGateway";


interface RequireBusEditorProps {
    bus: BusResource;
    data: ModuleData;
    nets: string[];
    voltageDomains: BusGroupResource[];
    availableBusTemplates: BusTemplate[];
    onCloseBusEditor: () => void;
    onSaveBus: (bus: BusResource) => void;
    onInsertBus: (bus: BusResource) => void;
    onInsertVoltageDomain: (voltageDomain: BusGroupResource) => void;
}

interface RequireBusEditorState {
    isEditingVoltageDomain: boolean;

    busToEdit: EditableRequireBus;
}

export class RequireBusEditor extends React.Component<RequireBusEditorProps, RequireBusEditorState> {
    private readonly voltageDomainEditorRef: RefObject<VoltageDomainEditor>;

    constructor(props: RequireBusEditorProps) {
        super(props);
        this.voltageDomainEditorRef = React.createRef<VoltageDomainEditor>();
        this.state = {
            isEditingVoltageDomain: props.bus.id === null,

            busToEdit: convertToEditableRequire(props.bus),
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
        const onUpdateBusTemplate = (busTemplates: EditableRequireTemplate[]) => {
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
                    <RequireBusFunctionality busTemplates={this.state.busToEdit.busTemplates}
                                             nets={this.props.nets}
                                             availableBusTemplates={this.filterAvailableTemplates()}
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
        const bus = this.props.bus;
        const isBusUnsaved = null === bus.id;
        if (!isBusUnsaved) {
            return `Editing Require: ${bus.name}`;
        }
        const isPower = this.state.busToEdit.isPower;
        if (isPower === null) {
            return '+ New Require Bus';
        }
        return `+ New ${isPower ? 'Power' : 'Data'} Require Bus`;
    }

    private get whatKindOfBus(): JSX.Element {
        return (
            <div className={"bus-editor__type-selector"}>
                <div>What type of require bus do you want to create?</div>
                <button type={"button"}
                        className="set-data-btn"
                        onClick={() => this.onClickBusType(false)}>
                    <h3>Data Bus</h3>
                    Receives a data connection from another Bus. Example data requirements may include I2C and RESET.
                </button>
                <button type={"button"}
                        className="set-power-btn"
                        onClick={() => this.onClickBusType(true)}>
                    <h3>Power Bus</h3>
                    Requires power (mW) from another Bus. For example, this Bus may require a 3.3V connection that
                    provides at least 33 mW.
                </button>
            </div>
        )
    }

    private get nameFieldElement(): JSX.Element {
        return (
            <section className={"name-field"}>
                <div className="field-header required-input">Name</div>
                <input type="text"
                       placeholder="Bus name..."
                       name="name"
                       value={this.state.busToEdit.name}
                       onChange={event => this.busToEditChangeHandler(event)}/>
            </section>
        );
    }

    private get powerFieldElement(): JSX.Element {
        return (
            <section className={"power-field"}>
                <div className="row">
                    <div>
                        <span className="field-header required-input">Milliwatts</span>
                        <br/>
                        <input type="number"
                               min={0}
                               name="milliwatts"
                               value={this.state.busToEdit.milliwatts}
                               onChange={event => this.busToEditChangeHandler(event)}/>
                    </div>
                    <div>
                        <span className="field-header required-input">Efficiency (0.00 - 1.00)</span>
                        <br/>
                        <input type="number"
                               min={0}
                               max={1}
                               step={0.01}
                               name="efficiency"
                               value={this.state.busToEdit.efficiency}
                               onChange={event => this.busToEditChangeHandler(event)}/>
                    </div>
                </div>
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

            const data: RequireBusPatchData = {
                id: busToEdit.id,
                name: busToEdit.name,
                power: busToEdit.isPower,
                numConnections: busToEdit.numConnections,
                milliwatts: busToEdit.milliwatts,
                nets: nets,
                busGroup: this.state.busToEdit.voltageDomain.id,
                efficiency: busToEdit.efficiency,
            };

            if (busToEdit.id) {
                getRequireBusGateway().update(data).then(bus => {
                    this.props.onSaveBus(bus);
                    this.props.onCloseBusEditor();
                    // If we don't close the editor, we need to update BusToEdit
                });
            } else {
                getRequireBusGateway().insert(this.props.data.id, data).then(bus => {
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


export function setBusType(bus: EditableBus, isPower: boolean): void {
    bus.isPower = isPower;
    if (!isPower) {
        bus.numConnections = 1; // This is hidden from the user.
        bus.milliwatts = 0;
    } else {
        bus.numConnections = 0;
    }
}
