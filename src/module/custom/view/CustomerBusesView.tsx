import * as React from "react";
import {CustomerBus, CustomerBusType} from "../CustomerBus";
import {AssignableBusColours} from "./voltagedomain/AssignableBusColours";
import {openContext} from "../../../view/ContextMenu";
import {CustomerModuleCreate} from "../CustomerModuleCreate";
import {AssignableNetGroup} from "../AssignableNetGroup";

interface CustomerBusesViewProps {
    customerModuleCreate: CustomerModuleCreate;
    busColours: AssignableBusColours;
    onRemoveBus: (bus: CustomerBus) => void;
    onCloneBus: (bus: CustomerBus) => void;
    onClickBus: (bus: CustomerBus) => void;
    onClickAddBus: (busType: CustomerBusType) => void;
    onRename: (bus: CustomerBus) => void;
    selectedBus: CustomerBus | null;
}

/**
 * A view that aggregates all CustomerBuses on a CustomModule.
 * Users can add, delete, or edit a CustomerBus from here.
 */
export function CustomerBusesView(props: CustomerBusesViewProps): JSX.Element {
    const requireBuses = props.customerModuleCreate.requires;
    const provideBuses = props.customerModuleCreate.provides;
    const numBuses = requireBuses.length + provideBuses.length;
    const isIncompleteBus = checkIsIncompleteBus(props.customerModuleCreate.voltageDomains);

    function makeBusBox(bus: CustomerBus): JSX.Element {
        const selectors = ["bus-list-item"];
        if (props.selectedBus === bus) {
            selectors.push("selected-js");
        } else if (isIncompleteBus(bus)) {
            selectors.push("invalid-js");
        }
        return (
            <div className={selectors.join(' ')}
                 key={bus.uuid}
                 onClick={() => props.onClickBus(bus)}
                 onContextMenu={event => onContextMenu(event, bus)}
                 data-test="bus">
                <div className="card-background"/>
                <div className="name">
                    <button className="close-btn"
                            data-test="deleteBusButton"
                            onClick={event => onClickRemoveBus(event, bus)}/>
                    <div className="colour-icon"
                         style={{backgroundColor: props.busColours.getColour(bus)}}/>
                    {bus.name}
                </div>
            </div>
        );
    }

    function onClickRemoveBus(event, bus: CustomerBus): void {
        props.onRemoveBus(bus);
        event.stopPropagation(); // Do not select bus
    }

    function onContextMenu(event, bus: CustomerBus): void {
        const buttons = [
            {
                label: `Rename ${bus.name}`,
                selector: 'rename',
                callback: () => props.onRename(bus)
            },
            {
                label: `Copy ${bus.template.name}`,
                selector: 'copy',
                callback: () => props.onCloneBus(bus)
            }
        ];
        openContext(event, buttons);
    }

    return (
        <div className="custom-module__buses-container">
            <div className="wrapper">
                <div className="board-signals-container">
                    <h4 className="bus-list-header">
                        Board Signals
                        <div className="custom-bus-tooltip">
                            <span className="custom-bus-tooltip-content">
                                Add a bus that exposes signals from the board to pins on this header.
                            </span>
                        </div> : ({requireBuses.length})
                        <button className="add-bus-btn"
                                onClick={() => props.onClickAddBus(CustomerBusType.REQUIRE)}
                                data-test="createRequireButton"
                                disabled={numBuses === props.customerModuleCreate.maxBuses}>
                            Add Bus
                        </button>
                    </h4>
                    <div>
                        {requireBuses.map(bus => makeBusBox(bus))}
                        {requireBuses.length === 0 &&
                        <p className="font-italic">
                            Buses that expose signals from the board to pins.
                        </p>}
                    </div>
                </div>
                <div className="external-signals-container">
                    <h4 className="bus-list-header">
                        External Signals
                        <div className="custom-bus-tooltip">
                            <span className="custom-bus-tooltip-content">
                                Add a bus that exposes power from an external source to the board via pins on this header.
                            </span>
                        </div> : ({provideBuses.length})
                        <button className="add-bus-btn"
                                onClick={() => props.onClickAddBus(CustomerBusType.PROVIDE)}
                                data-test="createProvideButton"
                                disabled={numBuses === props.customerModuleCreate.maxBuses}>
                            Add Bus
                        </button>
                    </h4>
                    <div>
                        {provideBuses.map(bus => makeBusBox(bus))}
                        {provideBuses.length === 0 &&
                        <p className="font-italic">
                            Pins that draw power from an external source.
                        </p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Returns a function that checks if a particular bus is incomplete.
 */
function checkIsIncompleteBus(voltageDomains: AssignableNetGroup[]): (bus: CustomerBus) => boolean {
    const assignedBuses = {} as { [uuid: string]: CustomerBus };
    for (const domain of voltageDomains) {
        Object.assign(assignedBuses, domain.findAssignedBuses());
    }
    const needsPower = {};
    for (const uuid of Object.keys(assignedBuses)) {
        const bus = assignedBuses[uuid];
        if (bus.isPower && bus.milliwatts === null) {
            needsPower[uuid] = true;
        }
    }
    return (bus: CustomerBus) => !assignedBuses[bus.uuid] || needsPower[bus.uuid];
}
