import * as THREE from "three";

export function generateUuid(): string {
    return THREE.Math.generateUUID().toLowerCase();
}