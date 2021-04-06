///<reference path="./types/PhysX.d.ts"/>

import { Matrix4, Vector3, Quaternion, Matrix } from "three";
import { threeToPhysX } from "./threeToPhysX";
import { PhysXBodyConfig, PhysXConfig, PhysXInteface, PhysXModelShapes, PhysXBodyTransform } from "./types/threePhysX";
import { MessageQueue } from "./utils/MessageQueue";
const noop = () => {};

const mat4 = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();

export class PhysXManager implements PhysXInteface {

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

  updateInterval: any;
  tps: number = 60;
  onUpdate: any = noop;
  transformArray: Float32Array;

  ids: number[];
  bodies: Map<number, PhysX.RigidBody> = new Map<number, PhysX.RigidBody>();
  shapes: Map<number, PhysX.PxShape> = new Map<number, PhysX.PxShape>();
  matrices: Map<number, Matrix4> = new Map<number, Matrix4>();
  indices: Map<number, number> = new Map<number, number>();

  
  // constraints: // TODO


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

  addBody = async ({ id, worldMatrix, shapes, bodyOptions }: PhysXBodyConfig) => {
    console.log(id, worldMatrix, shapes, bodyOptions)
    const { dynamic } = bodyOptions;
    let body;
    mat4.fromArray(worldMatrix);
    const transform = mat4ToTransform(mat4)

    if(dynamic) {
      body = this.physics.createRigidDynamic(transform);
    } else {
      body = this.physics.createRigidStatic(transform);
    }

    shapes.forEach(({ shape, vertices, indices, matrix, options }) => {
      body.attachShape(threeToPhysX({ shape, vertices, indices, matrix, worldMatrix, options }));
    })

    this.bodies.set(id, body);
    this.scene.addActor(body, null);
    console.log(body);
  }

  removeBody = async () => {
    
  }

  addConstraint = async () => {
    // todo
  }

  removeConstraint = async () => {
    // todo
  }

  enableDebug = async () => {
    // todo
  }

  resetDynamicBody = async () => {
    // todo
  }

  activateBody = async () => {
    // todo
  }
}

const mat4ToTransform = (matrix: Matrix4): PhysXBodyTransform => {
  matrix.decompose(pos, quat, scale)
  return {
    translation: { 
      x: pos.x,
      y: pos.y,
      z: pos.z
    },
    rotation: {
      x: quat.x,
      y: quat.y,
      z: quat.z,
      w: quat.w
    }
  }
}

export const receiveWorker = async (): Promise<void> => {
  const messageQueue = new MessageQueue(globalThis as any);
  PhysXManager.instance = new PhysXManager();
  PhysXManager.instance.onUpdate = (data: Uint8Array) => {
    messageQueue.sendEvent('data', data, [data.buffer])
  }
  const addFunctionListener = (eventLabel) => {
    messageQueue.addEventListener(eventLabel, async ({ detail }) => {
      PhysXManager.instance[eventLabel](...detail.args).then((returnValue) => {
        messageQueue.sendEvent(detail.uuid, { returnValue });
      })
    })
  }
  Object.keys(PhysXManager.instance).forEach((key) => {
    if(typeof PhysXManager.instance[key] === 'function') {
      addFunctionListener(key)
    }
  })
  messageQueue.sendEvent('init', {})
}

receiveWorker()