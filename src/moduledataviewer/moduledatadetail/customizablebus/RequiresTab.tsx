import {ModuleData} from "../ModuleData";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {BusGroupResource, BusResource} from "../../../bus/api";
import * as React from "react";
import {ReadonlyBus} from "./ReadonlyBus";
import {RequireBusEditor} from "./RequireBusEditor";


interface ModuleDataRequiresTabProps {
    isReadonly: boolean;
    data: ModuleData;
    availableBusTemplates: BusTemplate[];
}

interface ModuleDataRequiresTabState {
    busToView: BusResource | null;
}

export class ModuleDataRequiresTab extends React.Component<ModuleDataRequiresTabProps, ModuleDataRequiresTabState> {
    constructor(props) {
        super(props);
        this.state = {
            busToView: null
        };
    }

    componentWillReceiveProps(nextProps): void {
        if (this.props.data !== nextProps.data) {
            this.setState({
                busToView: null
            });
        }
    }

    render() {
        const type = 'Require'; // TODO
        const buses = this.props.data.requireBuses;
        return [
            <div key="require-tab-first-section" className="editable-data__bus-tab">
                <div className="add-bus-container row">
                    <h3>{type} Buses ({buses.length})</h3>
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
            this.requireBusDetailView
        ];
    }

    private get requireBusDetailView(): JSX.Element | null {
        if (!this.state.busToView) {
            return null;
        }
        if (this.props.isReadonly) {
            return (
                <div  key="require-tab-second-section"  className="editable-data__modal-container">
                    <ReadonlyBus bus={this.state.busToView}
                                 onCloseBusEditor={() => this.setState({busToView: null})}
                                 data={this.props.data}
                                 busType={'Require'}/>
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
            this.props.data.requireBuses.push(bus);
            this.props.data.requireBuses.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
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
            <div key="require-tab-second-section" className="editable-data__modal-container">
                <RequireBusEditor bus={this.state.busToView}
                                  data={this.props.data}
                                  nets={this.props.data.nets}
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

// Tab creation helpers shared with ProvidesTab.ts.

export function makeNewBusResource(): BusResource {
    return {
        id: null,
        name: '',
        power: null,
        milliwatts: 0,
        num_connections: 0,
        bus_group: null,
        efficiency: 0,
        address: null,
        levels: [],
        templates: [],
        exclusions: [],
        nets: [],
        priorities: []
    }
}

export function getBusItemView(b: BusResource,
                               onClick: () => void): JSX.Element {
    const efficiency = b['efficiency'] ? `@${b['efficiency']}` : ''; // !! Only available on EditableRequireBus.
    return (
        <tr key={b.name} onClick={onClick}>
            <td>{b.name}</td>
            <td>{b.bus_group.title} </td>
            <td>{b.power ? `${b.milliwatts} mW ${efficiency}` : `Data`}</td>
            <td>{b.templates.map(t => <span key={t.name} className="bus-template">{t.name}</span>)}</td>
        </tr>
    )
}
