import {RequireBus} from "bus/RequireBus";
import events from 'utils/events';
import {
    EXCLUSION_SET_NO_CONNECT_CLICK,
    REQUIRE_DOUBLE_CLICK,
    REQUIRE_NO_CONNECT_CLICK,
    SELECT_PROVIDE,
    SELECT_REQUIRE,
    SelectExclusionSetEvent,
    SelectProvideEvent,
    SelectRequireEvent
} from "../bus/events";
import {actions} from "../core/action";
import {AddNoConnection, FinishConnection, StartConnection} from "./actions";
import {AutoConnectEvent, CONNECTION_COMPLETE, ConnectionCompleteEvent} from "./events";
import {CANCEL_CONNECT} from "../workspace/events";
import {MODULE_INIT_BUSES, REMOVE_MODULE_FINISH} from "../module/events";
import {DesignController} from "../design/DesignController";
import {PlacedModule} from "../placedmodule/PlacedModule";

/**
 * The require bus that the user is currently trying to connect.
 */
let requireToConnect: RequireBus = null;

/**
 * If there is a single provide available, double clicking a require bus will connect it automatically.
 */
function findConnectionPair(event: SelectRequireEvent): void {
    const require = event.model;
    const validOptions = [];
    for (const pm of DesignController.getCurrentDesign().getPlacedModules()) {
        for (const option of pm.options) {
            if (option.canBeConnectedTo(require)) {
                validOptions.push(option);
            }
            if (validOptions.length > 1) {
                return;
            }
        }
    }
    if (validOptions.length === 1) {
        FinishConnection.addToStack(validOptions[0], require);
    }
}

function onRequireSelect(event: SelectRequireEvent): void {
    const selectedRequire = event.model;
    PlacedModule.setSelectedBusName(selectedRequire.name);
    // Prevent multiple requests if the same require has been selected.
    if (selectedRequire !== requireToConnect) {
        requireToConnect = selectedRequire;
        new StartConnection(selectedRequire).execute();
    }
}

function onProvideSelect(event: SelectProvideEvent): void {
    if (requireToConnect) {
        const provide = event.model;
        FinishConnection.addToStack(provide, requireToConnect);
    }
}

/**
 * When we are trying to auto-connect a dropped module that provides for a specific
 * require bus selected prior.
 */
function autoConnect(event: AutoConnectEvent): void {
    if (requireToConnect) {
        const provide = event.module.getCompatibleProvide(requireToConnect);
        if (provide) {
            // TODO the module may not have been added to the design by this point,
            // so the connection action, which performs a lookup of a design PM, cannot be used.
            // FinishConnection.addToStack(provide, requireToConnect);

            const currentDesign = requireToConnect.designRevision;
            currentDesign.connectPair(requireToConnect, provide);
            currentDesign.recomputeFromConnections();
            events.publishEvent(CONNECTION_COMPLETE, {
                require: requireToConnect
            } as ConnectionCompleteEvent);
        }
    }
}

/**
 * Clear the require to connect only if it was involved in the recent connection.
 */
function onConnectionComplete(event: ConnectionCompleteEvent): void {
    if (event.require === requireToConnect) {
        requireToConnect = null;
        event.require.designRevision.resetConnectingModules();
    }
}

function clearRequireToConnect(): void {
    if (requireToConnect) {
        requireToConnect.designRevision.resetConnectingModules();
        requireToConnect = null;
        events.publish(CANCEL_CONNECT);
    }
}

events.subscribe(REQUIRE_DOUBLE_CLICK, findConnectionPair);
actions.subscribe(REQUIRE_NO_CONNECT_CLICK,
    (event: SelectRequireEvent) => AddNoConnection.fromSelectRequireEvent(event));
actions.subscribe(EXCLUSION_SET_NO_CONNECT_CLICK,
    (event: SelectExclusionSetEvent) => AddNoConnection.fromSelectExclusionSetEvent(event));
events.subscribe(MODULE_INIT_BUSES, autoConnect);
events.subscribe(SELECT_PROVIDE, onProvideSelect);
events.subscribe(SELECT_REQUIRE, onRequireSelect);
events.subscribe(CONNECTION_COMPLETE, onConnectionComplete);
// TODO there's a conflict of responsibility between this and the library Panel.
events.subscribe(REMOVE_MODULE_FINISH, clearRequireToConnect);

export default {
    autoConnect: autoConnect,

    setRequireToConnect: function (requireBus: RequireBus): void {
        requireToConnect = requireBus;
    },
    getRequireToConnect: function (): RequireBus | null {
        return requireToConnect;
    },
    clearRequireToConnect: clearRequireToConnect
}
