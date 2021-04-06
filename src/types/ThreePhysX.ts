import { Quaternion, Vector3 } from "three";

export interface PhysXConfig {
  jsPath: string;
  wasmPath: string;
  tps?: number;
}

export enum PhysXModelShapes {
  Sphere,
  Plane,
  // Capsule,
  Box,
  ConvexMesh,
  TriangleMesh,
  HeightField
}

interface Vec3 {
  x: number
  y: number
  z: number
}

interface Quat {
  x: number
  y: number
  z: number
  w: number
}

export interface PhysXBodyTransform {
  translation: Vec3
  rotation: Quat
}

export interface PhysXBodyData {
  translation: Vector3
  rotation: Quaternion
  linearVelocity: Vector3
  angularVelocity: Vector3
}

export interface PhysXShapeOptions {
  boxExtents?: number[]
  sphereRadius?: number
}

export enum PhysXBodyType {
  STATIC,
  DYNAMIC,
  KINEMATIC
}

export interface PhysXShapeConfig {
  shape: PhysXModelShapes
  vertices?: number[]
  indices?: number[]
  matrix?: number[]
  options?: PhysXShapeOptions
}

export interface PhysXBodyConfig {
  id: number
  transform: PhysXBodyTransform
  shapes: PhysXShapeConfig[]
  bodyOptions: {
    type?: PhysXBodyType
    trigger?: boolean
  }
}

export interface PhysXUserData {
  type: PhysXBodyType
}

export interface PhysXInteface {
  initPhysX: any
  startPhysX: any
  addBody: any
}