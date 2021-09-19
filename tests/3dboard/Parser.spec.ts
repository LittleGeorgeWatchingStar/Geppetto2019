import * as THREE from "three";
import {ModelFileTypes, parseModelData} from "../../src/3dboard/Parser";
import {sampleGltfData} from "./SampleGltf";

describe("Parser", () => {
    it("can parse old model format", (done) => {
        parseModelData(sampleOldModelFormat).subscribe(res => {
            expect(res.object3D instanceof THREE.Object3D).toBeTruthy();
            expect(res.modelFileType).toEqual(ModelFileTypes.JSON_MODEL_FORMAT_3);
            done();
        });
    });

    it("can parse object scene format", (done) => {
        parseModelData(sampleObjectSceneFormat).subscribe(res => {
            expect(res.object3D instanceof THREE.Object3D).toBeTruthy();
            expect(res.modelFileType).toEqual(ModelFileTypes.OBJECT_SCENE_FORMAT_4);
            done();
        });
	});

    it("can parse glTF format", (done) => {
        parseModelData(sampleGltfData).subscribe(res => {
            expect(res.object3D instanceof THREE.Object3D).toBeTruthy();
            expect(res.modelFileType).toEqual(ModelFileTypes.GLTF);
            done();
        });
    });

    it("raises error for invalid json", (done) => {
        parseModelData(invalidObject).subscribe(
            res => {
                fail();
                done();
            },
            err => {
                done();
            });
    });

    it("raises error for invalid data", (done) => {
        parseModelData(invalidObject2).subscribe(
            res => {
                fail();
                done();
            },
            err => {
                done();
            });
    });
});

const sampleOldModelFormat = JSON.stringify({
	"metadata": { "formatVersion": 3 },

	"materials": [],
	"vertices": [],
	"normals":  [],
	"colors":   [],
	"uvs":      [],
	"faces": []
});

const sampleObjectSceneFormat = JSON.stringify({
    "metadata": { "version": 4.4, "type": "Object", },

    "geometries": [],
    "materials": [],
    "object": {},
});

const invalidObject = JSON.stringify({
    "metadata": { "version": 2 }
});


const invalidObject2 = 'I AM INVALID!';
