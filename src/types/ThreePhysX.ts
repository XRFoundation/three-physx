import type { EventDispatcher, Object3D } from 'three';
///<reference path="./PhysX.d.ts"/>

export interface PhysXConfig {
  tps?: number;
  lengthScale?: number;
  start?: boolean;
}

export enum SHAPES {
  Sphere,
  Plane,
  Capsule,
  Box,
  ConvexMesh,
  TriangleMesh,
  HeightField,
}
export interface Vec3Fragment {
  x?: number;
  y?: number;
  z?: number;
}
export interface QuatFragment {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
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

export interface Transform {
  translation?: Vec3;
  rotation?: Quat;
  scale?: Vec3;
  linearVelocity?: Vec3;
  angularVelocity?: Vec3;
}

export enum BodyType {
  STATIC,
  DYNAMIC,
  KINEMATIC,
  CONTROLLER,
}

export interface Shape {
  id: number;
  shape: SHAPES;
  transform: Transform;
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
  type?: BodyType;
  mass?: number;
  linearDamping?: number;
  angularDamping?: number;
  linearVelocity?: Vec3;
  angularVelocity?: Vec3;
}

export interface RigidBody extends EventDispatcher, BodyConfig {
  id: number;
  transform: Transform;
  updateTransform?: ({ translation, rotation }: { translation?: Vec3Fragment; rotation?: QuatFragment }) => void;
  shapes: Shape[];
}

export interface ControllerRigidBody extends RigidBody {
  _debugNeedsUpdate?: any;
  _shape: ControllerConfig;
  collisions: { down: boolean; sides: boolean; up: boolean };
  delta: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface ControllerConfig {
  id?: number;
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
  // capsule
  height?: number;
  radius?: number;
  climbingMode?: PhysX.PxCapsuleClimbingMode;
  // box
  halfForwardExtent?: number;
  halfHeight?: number;
  halfSideExtent?: number;
}

export interface Object3DBody extends Object3D {
  body: RigidBody;
}

export enum SceneQueryType {
  // todo
  // Any,
  // Multiple,
  Closest,
}
export interface SceneQuery {
  id?: number;
  type: SceneQueryType;
  flags?: number;
  collisionMask?: number;
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

export enum ControllerEvents {
  CONTROLLER_SHAPE_HIT = 'CONTROLLER_SHAPE_HIT',
  CONTROLLER_CONTROLLER_HIT = 'CONTROLLER_CONTROLLER_HIT',
  CONTROLLER_OBSTACLE_HIT = 'CONTROLLER_OBSTACLE_HIT',
}

export enum CollisionEvents {
  COLLISION_START = 'COLLISION_START',
  COLLISION_PERSIST = 'COLLISION_PERSIST',
  COLLISION_END = 'COLLISION_END',

  TRIGGER_START = 'TRIGGER_START',
  TRIGGER_END = 'TRIGGER_END',
}
