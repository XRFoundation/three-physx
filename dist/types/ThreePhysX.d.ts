import type { Object3D } from 'three';
export interface PhysXConfig {
    jsPath: string;
    wasmPath: string;
    tps?: number;
    lengthScale?: number;
    start?: boolean;
}
export declare enum PhysXModelShapes {
    Sphere = 0,
    Plane = 1,
    Capsule = 2,
    Box = 3,
    ConvexMesh = 4,
    TriangleMesh = 5,
    HeightField = 6
}
export interface Vec3Fragment {
    x?: number;
    y?: number;
    z?: number;
}
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface PhysXBodyTransform {
    translation: Vec3;
    rotation: Quat;
    scale: Vec3;
}
export interface PhysXBodyData {
    translation: Vec3;
    rotation: Quat;
    scale: Vec3;
    linearVelocity?: Vec3;
    angularVelocity?: Vec3;
}
export declare enum PhysXBodyType {
    STATIC = 0,
    DYNAMIC = 1,
    KINEMATIC = 2,
    CONTROLLER = 3
}
export interface PhysXShapeConfig {
    id: number;
    shape: PhysXModelShapes;
    transform: PhysXBodyTransform;
    config: ShapeConfig;
    _debugNeedsUpdate?: any;
    options?: {
        vertices?: number[];
        indices?: number[];
        boxExtents?: Vec3;
        radius?: number;
        halfHeight?: number;
    };
}
export interface MaterialConfig {
    staticFriction?: number;
    dynamicFriction?: number;
    restitution?: number;
}
export interface ShapeConfig {
    id: number;
    contactOffset?: number;
    isTrigger?: boolean;
    collisionLayer?: number;
    collisionMask?: number;
    material?: MaterialConfig;
}
export interface BodyConfig {
    type?: PhysXBodyType;
    mass?: number;
    linearDamping?: number;
    angularDamping?: number;
    linearVelocity?: Vec3;
    angularVelocity?: Vec3;
    transform?: PhysXBodyData;
    shapes?: ShapeConfig[];
}
export interface RigidBodyProxy {
    id: number;
    transform: PhysXBodyData;
    shapes: PhysXShapeConfig[];
    options: BodyConfig;
    controller?: {
        _debugNeedsUpdate?: any;
        config: ControllerConfig;
        collisions: {
            down: boolean;
            sides: boolean;
            up: boolean;
        };
        delta: {
            x: number;
            y: number;
            z: number;
        };
        velocity: {
            x: number;
            y: number;
            z: number;
        };
    };
    addEventListener?: any;
    removeEventListener?: any;
    hasEventListener?: any;
    dispatchEvent?: any;
}
export interface ControllerConfig {
    id?: number;
    body?: any;
    position?: Vec3Fragment;
    positionDelta?: Vec3Fragment;
    stepOffset?: number;
    contactOffset?: number;
    slopeLimit?: number;
    maxJumpHeight?: number;
    invisibleWallHeight?: number;
    isCapsule?: boolean;
    resize?: number;
    material?: MaterialConfig;
    collisionLayer?: number;
    collisionMask?: number;
    height?: number;
    radius?: number;
    climbingMode?: PhysX.PxCapsuleClimbingMode;
    halfForwardExtent?: number;
    halfHeight?: number;
    halfSideExtent?: number;
}
export declare const DefaultControllerConfig: ControllerConfig;
export interface Object3DBody extends Object3D {
    body: RigidBodyProxy;
}
export declare enum SceneQueryType {
    Closest = 0
}
export interface SceneQuery {
    id?: number;
    type: SceneQueryType;
    flags?: number;
    origin?: Vec3;
    direction?: Vec3;
    maxDistance?: number;
    maxHits?: number;
    hits?: RaycastHit[];
}
export interface RaycastHit {
    distance: number;
    position: Vec3;
    normal: Vec3;
}
export declare enum ControllerEvents {
    CONTROLLER_SHAPE_HIT = "CONTROLLER_SHAPE_HIT",
    CONTROLLER_CONTROLLER_HIT = "CONTROLLER_CONTROLLER_HIT",
    CONTROLLER_OBSTACLE_HIT = "CONTROLLER_OBSTACLE_HIT"
}
export declare enum CollisionEvents {
    COLLISION_START = "COLLISION_START",
    COLLISION_PERSIST = "COLLISION_PERSIST",
    COLLISION_END = "COLLISION_END",
    TRIGGER_START = "TRIGGER_START",
    TRIGGER_END = "TRIGGER_END"
}
