export enum CompiledCadSourceJobState {
    NEW = 'new',
    PENDING = 'pending',
    CANCELED = 'canceled',
    RUNNING = 'running',
    FINISHED = 'finshied',
    FAILED = 'failed',
    TERMINATED = 'terminated',
    INCOMPLETE = 'incomplete',
}

/**
 * Immutable class, new instances are fetched via gateway.
 */
export class CompiledCadSourceJob {
    private _id: string; // UUID

    private _created: Date;

    private _state: CompiledCadSourceJobState;

    private _progress: number;

    private _downloadUrl: string | null;

    public constructor(id: string,
                       created: Date,
                       state: CompiledCadSourceJobState,
                       progress: number,
                       downloadUrl: string | null) {
        this._id = id;
        this._created = created;
        this._state = state;
        this._progress = progress;
        this._downloadUrl = downloadUrl;
    }

    public get id(): string  {
        return this._id;
    }

    public get created(): Date {
        return new Date(this._created);
    }

    public get state(): CompiledCadSourceJobState {
        return this._state;
    }

    public get progress(): number {
        return this._progress;
    }

    public get downloadUrl(): string | null {
        return this._downloadUrl;
    }

    public get isInFinalState(): boolean {
        return this._state !== CompiledCadSourceJobState.NEW &&
            this._state !== CompiledCadSourceJobState.PENDING &&
            this._state !== CompiledCadSourceJobState.RUNNING;
    }
}
