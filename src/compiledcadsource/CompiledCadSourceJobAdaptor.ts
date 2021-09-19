import {CompiledCadSourceJobJson} from "./api";
import {CompiledCadSourceJob} from "./CompiledCadSourceJob";

export class CompiledCadSourceJobAdaptor {
    public fromJson(data: CompiledCadSourceJobJson): CompiledCadSourceJob {
        return new CompiledCadSourceJob(
            data.id,
            new Date(data.created),
            data.state,
            data.progress,
            data.download_url);
    }

    public fromJsonList(data: CompiledCadSourceJobJson[]): CompiledCadSourceJob[] {
        return data.map( jobData => {
            return this.fromJson(jobData);
        });
    }
}