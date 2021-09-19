import {CpuGateway} from "../cpu/CpuGateway";
import {ModuleData} from "../ModuleData";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {BusGroupResource, BusResource} from "../../../bus/api";
import {ServerID} from "../../../model/types";
import * as React from "react";
import {Cpu} from "../cpu/Cpu";
import {ReadonlyBus} from "./ReadonlyBus";
import {ProvideBusEditor} from "./ProvideBusEditor";
import {getBusItemView, makeNewBusResource} from "./RequiresTab";

interface ModuleDataProvidesTabProps {
    cpuGateway: CpuGateway;
    isReadonly: boolean;
    data: ModuleData;
    availableBusTemplates: BusTemplate[];
}

interface ModuleDataProvidesTabState {
    busToView: BusResource | null;
    haveCpusLoaded: boolean;

    // The ID of the CPU that has been selected by the user. Or null, if the CPU is to be unassigned.
    cpuToChangeTo: ServerID | null;
    isConfirmingCpuChange: boolean;
}

export class ModuleDataProvidesTab extends React.Component<ModuleDataProvidesTabProps, ModuleDataProvidesTabState> {
    private cpus: Cpu[]; // TODO loading this should be higher in the hierarchy, otherwise it reloads every time this component is viewed.

    constructor(props) {
        super(props);
        this.cpus = [];
        this.state = {
            busToView: null,
            haveCpusLoaded: false,
            cpuToChangeTo: null,
            isConfirmingCpuChange: false
        };

        this.props.cpuGateway.getCpuList().then(cpus => {
            this.cpus = cpus;
            this.setState({
                haveCpusLoaded: true
            });
        });
    }

    componentWillReceiveProps(nextProps): void {
        if (this.props.data !== nextProps.data) {
            this.setState({
                busToView: null,
            });
        }
    }

    render() {
        const type = 'Provide'; // TODO
        const buses = this.props.data.provideBuses;
        return [
            <div className="editable-data__bus-tab" key={0}>
                <div className="add-bus-container row">
                    <h3>{type} Buses ({buses.length})</h3>
                    {this.props.isReadonly && this.props.data.cpu && <span>CPU: {this.props.data.cpu.name}</span>}
                    {!this.props.isReadonly && this.cpuSelectionView}
                    {!this.props.isReadonly &&
                    <button type="button"
                            className="add-bus-btn"
                            onClick={() => this.setState({busToView: makeNewBusResource()})}>
                        + New {type} Bus
                    </button>
                    }
                </div>
                <div className="table-container">
                    <table className="editable-data__bus-table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Voltage Domain</th>
                            <th>{type}s</th>
                            <th>Functionality</th>
                        </tr>
                        </thead>
                        <tbody>
                        {buses.map(b => getBusItemView(b, () => this.setState({busToView: b})))}
                        </tbody>
                    </table>
                </div>
            </div>,
            this.busDetailView,
            this.confirmChangeCpu()
        ];
    }

    private get cpuSelectionView(): JSX.Element {
        let defaultCpu = null;
        if (this.props.data.cpu && this.state.haveCpusLoaded) {
            defaultCpu = this.cpus.find(cpu => cpu.id === this.props.data.cpu.id);
        }
        return (
            <div className="cpu-container">
                <b>CPU</b>
                {!this.state.haveCpusLoaded && <span>Loading...</span>}
                {this.state.haveCpusLoaded && (
                    <select defaultValue={defaultCpu ? defaultCpu.id : null}
                            onChange={event => this.onChangeCpu(event)}>
                        <option value={null}>None</option>
                        {this.cpus.map(cpu => <option key={cpu.id} value={cpu.id}>{cpu.name}</option>)}
                    </select>
                )}
            </div>
        );
    }

    private onChangeCpu(event): void {
        if (!this.props.data.cpu) {
            // TODO apply the CPU without confirmation
        } else {
            this.setState({
                cpuToChangeTo: event.target.value,
                isConfirmingCpuChange: true
            });
        }
    }

    private confirmChangeCpu(): JSX.Element | null {
        if (!this.state.isConfirmingCpuChange) {
            return null;
        }
        const cancel = () => this.setState({
            cpuToChangeTo: null,
            isConfirmingCpuChange: false
        });
        const newCpu = this.cpus.find(c => c.id.toString() === this.state.cpuToChangeTo);
        return (
            <div className="editable-data__modal-container" key={2}>
                <div className="confirm-change-cpu confirmation-window">
                    <button type="button"
                            className="close-btn"
                            onClick={cancel}/>
                    <h3>Change CPU</h3>
                    {newCpu && <p>From: <b>{this.props.data.cpu.name}</b> to: <b>{newCpu.name}</b></p>}
                    {!newCpu && <p>Unassign <b>{this.props.data.cpu.name}</b></p>}
                    <p>Are you sure? This will clear all existing assignment mappings for your previous CPU.</p>
                    <button type="button"
                            className="cta"
                            onClick={cancel}>
                        Confirm
                    </button>
                </div>
            </div>
        )
    }

    private get busDetailView(): JSX.Element | null {
        if (!this.state.busToView) {
            return null;
        }
        if (this.props.isReadonly) {
            return (
                <div className="editable-data__modal-container" key={1}>
                    <ReadonlyBus bus={this.state.busToView}
                                 onCloseBusEditor={() => this.setState({busToView: null})}
                                 data={this.props.data}
                                 busType={'Provide'}/>
                </div>
            );
        }

        const onSaveBus = (bus: BusResource) => {
            // Very brittle, relies on using the same pointer to the buses in
            // the module in the library.
            Object.assign(this.state.busToView, bus);
            this.setState({});
        };

        const onInsertBus = (bus: BusResource) => {
            // Very brittle, relies on using the same pointer to the buses in
            // the module in the library.
            Object.assign(this.state.busToView, bus);
            this.props.data.provideBuses.push(bus);
            this.props.data.provideBuses.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
            this.setState({});
        };

        const onInsertVoltageDomain = (voltageDomain: BusGroupResource) => {
            // Very brittle, relies on using the same pointer to the voltage domains in
            // the module in the library.
            this.props.data.voltageDomains.push(voltageDomain);
            this.props.data.voltageDomains.sort((a, b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
            this.setState({});
        };

        return (
            <div className="editable-data__modal-container" key={1}>
                <ProvideBusEditor bus={this.state.busToView}
                                  data={this.props.data}
                                  voltageDomains={this.props.data.voltageDomains}
                                  onCloseBusEditor={() => this.setState({busToView: null})}
                                  availableBusTemplates={this.props.availableBusTemplates}
                                  onSaveBus={bus => onSaveBus(bus)}
                                  onInsertBus={bus => onInsertBus(bus)}
                                  onInsertVoltageDomain={v => onInsertVoltageDomain(v)}/>
            </div>
        );
    }
}
