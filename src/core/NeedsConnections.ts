/**
 * Placed modules and require buses need connections in order to "turn green".
 */
export interface NeedsConnections {
    /**
     * True if there are any provide buses on the board that this
     * module/require bus can connect to.
     */
    isReady(): boolean;

    /**
     * True if this module or require bus is fully connected.
     */
    isConnected(): boolean;
}

/**
 * @return A string describing the connection state of a require bus,
 * placed module, or any model that implements {NeedsConnections}.
 */
export type ConnectionState = 'connected' | 'ready' | 'unready';

/**
 * Returns the ConnectionState of the given model.
 */
export function getConnectionState(model: NeedsConnections): ConnectionState {
    if (model.isConnected()) {
        return 'connected';
    } else if (model.isReady()) {
        return 'ready';
    } else {
        return 'unready';
    }
}
