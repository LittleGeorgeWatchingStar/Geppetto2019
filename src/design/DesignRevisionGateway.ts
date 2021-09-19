import {ServerGateway} from "../core/ServerGateway";
import {ServerID} from "../model/types";
import {DesignRevision} from "./DesignRevision";
import {Module} from "../module/Module";
import {SchematicInfo} from "../controller/Schematic";
import {DesignEagleJob, JobState} from "./DesignEagleJob";
import {CompiledCadSourceJob} from "../compiledcadsource/CompiledCadSourceJob";
import {CompiledCadSourceJobAdaptor} from "../compiledcadsource/CompiledCadSourceJobAdaptor";
import {getClient, HttpClient} from "../core/HttpClient";
import {
    UpverterEditorPayload,
    UpverterEditorTool
} from "../upverterviewer/UpverterEditorTab";

export function terminalState(state: JobState) {
    return [JobState.NONE, JobState.FAILED, JobState.FINISHED].indexOf(state) !== -1;
}

export interface DesignRevisionGateway {
    getDesignRevision(id: ServerID): JQuery.jqXHR<DesignRevision>;
    getDesignRevisionModules(id: ServerID): JQuery.jqXHR<Module[]>;
    getDesignRevisionSchematicStatus(id: ServerID): JQuery.jqXHR<DesignEagleJob>;
    postDesignRevisionSchematicJob(id: ServerID): JQuery.jqXHR<DesignEagleJob>;
    getDesignRevisionSchematicInfo(id: ServerID): JQuery.jqXHR<SchematicInfo>;

    getDesignRevisionCompiledCadJobs(id: ServerID): JQuery.jqXHR<CompiledCadSourceJob[]>;
    postDesignRevisionCompiledCadJob(id: ServerID): JQuery.jqXHR<CompiledCadSourceJob>;
    getDesignRevisionCompiledCadJob(id: ServerID, compiledCadJobId: string): JQuery.jqXHR<CompiledCadSourceJob>;

    getUpverterEditor(id: ServerID, tool: UpverterEditorTool): JQuery.jqXHR<UpverterEditorPayload>;
    getUpverterGerberZipUrl(id: ServerID): string;
}

class DefaultGateway extends ServerGateway implements DesignRevisionGateway {
    private httpText: HttpClient = getClient('text');

    public getDesignRevision(id: ServerID): JQuery.jqXHR<DesignRevision> {
        return this.get(`/api/v3/design/revision/${id}/`)
            .then(data => new DesignRevision(data)) as JQuery.jqXHR<DesignRevision>;
    }

    public getDesignRevisionModules(id: ServerID): JQuery.jqXHR<Module[]> {
        return this.get(`/api/v3/design/revision/${id}/module/library`)
            .then(results => results.map(result => new Module(result))) as JQuery.jqXHR<Module[]>;
    }

    public getDesignRevisionSchematicStatus(id: ServerID): JQuery.jqXHR<DesignEagleJob> {
        return this.get(`/api/v3/design/revision/${id}/eagle/`)
            .then(results => new DesignEagleJob(results)) as JQuery.jqXHR<DesignEagleJob>;
    }

    public postDesignRevisionSchematicJob(id: ServerID): JQuery.jqXHR<DesignEagleJob> {
        return this.post(`/api/v3/design/revision/${id}/eagle/generate/`)
            .then(results => new DesignEagleJob(results)) as JQuery.jqXHR<DesignEagleJob>;
    }

    public getDesignRevisionSchematicInfo(id: ServerID): JQuery.jqXHR<SchematicInfo> {
        return this.get(`/api/v3/design/revision/${id}/eagle/schematic/info/`) as JQuery.jqXHR<SchematicInfo>;
    }


    public getDesignRevisionCompiledCadJobs(id: ServerID): JQuery.jqXHR<CompiledCadSourceJob[]> {
        const adaptor = new CompiledCadSourceJobAdaptor();
        return this.get(`/api/v3/design/revision/${id}/compiled/`)
            .then(data => adaptor.fromJsonList(data)) as JQuery.jqXHR<CompiledCadSourceJob[]>;
    }

    public postDesignRevisionCompiledCadJob(id: ServerID): JQuery.jqXHR<CompiledCadSourceJob> {
        const adaptor = new CompiledCadSourceJobAdaptor();
        return this.post(`/api/v3/design/revision/${id}/compiled/`)
            .then(data => adaptor.fromJson(data)) as JQuery.jqXHR<CompiledCadSourceJob>;
    }

    public getDesignRevisionCompiledCadJob(id: ServerID, compiledCadJobId: string): JQuery.jqXHR<CompiledCadSourceJob> {
        const adaptor = new CompiledCadSourceJobAdaptor();
        return this.get(`/api/v3/design/revision/${id}/compiled/${compiledCadJobId}/`)
            .then(data => adaptor.fromJson(data)) as JQuery.jqXHR<CompiledCadSourceJob>;
    }


    /**
     * Note:
     *  - ServerGateway.get() only handles json responses.
     *  - Has auth handling, but no error handling.
     */
    public getUpverterEditor(id: ServerID, tool: UpverterEditorTool): JQuery.jqXHR<UpverterEditorPayload> {
        return this.httpText.get(`/api/v3/design/revision/${id}/upverter-cad-source/editor/?tool=${tool}`)
            .then(data => JSON.parse(data)) as JQuery.jqXHR<UpverterEditorPayload>;
    }

    public getUpverterGerberZipUrl(id: ServerID): string {
        return `/api/v3/design/revision/${id}/upverter-cad-source/gerber/`;
    }
}

export function getDesignRevisionGateway(): DesignRevisionGateway {
    return new DefaultGateway();
}
