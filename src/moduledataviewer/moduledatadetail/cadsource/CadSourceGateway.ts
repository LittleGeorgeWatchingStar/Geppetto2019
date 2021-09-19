import {ServerGateway} from "../../../core/ServerGateway";
import {ServerID} from "../../../model/types";
import {CadSource} from "./CadSource";
import {convertSplitPartToPart, Part, SplitPart} from "../part/Part";
import {UpverterEditorTool} from "../../../upverterviewer/UpverterEditorTab";
import {getClient, HttpClient} from "../../../core/HttpClient";

export interface CadSourceGateway {
    getNetList(cadSourceId: ServerID): JQuery.jqXHR<string[]>;

    getPartList(cadSourceId: ServerID): JQuery.jqXHR<Part[]>;

    refreshCache(cadSourceId: ServerID): JQuery.jqXHR<{ nets: string[], parts: Part[] }>;

    getEditor(cadSourceId: ServerID, tool: UpverterEditorTool, isReadonly: boolean): JQuery.jqXHR<string>;

    getUpverterCadSource(moduleRevisionId: ServerID): JQuery.jqXHR<CadSource>;
}

class DefaultGateway extends ServerGateway implements CadSourceGateway {
    private httpText: HttpClient = getClient('text');

    public getNetList(cadSourceId: ServerID): JQuery.jqXHR<string[]> {
        return this.get(`/api/v3/cad-source/${cadSourceId}/net-list/`) as JQuery.jqXHR<string[]>;
    }

    public getPartList(cadSourceId: ServerID): JQuery.jqXHR<Part[]> {
        return this.get(`/api/v3/cad-source/${cadSourceId}/part-list/`)
            .then((splitParts: SplitPart[]) => convertSplitPartToPart(splitParts)) as JQuery.jqXHR<Part[]>;
    }

    public refreshCache(cadSourceId: ServerID): JQuery.jqXHR<{ nets: string[], parts: Part[] }> {
        return this.post(`/api/v3/cad-source/${cadSourceId}/refresh-cache/`)
            .then((result: { nets: string[], parts: SplitPart[] }) => {
                return {
                    nets: result.nets,
                    parts: convertSplitPartToPart(result.parts),
                };
            }) as JQuery.jqXHR<{ nets: string[], parts: Part[] }>
    }

    public getUpverterCadSource(moduleRevisionId: ServerID): JQuery.jqXHR<CadSource> {
        const xhr = this.getWithoutErrorHandling(`/api/v3/cad-source/module-revision/${moduleRevisionId}/upverter/`);
        return this.withNoUpverterCadSourceHandling(moduleRevisionId, xhr);
    }

    public getEditor(cadSourceId: ServerID, tool: UpverterEditorTool, isReadonly: boolean): JQuery.jqXHR<string> {
        return this.httpText.get(`/api/v3/cad-source/${cadSourceId}/editor/?tool=${tool}&readonly=${isReadonly}`);
    }

    private withNoUpverterCadSourceHandling(moduleRevisionId: ServerID,
                                            xhr: JQuery.jqXHR): JQuery.jqXHR<CadSource> {
        const def = $.Deferred();
        xhr.done((data, textStatus, jqXHR) => {
            this.doneHandler(def, data, textStatus, jqXHR);
        }).fail((jqXHR, textStatus, errorThrown) => {
            this.getUpverterCadSourceFailHandler(
                moduleRevisionId,
                def,
                jqXHR,
                textStatus,
                errorThrown)
        });
        return def.promise() as JQuery.jqXHR<CadSource>;
    }

    private getUpverterCadSourceFailHandler(moduleRevisionId: ServerID,
                                            def: JQuery.Deferred<any>,
                                            jqXHR: JQuery.jqXHR,
                                            textStatus: string,
                                            errorThrown): void {
        if (jqXHR.status === 404) {
            this.generateUpverter(moduleRevisionId).then(() => {
                this.get(`/api/v3/cad-source/module-revision/${moduleRevisionId}/upverter/`)
                    .done(def.resolve)
                    .fail(def.reject);
            }).fail(def.reject);
        } else {
            def.reject();
            this.failHandler(def, jqXHR, textStatus, errorThrown);
        }
    }

    private generateUpverter(moduleRevisionId: ServerID): JQuery.jqXHR {
        return this.post(`/api/v3/cad-source/module-revision/${moduleRevisionId}/generate-upverter/`);
    }
}

export function getCadSourceGateway(): CadSourceGateway {
    return new DefaultGateway();
}



