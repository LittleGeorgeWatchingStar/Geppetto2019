import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {ConnectionResource} from "./api";
import {Connection} from "./Connection";

export class ConnectionCollection {
    private _connections: Connection[] = [];

    // Keeps track of which path should ignore which path.
    private _pathIgnoredUuidsTable: {[uuid: string]: string} = {};

    public get connections(): Connection[] {
        return this._connections.slice();
    }

    public get pathIgnoredUuidsTable(): {[uuid: string]: string} {
        return this._pathIgnoredUuidsTable;
    }

    public set pathIgnoredUuidsTable(ignoredUuidsTable: {[uuid: string]: string}) {
        this._pathIgnoredUuidsTable = ignoredUuidsTable;
    }

    public clear(): void {
        this._connections = [];
        this._pathIgnoredUuidsTable = {};
    }

    public add(connection: Connection): void {
        const duplicateConnection = this._connections.find(item => {
            // This is a DB unique constraint on the server.
            return item.requireBus === connection.requireBus &&
                item.requirer === connection.requirer;
        });
        if (!duplicateConnection) {
            this._connections.push(connection);
        }
    }

    /**
     * Initialize from server data.
     */
    public initializeFromResources(resources: ConnectionResource[],
                                   placed_modules: PlacedModule[]): void {
        for (const connection_resource of resources) {
            const requirer = placed_modules.find(pm => {
                return pm.uuid === connection_resource.requirer_uuid;
            });
            const provider = placed_modules.find(pm => {
                return pm.uuid === connection_resource.provider_uuid;
            });

            /* Silently fail to make connections where a module is missing. */
            if (requirer && provider) {
                const require = this.getRequireBus(requirer, connection_resource);
                const provide = this.getProvideBus(provider, connection_resource);

                /* Silently fail to connect modules where a bus is missing,
                 * or if the buses are incompatible. This can happen if a
                 * module has been upgraded. */
                if (this.canConnect(require, provide)) {
                    const connection = require.connect(provide);
                    this.add(connection);

                    // Set the path resource so that design revision can
                    // initialize them later.
                    if (connection_resource.path) {
                        connection.setResourcePath(connection_resource.path);
                    }
                    require.autoConnectVlogicPower();
                }
            }
        }
    }

    public remove(connection: Connection): void {
        const path = connection.path;
        if (path && this.pathIgnoredUuidsTable.hasOwnProperty(path.path.uuid)) {
            const otherUuid = this.pathIgnoredUuidsTable[path.path.uuid];
            delete this.pathIgnoredUuidsTable[path.path.uuid];
            delete this.pathIgnoredUuidsTable[otherUuid];
        }

        this._connections = this._connections.filter((item: Connection) =>
            item !== connection);
    }

    /**
     * Try to find the require bus for a connection. If the requiring
     * module has been upgraded, attempt to find the correct bus by
     * searching based on the bus title.
     */
    private getRequireBus(placed_module: PlacedModule,
                           connection_resource: ConnectionResource): RequireBus | null {
        let require = placed_module.getRequireById(connection_resource.require_bus);

        if (!require) {
            require = placed_module.findRequire(r =>
                r.name === connection_resource.require_bus_name);
        }

        return require;
    }

    /**
     * Try to find the provide bus for a connection. If the providing
     * module has been upgraded, attempt to find the correct bus by
     * searching based on the bus title.
     */
    private getProvideBus(provider: PlacedModule,
                           connection_resource: ConnectionResource): ProvideBus | null {
        let provide = provider.getProvideById(connection_resource.provide_bus);

        if (!provide) {
            provide = provider.findProvide(p =>
                p.name === connection_resource.provide_bus_name);
        }

        return provide;
    }

    /**
     * Ensures that the buses that used to be connected are still present
     * and compatible. They might not be if the modules in question have
     * been up-revved.
     */
    private canConnect(require: RequireBus | null,
                       provide: ProvideBus | null): boolean {
        return (require && provide
            // Don't re-establish VLOGIC connections from server data.
            && !require.implementsVlogicTemplate()
            && provide.isMatch(require)
        );
    }

    public toJSON() {
        return this._connections.map((connection: Connection) =>
            connection.toJSON());
    }

    public toString() {
        return this._connections.map((connection: Connection) =>
            connection.toString()).join();
    }
}
