import * as React from "react";
import {CustomerBus} from "../../CustomerBus";
import {Signal} from "../../Signal";
import {AssignableNet} from "../../AssignableNet";
import {AssignableNetGroup} from "../../AssignableNetGroup";
import {AssignableBusColours} from "./AssignableBusColours";
import {createDragShadow} from "../dragShadow";
import {CustomerModuleCreate} from "../../CustomerModuleCreate";


interface AssignableSignalsPanelProps {
    selectedBus: CustomerBus;
    busColours: AssignableBusColours;
    selectedGroup: AssignableNetGroup;
    selectedNet: AssignableNet | null;
    onSignalsChanged: () => void;
    onSignalDropped: (signal: Signal) => void;
    onMilliwattsChange: () => void;
    onRename: (bus: CustomerBus) => void;
    onDeleteBus: (bus: CustomerBus) => void;
    customerModuleCreate: CustomerModuleCreate;
    onSelectDomain: (domain: AssignableNetGroup) => void;
}

/**
 * A view that displays the currently selected Bus's signals. These signals can be assigned
 * to the selectedGroup's Nets.
 */
export function AssignableSignalsPanel(props: AssignableSignalsPanelProps): JSX.Element {
    const selectedBus = props.selectedBus;
    const owningDomain = props.customerModuleCreate.voltageDomains.find(domain => domain.ownsBus(selectedBus));
    const mandatorySignals = [];
    const otherSignals = [];
    selectedBus.getSignals().forEach(signal => {
        if (signal.mandatory) {
            mandatorySignals.push(signal);
        } else {
            otherSignals.push(signal);
        }
    });
    const isAssigned = (() => {
        if (!owningDomain) {
            return () => false;
        }
        const assignedSignals = {};
        owningDomain.filterNetsByBus(selectedBus).forEach(net => assignedSignals[net.signal.id] = true);
        return signal => assignedSignals[signal.id];
    })();
    const unassignedSignals = mandatorySignals.concat(otherSignals).filter(signal => !isAssigned(signal));

    function getAssignableSignals(): JSX.Element[] {
        const mandatorySignalNeedsAssignment = mandatorySignals.some(signal => !isAssigned(signal));
        const makeNode = (signal: Signal, disableCondition: boolean) => {
            if (disableCondition) {
                return makeDisabledSignalNode(signal);
            }
            return makeSignalNode(signal);
        };
        const elements = [
            <ul className="assignable-signals"
                key={0}>
                {mandatorySignals.map(signal => makeNode(signal, isAssigned(signal)))}
                {otherSignals.map(signal => makeNode(signal, mandatorySignalNeedsAssignment || isAssigned(signal)))}
            </ul>
        ];
        if (unassignedSignals.length > 1 && unassignedSignals.length <= props.selectedGroup.numOpenPins) {
            elements.push(
                <button className="add-all font-bold"
                        title="Automatically assign all remaining signals"
                        onClick={() => unassignedSignals.forEach(net => autoAssignNet(net))}
                        key={1}>
                    Add All
                </button>
            )
        }
        if (mandatorySignalNeedsAssignment) {
            elements.push(
                <div className="signal-error" key={2}>
                    Please assign required (<span className="required"/>) signals first.
                </div>
            );
        }
        return elements;
    }

    /**
     * A bus' signals can only be assigned to one domain.
     * If viewing a domain other than the one signals are assigned to, then signals should be disabled.
     */
    function getReadonlySignals(): JSX.Element[] {
        const title = "Signals unavailable: this bus is used by another domain. Unassign them from that domain first.";
        const elements = [
            <ul className="assignable-signals"
                title={title}
                key={1}>
                {mandatorySignals.concat(otherSignals).map(makeDisabledSignalNode)}
            </ul>
        ];
        if (unassignedSignals.length > 0) {
            elements.push(
                <div className="signal-error"
                     key={2}
                     title={title}>
                    Signals unavailable: this bus is used by another domain
                    (<span className="font-bold cta-link"
                           onClick={() => props.onSelectDomain(owningDomain)}>
                    {owningDomain.getPublicName()}
                     </span>).
                </div>
            );
        }
        return elements;
    }

    /**
     * Signals can be disabled because:
     * 1) They are already assigned
     * 2) A mandatory signal needs to be assigned first
     * 3) A signal has been assigned to a domain other than the one selected.
     */
    function makeDisabledSignalNode(signal: Signal): JSX.Element {
        return (
            <li key={signal.getId()}>
                <span className="bus-signal disabled-js"
                      style={{backgroundColor: props.busColours.getColour(selectedBus)}}>
                        <span className={`bus-signal-name${signal.mandatory ? ' required' : ''}`}
                              title={`${signal.getName()}${signal.mandatory ? ' (Required)' : ''}`}>
                            {signal.getName()}
                        </span>
                </span>
            </li>
        );
    }

    function makeSignalNode(signal: Signal): JSX.Element {
        return (
            <li key={signal.getId()}>
                <span className="bus-signal"
                      style={{backgroundColor: props.busColours.getColour(selectedBus)}}
                      onClick={() => autoAssignNet(signal)}
                      draggable={true}
                      onDragStart={createDragShadow}
                      onDragEnd={() => props.onSignalDropped(signal)}>
                        <span className={`bus-signal-name${signal.mandatory ? ' required' : ''}`}
                              title={`${signal.getName()}${signal.mandatory ? ' (Required)' : ''}`}>
                            {signal.getName()}
                        </span>
                </span>
            </li>
        );
    }

    function getPowerInput(): JSX.Element | null {
        if (!selectedBus.isPower) {
            return null;
        }
        let calculatedMw = null;
        if (owningDomain) {
            calculatedMw = owningDomain.calculateMaximumMilliwattsFor(selectedBus);
        }
        const onInputMw = event => {
            selectedBus.setMilliwatts(Math.min(calculatedMw, event.target.value));
            event.target.value = selectedBus.milliwatts;
            props.onMilliwattsChange();
        };
        const isPowerUnfulfilled = calculatedMw !== null && selectedBus.milliwatts === null;
        return (
            <div>
                <label className="power-input">
                    <input type="number"
                           data-test="powerInput"
                           className={isPowerUnfulfilled ? 'error' : ''}
                           disabled={!owningDomain}
                           onInput={onInputMw}
                           min={0}
                           max={calculatedMw}
                           value={selectedBus.milliwatts ? selectedBus.milliwatts.toString() : ''}
                           placeholder={calculatedMw !== null ? `0-${calculatedMw}` : ''}/> mW
                </label>
                {!owningDomain && <div className="signal-error">To enable mW, please assign the signal first.</div>}
            </div>
        );
    }

    function autoAssignNet(signal: Signal): void {
        const assign = (net: AssignableNet) => {
            net.assign(selectedBus, signal);
            props.onSignalsChanged();
        };
        const selectedNet = props.selectedNet;
        if (selectedNet && selectedNet.isAutoAssignable) {
            assign(selectedNet);
            return;
        }
        const net = props.selectedGroup.findNextAssignableNet(selectedBus);
        if (net) {
            assign(net);
        }
    }

    function getSignalsView(): JSX.Element[] {
        if (!owningDomain || owningDomain === props.selectedGroup) {
            return getAssignableSignals();
        }
        return getReadonlySignals();
    }

    const hasAssignedSignals = unassignedSignals.length < selectedBus.getSignals().length;
    return (
        <div className="wrapper">
            <button title={`Rename ${selectedBus.name}`}
                    className="rename bus-name"
                    onClick={() => props.onRename(selectedBus)}>
                {selectedBus.name}
            </button>
            <div>
                Signals ({unassignedSignals.length}/{selectedBus.getSignals().length})
            </div>
            {getSignalsView()}
            <div className="options">
                {hasAssignedSignals &&
                <button className="cta-link font-bold"
                        title="Unassign all signals from this bus"
                        onClick={() => {
                            if (owningDomain) {
                                owningDomain.removeAssignmentsFor(selectedBus);
                                props.onSignalsChanged();
                            }
                        }}>
                    Unassign All
                </button>
                }
                {!hasAssignedSignals && <span/>}
                <button className="remove-bus"
                        title="Delete this bus"
                        onClick={() => props.onDeleteBus(selectedBus)}/>
            </div>
            {getPowerInput()}
        </div>
    );
}
