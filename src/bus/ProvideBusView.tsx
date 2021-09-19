import 'utils/tooltip';

import * as $ from 'jquery';
import eventDispatcher from 'utils/events';
import ConnectionController from 'connection/ConnectionController';
import {ProvideBus} from "./ProvideBus";
import {PROVIDE_ERROR, ProvideErrorEvent, SELECT_PROVIDE} from "./events";
import events from "../utils/events";
import {DisconnectionWidgetOptions} from "../view/DisconnectionWidget";
import * as React from "react";
import {AddressSpace} from "./ReservableAddressSpace";


interface ProvideBusViewProps {
    bus: ProvideBus;
}

export class ProvideBusView extends React.Component<ProvideBusViewProps> {
    elementRef;

    constructor(props) {
        super(props);
        this.elementRef = React.createRef();
    }

    render() {
        const bus = this.props.bus;
        const currentlyConnected = bus.isCurrentlyConnected();
        const priority = bus.getBusPriority();
        return (
            <li ref={this.elementRef}
                data-test="provide-bus"
                className={this.classSelector}
                title={currentlyConnected ? 'Click to disconnect' : ''}
                onClick={() => this.onSelect()}
                onTouchEnd={() => this.onSelect()}>
                <a className="bus"
                   title={priority ? priority.message : ''}>
                    <span className={"bus-name"}>{bus.name}</span>
                    {priority && priority.emblem && priority.emblem.icon
                    && <img className="emblem"
                            src={priority.emblem.icon}
                            alt={''}/>
                    }
                </a>
            </li>
        )
    }

    componentDidMount(): void {
        this.updateDisabledTooltip();
    }

    componentWillUnmount(): void {
        $(this.elementRef.current).remove_tooltip();
    }

    private get classSelector(): string | null {
        if (this.props.bus.isCurrentlyConnected()) {
            return 'connected';
        }
        if (getReasonForDisabled(this.props.bus)) {
            return 'ui-state-disabled';
        }
        return null;
    }

    private onSelect(): void {
        if (null == getReasonForDisabled(this.props.bus) || this.props.bus.isCurrentlyConnected()) {
            eventDispatcher.publishEvent(SELECT_PROVIDE, {model: this.props.bus});
        } else {
            createError(this.props.bus, this.elementRef.current);
            $(this.elementRef.current).remove_tooltip();
        }
    }

    /**
     * Set a tooltip that explains why this bus is disabled.
     */
    private updateDisabledTooltip(): void {
        const reason = getReasonForDisabled(this.props.bus);
        if (reason && !this.props.bus.isCurrentlyConnected()) {
            $(this.elementRef.current).add_tooltip(reason, {
                my: 'left center',
                at: 'right center',
                hover: true,
                error: true
            });
        }
    }
}


function getReasonForDisabled(bus: ProvideBus): string | null {
    const require = ConnectionController.getRequireToConnect();
    const addressSpace = require
        ? require.getAddressSpace() : AddressSpace.empty();

    if (bus.hasStopPriority()) {
        const msg = bus.getPriorityMessage();
        return msg ? msg : 'These two buses are not compatible.';
    }

    if (bus.isExcluded()) {
        const other = bus.excludedBy.name;
        return `This bus cannot be used while ${other} is connected. <br> Click for more options.`;
    }

    if (!bus.isAddressSpaceAvailable(addressSpace) && !bus.isCurrentlyConnected()) {
        return "This bus requires a device address that is not available.";
    }

    if (!bus.hasEnoughCapacityFor(require)) {
        const msg = require
            ? `This module does not have enough capacity left to provide ${require.moduleName} with ${require.name}.`
            : 'This module is out of capacity.';
        return msg + ' <br> Click for more options.';
    }
    return null;
}

/**
 * Creates a dialog box pertaining to the error.
 */
function createError(bus: ProvideBus, target: HTMLElement): boolean {
    if (bus.isExcluded()) {
        publishError(exclusionError(bus), target);
        return true;
    } else if (!bus.hasEnoughCapacityFor(ConnectionController.getRequireToConnect())) {
        publishError(capacityError(bus), target);
        return true;
    }
    return false;
}

function publishError(error: DisconnectionWidgetOptions,
                      target: HTMLElement): void {
    events.publishEvent(PROVIDE_ERROR, {
        options: error,
        target: target
    } as ProvideErrorEvent);
}

function exclusionError(bus: ProvideBus): DisconnectionWidgetOptions {
    return {
        provideToDisconnect: bus.excludedBy,
        provideToConnect: bus,
        requireToConnect: ConnectionController.getRequireToConnect(),
        message: `${bus.name} cannot be used while ${bus.excludedBy.name} is connected.`,
        listHeader: 'Conflicts:'
    };
}

function capacityError(bus: ProvideBus): DisconnectionWidgetOptions {
    const busName = bus.name;
    const require = ConnectionController.getRequireToConnect();
    const message = require ?
        `${busName} doesn't have enough capacity to provide ${require.moduleName} with ${require.name}.` :
        `${busName} is out of capacity.`;

    return {
        provideToDisconnect: bus,
        provideToConnect: bus,
        requireToConnect: require,
        message: message,
        listHeader: 'Current connections:'
    };
}
