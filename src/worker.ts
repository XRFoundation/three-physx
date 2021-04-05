///<reference path="./types/PhysX.d.ts"/>

import { MessageQueue } from "./utils/MessageQueue";
export interface PhysXConfig {
  jsPath: string;
  wasmPath: string;
  tps?: number;
}

const noop = () => {};

export enum PhysXModelShapes {
  Sphere,
  Plane,
  // Capsule,
  Box,
  ConvexMesh,
  TriangleMesh,
  HeightField
}

export interface PhysXPrimitiveModelDescription {
  shape: PhysXModelShapes,
  size?: number[],
  vertices?: number[],
  faces?: number[],
  indices?: number[]
}

export interface PhysXConvexShapeDescription {
}
export interface PhysXBodyTransformParameters {
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

export interface PhysXBodyConfig {
  id: number;
  dynamic: boolean,
  model: PhysXPrimitiveModelDescription,
  transform: PhysXBodyTransformParameters,
}

export interface PhysXInteface {
  addBody: (config: PhysXBodyConfig) => Promise<void>;
  initPhysX: (config: PhysXConfig) => Promise<void>;
  startPhysX: (start?: boolean) => Promise<void>;
}

export class PhysXManager implements PhysXInteface {

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

  updateInterval: any;
  tps: number = 60;
  onUpdate: any = noop;

  bodies: Map<number, PhysX.RigidBody> = new Map<number, PhysX.RigidBody>();

  initPhysX = async (config: PhysXConfig): Promise<void> => {
    //@ts-ignore
    importScripts(config.jsPath)
    if(config?.tps) {
      this.tps = config.tps;
    } 
    (globalThis as any).PhysX = await new (globalThis as any).PHYSX({
      locateFile: () => { return config.wasmPath; }
    });
    this.physxVersion = PhysX.PX_PHYSICS_VERSION;
    this.defaultErrorCallback = new PhysX.PxDefaultErrorCallback();
    this.allocator = new PhysX.PxDefaultAllocator();
    this.foundation = PhysX.PxCreateFoundation(this.physxVersion, this.allocator, this.defaultErrorCallback);
    this.cookingParamas = new PhysX.PxCookingParams(new PhysX.PxTolerancesScale());
    this.cooking = PhysX.PxCreateCooking(this.physxVersion, this.foundation, this.cookingParamas);
    this.physics = PhysX.PxCreatePhysics(this.physxVersion, this.foundation, new PhysX.PxTolerancesScale(), false, null);

    const triggerCallback = {
      onContactBegin : () => {},
      onContactEnd : () => {},
      onContactPersist : () => {},
      onTriggerBegin : () => {},
      onTriggerEnd : () => {},
    };

    this.scale = this.physics.getTolerancesScale();
    this.sceneDesc = PhysX.getDefaultSceneDesc(this.scale, 0, PhysX.PxSimulationEventCallback.implement(triggerCallback as any));
    this.sceneDesc.bounceThresholdVelocity = 0.001;

    this.scene = this.physics.createScene(this.sceneDesc);

    this.startPhysX(true);
  }

  simulate = async () => {
    this.scene.simulate(1/this.tps, true);
    this.scene.fetchResults(true);
    this.onUpdate(new Uint8Array([0, 1, 2]));
  }

  startPhysX = async (start: boolean = true) => {
    if(start) {
      this.updateInterval = setInterval(this.simulate, 1000/this.tps);
    } else {
      clearInterval()
    }
  }

  addBody = async (entity: PhysXBodyConfig) => {
    console.log('addBody', entity)
    let geometry, body;
    if (entity.model.shape === PhysXModelShapes.Box) {
      if(entity.model.size.length !== 3) console.log('Box shape has wrong number of extents')
      geometry = new PhysX.PxBoxGeometry(...(entity.model.size as [number, number, number]))
    } else if (entity.model.shape === PhysXModelShapes.Sphere) {
      geometry = new PhysX.PxSphereGeometry(...(entity.model.size as [number]))
    }
    const material = this.physics.createMaterial(0.2, 0.2, 0.2)
    const flags = new PhysX.PxShapeFlags(
      PhysX.PxShapeFlag.eSCENE_QUERY_SHAPE.value |
      PhysX.PxShapeFlag.eSIMULATION_SHAPE.value
    )
    const shape = this.physics.createShape(geometry, material, false, flags)
    if(entity.dynamic) {
      body = this.physics.createRigidDynamic(entity.transform);
    } else {
      body = this.physics.createRigidStatic(entity.transform);
    }
    body.attachShape(shape)
    this.bodies.set(entity.id, body);
    this.scene.addActor(body, null)
    console.log(body)
  }

}

export const receiveWorker = async (): Promise<void> => {
  const messageQueue = new MessageQueue(globalThis as any);
  const _physxmanager = new PhysXManager()
  _physxmanager.onUpdate = (data: Uint8Array) => {
    messageQueue.sendEvent('data', data, [data.buffer])
  }
  const addFunctionListener = (eventLabel) => {
    messageQueue.addEventListener(eventLabel, async ({ detail }) => {
      _physxmanager[eventLabel](...detail.args).then((returnValue) => {
        messageQueue.sendEvent(detail.uuid, { returnValue });
      })
    })
  }
  Object.keys(_physxmanager).forEach((key) => {
    if(typeof _physxmanager[key] === 'function') {
      addFunctionListener(key)
    }
  })
  messageQueue.sendEvent('init', {})
}

receiveWorker()