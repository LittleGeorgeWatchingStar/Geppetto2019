import {ServerGateway} from "../../../core/ServerGateway";
import {Cpu, CpuBallToNetMappingsReturnData, PatchCpuBallToNetMappingsData} from "./Cpu";
import {ServerID} from "../../../model/types";


export class CpuGateway extends ServerGateway {

    getCpuList(): JQuery.jqXHR<Cpu[]> {
        return this.get(`/api/v3/pinmux/`) as JQuery.jqXHR<Cpu[]>;
    }

    public patchCpuBallToNetMappings(revisionId: ServerID,
                                     data: PatchCpuBallToNetMappingsData): JQuery.jqXHR<CpuBallToNetMappingsReturnData> {
        return this.patch(`${revisionId}/cpu-ball-to-net-mappings/`, data)
            .then(res => res) as JQuery.jqXHR<CpuBallToNetMappingsReturnData>;
    }
}
