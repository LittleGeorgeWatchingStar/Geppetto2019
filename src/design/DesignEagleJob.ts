export const enum JobState {
    NONE = 'none',
    PENDING = 'pending',
    RUNNING = 'running',
    FAILED = 'failed',
    FINISHED = 'finished',
}

export class DesignEagleJob {
    private data: object;

    public constructor(data) {
        this.data = data;
    }

    public get jobState(): JobState {
        return this.data['state'];
    }

    public get output(): string | null {
        return this.data['output'];
    }

    /**
     * Returns a percentage
     */
    public get progress(): number {
        if (!this.output) {
            return 0;
        }
        const output: string = this.output;
        const outputLines = output.split('\n');
        for(let i = outputLines.length - 1; i >= 0; i--) {
            const outputLine = outputLines[i];
            if (outputLine.substring(0, 10) === 'progress: ') {
                const progressString = outputLine.substring(10);
                return parseFloat(progressString);
            }
        }
        return 0;
    }
}