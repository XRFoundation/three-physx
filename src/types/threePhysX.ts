
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

export interface PhysXBodyTransform {
  translation: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    w: number;
    x: number;
    y: number;
    z: number;
  };
}

export interface PhysXShapeOptions {
  boxExtents?: number[],
  sphereRadius?: number,
}


export interface PhysXShapeConfig {
  shape: PhysXModelShapes,
  vertices?: number[],
  indices?: number[],
  matrix?: number[],
  options?: PhysXShapeOptions,
}

export interface PhysXBodyConfig {
  id: number;
  worldMatrix: number[],
  shapes: PhysXShapeConfig[],
  bodyOptions: {
    dynamic: boolean,
  }
}


export interface PhysXInteface {
  addBody: (config: PhysXBodyConfig) => Promise<void>;
  initPhysX: (config: PhysXConfig) => Promise<void>;
  startPhysX: (start?: boolean) => Promise<void>;
}
