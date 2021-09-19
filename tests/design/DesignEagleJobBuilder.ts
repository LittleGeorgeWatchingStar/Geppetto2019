import {DesignEagleJob, JobState} from "../../src/design/DesignEagleJob";

export class DesignEagleJobBuilder {
    private jobState: JobState;
    private output: string | null;

    constructor() {
        this.jobState = JobState.FINISHED;
        this.output = `progress: 0\nprogress: 50\nprogress: 100`;
    }

    public withJobState(jobstate: JobState): this {
        this.jobState = jobstate;
        return this;
    }

    public withOutput(output: (string | null)): this {
        this.output = output;
        return this;
    }

    public build() {
        return new DesignEagleJob({
            state: this.jobState,
            output: this.output,
        });
    }
}