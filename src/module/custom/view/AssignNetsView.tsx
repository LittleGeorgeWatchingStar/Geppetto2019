import * as React from "react";
import {CustomerModuleCreate} from "../CustomerModuleCreate";
import {BusTemplate} from "../BusTemplate";
import {AssignableNetGroup} from "../AssignableNetGroup";
import {AssignableBusColours} from "./voltagedomain/AssignableBusColours";
import {CustomerBus, CustomerBusType} from "../CustomerBus";
import {VoltageDomainView} from "./voltagedomain/VoltageDomainView";
import {CustomerBusesView} from "./CustomerBusesView";
import {RenameBusView} from "./RenameBusView";
import {BusTemplatePicker} from "./BusTemplatePicker";
import {AssignableNet} from "../AssignableNet";
import {BusTemplateGateway} from "../BusTemplateGateway";


interface AssignNetsReactViewProps {
    onClickNext: () => void;

    /**
     * This is what the user is trying to build.
     */
    customerModuleCreate: CustomerModuleCreate;

    /**
     * For querying the Bus choices that the user can add to their custom module.
     */
    busTemplateGateway: BusTemplateGateway;
}

interface AssignNetsReactViewState {
    selectedDomain: AssignableNetGroup;
    selectedBus: CustomerBus | null;

    /**
     * This value being set serves as a flag that a bus is being created.
     * The value determines whether the resultant bus will be a require or provide.
     */
    creatingBusType: CustomerBusType | null;

    /** Toggles the modal confirmation prompt for bus deletion. */
    busToDelete: CustomerBus | null;

    /**
     * If a mandatory signal is to be unassigned, the rest of the bus' signals must be removed along with it
     * because they aren't valid without the mandatory signal.
     * This toggles the modal confirmation prompt for removing all bus signals.
     */
    unassigningMandatory: AssignableNet | null;
    busToRename: CustomerBus | null;
    busTemplates: BusTemplate[];
    isLoading: boolean;
}


export class AssignNetsView extends React.Component<AssignNetsReactViewProps, AssignNetsReactViewState> {
    private readonly busColours: AssignableBusColours;

    constructor(props) {
        super(props);
        this.state = {
            selectedDomain: this.props.customerModuleCreate.voltageDomains[0],
            selectedBus: null,
            busToRename: null,
            creatingBusType: null,
            busToDelete: null,
            unassigningMandatory: null,
            busTemplates: [],
            isLoading: true
        };
        this.busColours = AssignableBusColours.of(this.props.customerModuleCreate);
    }

    render() {
        const voltageDomains = this.props.customerModuleCreate.voltageDomains;
        // The view gets pushed down depending on the existence of the domain nav bar. This compensates for it.
        const voltageDomainViewHeight = voltageDomains.length > 1 ? '94%' : '100%';
        return [
            <div className="tab-header" key={0}>
                <h3>Step 1: Create buses and assign pins</h3>
                <div>
                    <button className="next cta"
                            disabled={!this.canProceed()}
                            onClick={this.props.onClickNext}>
                        Next Step
                    </button>
                </div>
            </div>,
            <div className="tab-content" key={1}>
                <div className="assign-signals">
                    {voltageDomains.length > 1 &&
                    <div className="nav">
                        {voltageDomains.map(domain =>
                            <button className={this.state.selectedDomain === domain ? 'active-js' : ''}
                                    key={domain.id}
                                    onClick={() => this.onSelectDomain(domain)}>
                                <span className={!domain.isValid() ? 'required' : ''}>
                                    {domain.getPublicName()}
                                </span>
                            </button>
                        )}
                    </div>
                    }
                    <div style={{height: voltageDomainViewHeight}}>
                        {this.state.selectedDomain &&
                        <VoltageDomainView group={this.state.selectedDomain}
                                           busColours={this.busColours}
                                           customerModuleCreate={this.props.customerModuleCreate}
                                           busTemplates={this.state.busTemplates}
                                           onSelectDomain={domain => this.onSelectDomain(domain)}
                                           selectedBus={this.state.selectedBus}
                                           onSelectBus={bus => this.onSelectBus(bus)}
                                           onClickRenameBus={bus => this.onClickRename(bus)}
                                           onClickRemoveBus={bus => this.onClickRemoveBus(bus)}
                                           onChange={() => this.setState({})}
                                           onUnassignMandatory={net => this.openModal({unassigningMandatory: net})}
                        />
                        }
                        {this.getModalIfOpen()}
                    </div>
                </div>
                <CustomerBusesView busColours={this.busColours}
                                   onRemoveBus={bus => this.onClickRemoveBus(bus)}
                                   onCloneBus={bus => this.onConfirmCreateBus(bus.template, bus.type)}
                                   onClickBus={bus => this.onSelectBus(bus)}
                                   onClickAddBus={busType => this.onClickCreateBus(busType)}
                                   onRename={bus => this.onClickRename(bus)}
                                   selectedBus={this.state.selectedBus}
                                   customerModuleCreate={this.props.customerModuleCreate}
                />
            </div>
        ];
    }

    componentDidMount(): void {
        this.props.busTemplateGateway.getBusTemplates().done(
            (busTemplates: BusTemplate[]) => {
                this.setState({
                    busTemplates: busTemplates,
                    isLoading: false
                });
            });
    }

    private canProceed(): boolean {
        const customerModule = this.props.customerModuleCreate;
        return customerModule.voltageDomains.every(group => group.isValid()) &&
            undefined === customerModule.findUnassignedBus();
    }

    private getModalIfOpen(): JSX.Element | null {
        const modalBackground = innerNode => (
            <div className="editable-data__modal-container">
                {innerNode}
            </div>
        );
        if (this.state.busToRename) {
            return modalBackground(
                <RenameBusView bus={this.state.busToRename}
                               customerModuleCreate={this.props.customerModuleCreate}
                               onClose={() => this.setState({busToRename: null})}
                               onSave={name => this.onConfirmRenameBus(name)}/>);
        }
        if (this.state.creatingBusType) {
            return modalBackground(
                <BusTemplatePicker busTemplates={this.state.busTemplates}
                                   busType={this.state.creatingBusType}
                                   voltageDomainGroup={this.state.selectedDomain}
                                   onAddBus={template => this.onAddBus(template)}
                                   onClose={() => this.setState({creatingBusType: null})}
                                   isLoading={this.state.isLoading}/>);
        }
        if (this.state.busToDelete) {
            return modalBackground(this.getBusDeleteConfirmationModal());
        }
        if (this.state.unassigningMandatory) {
            return modalBackground(this.getClearBusConfirmationModal());
        }
        return null;
    }

    private getClearBusConfirmationModal(): JSX.Element {
        const close = () => this.setState({unassigningMandatory: null});
        const onConfirm = () => {
            this.state.selectedDomain.removeAssignmentsFor(net.bus);
            this.setState({});
            close();
        };
        const net = this.state.unassigningMandatory;
        return <ConfirmationModal close={close}
                                  title={`Remove ${net.bus.name} Signals?`}
                                  description={`${net.signalName} is needed for ${net.bus.name} to function. Deleting this Signal will
                            remove all the other assigned Signals of ${net.bus.name}.`}
                                  confirmationText={'Delete'}
                                  onConfirm={onConfirm}/>;
    }

    private getBusDeleteConfirmationModal(): JSX.Element {
        const bus = this.state.busToDelete;
        return <ConfirmationModal close={() => this.setState({busToDelete: null})}
                                  title={`Delete ${bus.type === CustomerBusType.REQUIRE ? 'Board Signal' : 'External Signal'} Bus "${bus.name}"?`}
                                  description={null}
                                  confirmationText={'Delete'}
                                  onConfirm={() => this.onConfirmRemoveBus(bus)}/>;
    }

    private onSelectDomain(domain: AssignableNetGroup): void {
        if (this.state.selectedDomain !== domain) {
            this.setState({selectedDomain: domain});
        }
    }

    private onSelectBus(bus: CustomerBus | null): void {
        if (!bus) {
            this.setState({selectedBus: null});
            return;
        }
        const owningDomain = this.props.customerModuleCreate.voltageDomains
            .find(domain => domain.ownsBus(bus));
        if (owningDomain) {
            this.setState({
                selectedBus: bus,
                selectedDomain: owningDomain
            });
        } else {
            this.setState({selectedBus: bus});
        }
    }

    private onConfirmRemoveBus(bus: CustomerBus): void {
        this.props.customerModuleCreate.removeBus(bus);
        if (this.state.selectedBus === bus) {
            this.setState({
                selectedBus: null,
                busToDelete: null
            });
        } else {
            this.setState({
                busToDelete: null
            });
        }
    }

    private onClickRemoveBus(bus: CustomerBus): void {
        this.openModal({busToDelete: bus});
    }

    /**
     * @param modalToOpen: React state that triggers the desired modal.
     * Only one modal should be open at once, so the other ones will be closed.
     */
    private openModal(modalToOpen: {[state: string]: any}): void {
        this.setState(Object.assign({
            busToDelete: null,
            creatingBusType: null,
            busToRename: null,
            unassigningMandatory: null
        }, modalToOpen) as any);
    }

    private onConfirmRenameBus(name: string): void {
        this.state.busToRename.name = name;
        this.setState({busToRename: null});
    }

    private onAddBus(busTemplate: BusTemplate): void {
        if (this.state.creatingBusType) {
            this.onConfirmCreateBus(busTemplate, this.state.creatingBusType);
        }
    }

    private onClickCreateBus(type: CustomerBusType): void {
        this.openModal({creatingBusType: type});
    }

    private onConfirmCreateBus(template: BusTemplate, type: CustomerBusType): void {
        const bus = this.props.customerModuleCreate.createBus(template, type);
        this.onSelectBus(bus);
        this.setState({creatingBusType: null});
    }

    private onClickRename(bus: CustomerBus): void {
        this.openModal({busToRename: bus});
    }
}

interface CustomModuleConfirmationModalProps {
    title: string;
    close: () => void;
    description: string | null;
    confirmationText: string;
    onConfirm: () => void;
}

function ConfirmationModal(props: CustomModuleConfirmationModalProps): JSX.Element {
    return (
        <div className="custom-module__confirm-modal">
            <div className="header-container">
                <h3>{props.title}</h3>
                <button className="close-btn"
                        onClick={props.close}/>
            </div>
            <div className="body-container">
                <div>
                    <p>{props.description}</p>
                    <div className="actions">
                        <button className="cta"
                                onClick={props.onConfirm}
                                data-test="confirmButton">
                            {props.confirmationText}
                        </button>
                        <button onClick={props.close}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
