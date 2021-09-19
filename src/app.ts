import {Library} from 'module/Library';
import {Workspace} from 'workspace/Workspace';
import * as Backbone from "backbone";
import {SystemSettings} from "./settings";

class GlobalState extends Backbone.Model {
    workspace: Workspace;
    library: Library;
    settings: SystemSettings;
    user;
    router;
}

/**
 * @deprecated
 */
export const app = new GlobalState();
