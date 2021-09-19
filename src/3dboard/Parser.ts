/*
THREE.js Json Parser Wrapper
 */
import * as THREE from "three"
import {LegacyJSONLoader} from "three/examples/jsm/loaders/deprecated/LegacyJSONLoader";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {Observable} from "rxjs";

export enum ModelFileTypes {
    OBJECT_SCENE_FORMAT_4 = 'ObjectSceneFormat4',
    JSON_MODEL_FORMAT_3 = 'JsonModelFormat3',
    GLTF = 'glTF',
}

interface ParserResponse {
    object3D: THREE.Object3D;
    modelFileType: ModelFileTypes;
}

function isObjectSceneFormat4(json: any): boolean {
    return Boolean(json.metadata
        && json.metadata.version
        && json.metadata.version >= 4);
}

function parseObjectScene(json: any): Observable<ParserResponse> {
    return new Observable<ParserResponse>(subscriber => {
        const loader = new THREE.ObjectLoader();
        const scene = loader.parse(json);

        const group = new THREE.Group();
        group.add(...scene.children);

        subscriber.next({
            object3D: group,
            modelFileType: ModelFileTypes.OBJECT_SCENE_FORMAT_4,
        });
        subscriber.complete();
    });
}

function isJsonModelFormat3(json: any): boolean {
    return Boolean(json.metadata
        && json.metadata.formatVersion
        && json.metadata.formatVersion >= 3
        && json.metadata.formatVersion < 4);
}

function parseJsonModelFormat3(json: any): Observable<ParserResponse> {
    return new Observable<ParserResponse>(subscriber => {
        const loader = new LegacyJSONLoader();
        const res = loader.parse(json, '');
        subscriber.next({
            object3D: new THREE.Mesh(res.geometry, res.materials),
            modelFileType: ModelFileTypes.JSON_MODEL_FORMAT_3,
        });
        subscriber.complete();
    });
}

function parseGltfFormat(modelData: string): Observable<ParserResponse> {
    return new Observable<ParserResponse>(subscriber => {
        const loader = new GLTFLoader();
        try {
            loader.parse(modelData, '', gltf => {
                subscriber.next({
                   object3D: gltf.scene,
                   modelFileType: ModelFileTypes.GLTF,
                });
                subscriber.complete();

            }, () => {
                subscriber.error(new TypeError("Unable to parse 3D model."));
                subscriber.complete();
            });
        } catch(e) {
            subscriber.error(new TypeError("Unable to parse 3D model."));
            subscriber.complete();
        }
    });
}

export function parseModelData(data: string): Observable<ParserResponse> {
    return new Observable<ParserResponse>(subscriber => {
        parseGltfFormat(data).subscribe(
            res => {
                subscriber.next(res);
                subscriber.complete();
            },
            err => {
                try {
                    const json = JSON.parse(data);
                    if (isJsonModelFormat3(json)) {
                        parseJsonModelFormat3(json).subscribe(res => {
                            subscriber.next(res);
                            subscriber.complete();
                        });
                    } else if (isObjectSceneFormat4(json)) {
                        parseObjectScene(json).subscribe(res => {
                            subscriber.next(res);
                            subscriber.complete();
                        });
                    } else {
                        subscriber.error(new TypeError("Unable to parse 3D model."));
                        subscriber.complete();
                    }
                } catch(e) {
                    subscriber.error(new TypeError("Unable to parse 3D model."));
                    subscriber.complete();
                }
            });
    });
}
