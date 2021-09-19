import {
    CompiledCadSourceJob,
    CompiledCadSourceJobState
} from "../../src/compiledcadsource/CompiledCadSourceJob";

export class CompiledCadSourceJobBuilder {
    private id: string;
    private created: Date;
    private state: CompiledCadSourceJobState;
    private progress: number;
    private downloadUrl: string | null;

    constructor() {
        this.id = 'uuid';
        this.state = CompiledCadSourceJobState.FINISHED;
        this.progress = 100;
        this.downloadUrl = 'https://i.am.rick.james/bitch/'
    }

    public withCreated(created: Date): this {
        this.created = created;
        return this;
    }

    public withState(state: CompiledCadSourceJobState): this {
        this.state = state;
        return this;
    }

    public withProgress(progress: number): this {
        this.progress = progress;
        return this;
    }

    public withDownloadUrl(downloadUrl: string | null): this {
        this.downloadUrl = downloadUrl;
        return this;
    }

    public build() {
        return new CompiledCadSourceJob(
            this.id,
            this.created,
            this.state,
            this.progress,
            this.downloadUrl
        );
    }
}