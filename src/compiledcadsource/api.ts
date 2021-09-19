import {CompiledCadSourceJobState} from "./CompiledCadSourceJob";

export interface CompiledCadSourceJobJson {
    id: string; // UUID
    created: string;
    state: CompiledCadSourceJobState;
    progress: number;
    download_url: string | null;
}