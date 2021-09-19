import {ServerGateway} from "../../core/ServerGateway";
import {ServerID} from "../../model/types";
import {Module} from "../Module";
import eventDispatcher from "../../utils/events";
import {ModuleEvent, SKULESS_MODULE_SAVED} from "../events";
import * as Backbone from "backbone";

export interface SkulessModuleGateway {
    create(ModuleName: string, BaseModuleId: ServerID,): JQuery.jqXHR<Module>;
}

class DefaultGateway extends ServerGateway implements SkulessModuleGateway {
    public create(moduleName: string, baseModuleId: ServerID): JQuery.jqXHR<Module> {
        return this.postWithoutErrorHandling('/api/v3/module/skuless-modules/', {
            moduleName: moduleName,
            baseRevision: baseModuleId,
        }).then(data => new Module(data)) as JQuery.jqXHR<Module>;
    }
}

export function getSkulessModuleGateway(): SkulessModuleGateway {
    return new DefaultGateway();
}