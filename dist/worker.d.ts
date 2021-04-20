/// <reference path="../src/types/PhysX.d.ts" />
import { Matrix4 } from 'three';
import { PhysXConfig, BodyConfig, RigidBodyProxy, ShapeConfig, ControllerConfig, SceneQuery, RaycastHit } from './types/ThreePhysX';
export declare class PhysXManager {
    static instance: PhysXManager;
    physxVersion: number;
    defaultErrorCallback: PhysX.PxDefaultErrorCallback;
    allocator: PhysX.PxDefaultAllocator;
    foundation: PhysX.PxFoundation;
    cookingParamas: PhysX.PxCookingParams;
    cooking: PhysX.PxCooking;
    physics: PhysX.PxPhysics;
    scale: PhysX.PxTolerancesScale;
    sceneDesc: PhysX.PxSceneDesc;
    scene: PhysX.PxScene;
    controllerManager: PhysX.PxControllerManager;
    updateInterval: any;
    tps: number;
    onUpdate: any;
    onEvent: any;
    transformArray: Float32Array;
    bodies: Map<number, PhysX.PxRigidActor>;
    dynamic: Map<number, PhysX.PxRigidActor>;
    shapes: Map<number, PhysX.PxShape>;
    shapeIDByPointer: Map<number, number>;
    controllerIDByPointer: Map<number, number>;
    bodyShapes: Map<number, PhysX.PxShape[]>;
    matrices: Map<number, Matrix4>;
    indices: Map<number, number>;
    controllers: Map<number, PhysX.PxController>;
    raycasts: Map<number, SceneQuery>;
    initPhysX: (config: PhysXConfig) => Promise<void>;
    simulate: () => Promise<void>;
    update: (kinematicBodiesArray: Float32Array, controllerBodiesArray: Float32Array, raycastQueryArray: Float32Array) => Promise<void>;
    startPhysX: (start?: boolean) => Promise<void>;
    addBody: ({ id, transform, shapes, options }: RigidBodyProxy) => Promise<void>;
    updateBody: ({ id, options }: {
        id: number;
        options: BodyConfig;
    }) => Promise<void>;
    _updateShape({ id, isTrigger, contactOffset, collisionLayer, collisionMask, material }: ShapeConfig): void;
    removeBody: ({ id }: {
        id: any;
    }) => Promise<boolean>;
    addController: ({ id, config }: {
        id: number;
        config: ControllerConfig;
    }) => Promise<void>;
    updateController: ({ id, config }: {
        id: number;
        config: ControllerConfig;
    }) => Promise<void>;
    removeController: ({ id }: {
        id: any;
    }) => Promise<void>;
    addRaycastQuery: (query: SceneQuery) => Promise<void>;
    updateRaycastQuery: (id: number) => Promise<void>;
    removeRaycastQuery: (id: number) => Promise<void>;
    addConstraint: () => Promise<void>;
    removeConstraint: () => Promise<void>;
    _getRaycastResults: (raycastQuery: SceneQuery) => RaycastHit[];
}
export declare const receiveWorker: () => Promise<void>;
