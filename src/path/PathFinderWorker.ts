import {Path} from "./Path";
import * as config from "Config";
import {getClient, HttpClient} from "../core/HttpClient";
import UserController from "../auth/UserController";
import {FindPathAttributes} from "./PathFinder";
import {FeatureFlag} from "../auth/FeatureFlag";

interface PathFinderWorkerAttributes {
    spatialIndexTreeData: any; // Excluding paths.
    existingPaths: Path[] // Existing valid paths.
    findPathAttributes: FindPathAttributes[];
    ignoredUuidsTable: {[uuid: string]: string};
}

let pathFinderWorkerUrl: string;

export class PathFinderWorker {
    private http: HttpClient = getClient('text');
    private gridPathWorker: Worker | null = null;

    public terminate(): void {
        if (!this.gridPathWorker) {
            return;
        }
        this.gridPathWorker.terminate();
        this.gridPathWorker = null;
    }

    public findPaths(gridPathWorkerAttributes: PathFinderWorkerAttributes,
                     callback: (paths: Path[],
                                ignoredUuidsTable: {[uuid: string]: string},
                                runtime: number) => void): void {
        if (pathFinderWorkerUrl) {
            gridPathWorkerAttributes['pathsCanCross'] = !UserController.getUser()
                .isFeatureEnabled(FeatureFlag.PATH_FINDER_PATHS_CONFLICT);

            gridPathWorkerAttributes['pathsConflictMethod'] = UserController.getUser()
                .isFeatureEnabled(FeatureFlag.PATH_FINDER_PATHS_CONFLICT_METHOD_TOGGLE);

            this.gridPathWorker = new Worker(pathFinderWorkerUrl);
            this.gridPathWorker.postMessage(JSON.stringify(gridPathWorkerAttributes));
            this.gridPathWorker.onmessage = event => {
                const data = JSON.parse(event.data);
                callback(
                    data.paths.map(pathObject => Path.fromObject(pathObject)),
                    data.ignoredUuidsTable,
                    data.runtime);
            };

        } else {
            this.http.get(`${config.STATIC_URL}/path-finder.worker.js`)
                .then(result => {
                    const blob = new Blob([result],  { type: 'text/javascript' });
                    pathFinderWorkerUrl = window.URL.createObjectURL(blob);
                    this.findPaths(gridPathWorkerAttributes, callback)
                });
        }
    }
}
