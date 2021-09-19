import {AssignableNet} from "../../AssignableNet";
import {createDragShadow} from "../dragShadow";
import * as React from "react";
import {AssignableNetGroup} from "../../AssignableNetGroup";
import {openContext} from "../../../../view/ContextMenu";
import {CustomerBus} from "../../CustomerBus";
import {AssignableBusColours} from "./AssignableBusColours";
import {RefObject} from "react";

interface NetsTableProps {
    selectedDomain: AssignableNetGroup;
    onUnassignNet: (net: AssignableNet, unassignmentCallback: () => void) => void;
    selectedNet: AssignableNet | null;
    dropTargetNet: AssignableNet | null;
    mouseOverNet: AssignableNet | null;
    isDragging: boolean;
    onDrag: () => void;
    onMouseOverNet: (net: AssignableNet | null) => void;
    onDragOverNet: (net: AssignableNet | null) => void;
    onSelectNet: (net: AssignableNet) => void;
    onSelectBus: (bus: CustomerBus) => void;
    onDragEnd: (net: AssignableNet) => void;
    getNetViewRef: (net: AssignableNet) => RefObject<HTMLDivElement> | undefined;
    busColours: AssignableBusColours;
    isHighlightingNet: (net: AssignableNet) => boolean;
}

export function NetsTable(props: NetsTableProps): JSX.Element {

    function makeNetView(net: AssignableNet): JSX.Element {
        const selectors = ['net'];
        if (props.selectedNet === net) {
            selectors.push('selected-js');
        }
        if (props.isHighlightingNet(net)) {
            selectors.push('highlight');
        }
        return (
            <tr className={selectors.join(' ')}
                key={net.value}
                title={getNetTitleAttr(net)}>
                <td className="net-label-col">
                    <strong className="net-label">{net.value}</strong>
                </td>
                <td className="pin-col">
                    {makePin(net)}
                </td>
            </tr>
        );
    }

    function makePin(net: AssignableNet) {
        const onDragStart = event => {
            createDragShadow(event);
            props.onDrag();
        };
        const unassignNet = event => {
            props.onUnassignNet(net, () => net.unassign());
            event.stopPropagation(); // Do not select the net
        };
        const toggleGND = event => {
            net.toggleGround(!net.isGround);
            props.onDragOverNet(null);
            event.stopPropagation(); // Do not select the net
        };
        return (
            <div className="pin"
                 style={{backgroundColor: net.bus ? props.busColours.getColour(net.bus) : null}}
                 draggable={true}
                 onDragStart={onDragStart}
                 onMouseOver={() => props.onMouseOverNet(net)}
                 onMouseLeave={() => props.onMouseOverNet(null)}
                 onDragEnd={() => props.onDragEnd(net)}
                 onDragLeave={() => props.onDragOverNet(null)}
                 onDragOver={() => props.onDragOverNet(net)}
                 onClick={() => props.onSelectNet(net)}
                 onContextMenu={event => openNetContextMenu(net, event)}
                 data-test="pin"
                 ref={props.getNetViewRef(net)}>
                {net.bus && <span className="bus-name">{net.bus.name}</span>}
                <span className={getSignalNameSelectors(net)}>
                    {net.signalName}
                </span>
                {net.isAssigned &&
                <button className="remove"
                        onClick={unassignNet}/>}
                {!net.isAssigned && props.mouseOverNet === net && !props.isDragging &&
                <button className="gnd-toggle"
                        onClick={toggleGND}>
                    {net.isGround ? 'Unset' : 'GND'}
                </button>}
            </div>
        );
    }

    function openNetContextMenu(net: AssignableNet, event): void {
        const buttons = [];
        if (net.bus) {
            buttons.push({
                label: `Show ${net.bus.name} Signals`,
                selector: 'edit',
                callback: () => props.onSelectBus(net.bus)
            });
        }
        const toggleGround = isGround => {
            props.onUnassignNet(net, () => net.toggleGround(isGround));
        };
        if (!net.isGround) {
            buttons.push({
                label: `Set ${net.value} to GND`,
                selector: 'gnd',
                callback: () => toggleGround(true)
            });
        } else {
            buttons.push({
                label: 'Unset GND',
                selector: 'gnd',
                callback: () => toggleGround(false)
            });
        }
        openContext(event, buttons);
    }

    /**
     * preventDefault() on dragOver indicates this is a valid drop zone in Firefox.
     * Otherwise there is a distracting animation of the drop shadow reverting to its original location.
     */
    return (
        <table className="custom-module__nets"
               onDragOver={event => event.preventDefault()}>
            <tbody>
            {props.selectedDomain.getNets().map(makeNetView)}
            </tbody>
        </table>
    );
}

function getNetTitleAttr(net: AssignableNet): string {
    const title = [`${net.value}: ${net.signalName}`];
    if (net.isAssigned) {
        title.push(`on ${net.bus.name}`);
    }
    title.push('(Right-click for more options)');
    return title.join(' ');
}

function getSignalNameSelectors(net: AssignableNet): string {
    const selectors = [];
    if (net.isGround) {
        selectors.push('ground');
    } else if (!net.isAssigned) {
        selectors.push('unassigned');
    } else {
        selectors.push('signal-name');
        if (net.signal.mandatory) {
            selectors.push('required');
        }
    }
    return selectors.join(' ');
}
