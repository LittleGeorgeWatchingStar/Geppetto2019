import {ServerGateway} from "../core/ServerGateway";
import {ServerID} from "../model/types";
import {Module} from "./Module";
import {ProviderQueryResource, ProviderResources, RequireFilterResource} from "../bus/api";
import {SchematicInfo} from "../controller/Schematic";

export interface ModuleGateway {
    getCompatibleModules(params?: RequireFilterResource): JQuery.jqXHR<Module[]>;

    getRequirers(provideBus): JQuery.jqXHR<Module[]>;

    getDetailedModule(id: ServerID): JQuery.jqXHR<Module>;

    getDetailedModules(ids: ServerID[]): JQuery.jqXHR<Module[]>;

    getProviders(requires: RequireFilterResource[]): JQuery.jqXHR<{ [requireId: number]: Module[] }>;

    getSchematicInfo(id: ServerID): JQuery.jqXHR<SchematicInfo>;

}

export interface QueryRequirersResource {
    provide: ServerID; // ProvideBus ID
    amount: number;
}

class LibraryModuleGateway extends ServerGateway implements ModuleGateway {

    public getCompatibleModules(params?: RequireFilterResource): JQuery.jqXHR<Module[]> {
        return this.get(`/api/v3/module/library/`, params)
            .then(results => results.map(result => new Module(result))) as JQuery.jqXHR<Module[]>;
    }

    public getRequirers(params: QueryRequirersResource): JQuery.jqXHR<Module[]> {
        return this.get(`/api/v3/module/library/requirers/`, params)
            .then(results => results.map(result => new Module(result))) as JQuery.jqXHR<Module[]>;
    }

    public getProviders(requires: RequireFilterResource[],): JQuery.jqXHR<{ [requireId: number]: Module[] }> {
        return this.get(`/api/v3/module/library/providers/`, {
                requires: requires
            } as ProviderQueryResource)
            .then(results => {
                for (const requireId in results as ProviderResources) {
                    results[requireId] = results[requireId].map(resource => new Module(resource));
                }
                return results;
            }) as JQuery.jqXHR<{ [requireId: number]: Module[] }>;
    }

    public getDetailedModule(id: ServerID): JQuery.jqXHR<Module> {
        return this.get(`/api/v3/module/library/${id}/`)
            .then(data => new Module(data)) as JQuery.jqXHR<Module>;
    }

    /**
     * Given a list of module IDs, retrieve their detailed equivalents.
     */
    public getDetailedModules(ids: ServerID[]): JQuery.jqXHR<Module[]> {
        return this.get(`/api/v3/module/library/details/`, {ids: ids})
            .then(results => results.map(result => new Module(result)))  as JQuery.jqXHR<Module[]>;
    }

    public getSchematicInfo(id: ServerID): JQuery.jqXHR<SchematicInfo> {
        return this.get(`/api/v3/module/revisions/${id}/eagle/schematic/info/`) as JQuery.jqXHR<SchematicInfo>;
    }
}

export function getModuleGateway(): ModuleGateway {
    return new LibraryModuleGateway();
}
