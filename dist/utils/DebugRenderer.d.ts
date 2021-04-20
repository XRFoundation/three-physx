import { Scene } from 'three';
export declare class DebugRenderer {
    private scene;
    private _meshes;
    private _raycasts;
    private _materials;
    private _sphereGeometry;
    private _boxGeometry;
    private _planeGeometry;
    private _lineMaterial;
    enabled: boolean;
    constructor(scene: Scene);
    setEnabled(enabled: any): void;
    update(): void;
    private _updateRaycast;
    private _updateController;
    private _updateMesh;
    private _createMesh;
    private _scaleMesh;
}
