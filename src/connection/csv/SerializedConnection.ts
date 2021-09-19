/**
 *  What uploaded csv connections are parsed to into.
 *  @see csvToSerializedConnections
 */
export interface SerializedConnection {
    from: string; // the provider name
    to: string; // the requirer name
    provide: string; // the provide bus name
    require: string; // the require bus name
}