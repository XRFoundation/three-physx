///<reference path="./types/PhysX.d.ts"/>

import { Matrix4, Vector3, Quaternion, Matrix } from "three";
import { getShape } from "./getShape";
import { PhysXBodyConfig, PhysXConfig, PhysXInteface, PhysXModelShapes, PhysXBodyTransform, PhysXBodyType } from "./types/ThreePhysX";
import { MessageQueue } from "./utils/MessageQueue";
import * as BufferConfig from "./BufferConfig";

const noop = () => { };

const mat4 = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();

let lastTick = 0;

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

  bodies: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  dynamic: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  shapes: Map<number, PhysX.PxShape[]> = new Map<number, PhysX.PxShape[]>();
  matrices: Map<number, Matrix4> = new Map<number, Matrix4>();
  indices: Map<number, number> = new Map<number, number>();

  objectArray: Float32Array;

  // constraints: // TODO


  initPhysX = async (config: PhysXConfig, objectArray: Float32Array): Promise<void> => {
    //@ts-ignore
    importScripts(config.jsPath);
    this.objectArray = objectArray;
    if (config?.tps) {
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
      onContactBegin: (shapeA, shapeB) => { 
        // console.log('onContactBegin', shapeA, shapeB) 
      },
      onContactEnd: (shapeA, shapeB) => { 
        // console.log('onContactEnd', shapeA, shapeB) 
      },
      onContactPersist: (shapeA, shapeB) => { 
        // console.log('onContactPersist', shapeA, shapeB) 
      },
      onTriggerBegin: (shapeA, shapeB) => { 
        // console.log('onTriggerBegin', shapeA, shapeB) 
      },
      onTriggerEnd: (shapeA, shapeB) => { 
        // console.log('onTriggerEnd', shapeA, shapeB) 
      },
    };

    this.scale = this.physics.getTolerancesScale();
    this.sceneDesc = PhysX.getDefaultSceneDesc(this.scale, 0, PhysX.PxSimulationEventCallback.implement(triggerCallback as any));
    this.sceneDesc.bounceThresholdVelocity = 0.001;

    this.scene = this.physics.createScene(this.sceneDesc);

    this.startPhysX(true);
  }

  simulate = async () => {
    const now = Date.now();
    const delta = now - lastTick;
    this.scene.simulate(delta/1000, true);
    this.scene.fetchResults(true);
    this.bodies.forEach((body: PhysX.RigidActor, id: number) => {
      this.objectArray.set(getBodyData(body), id * BufferConfig.BODY_DATA_SIZE);
    })
    this.onUpdate(this.objectArray);
    lastTick = now;
  }

  startPhysX = async (start: boolean = true) => {
    if (start) {
      lastTick = Date.now() - 1 / this.tps; // pretend like it's only been one tick
      this.updateInterval = setInterval(this.simulate, 1000 / this.tps);
    } else {
      clearInterval()
    }
  }

  addBody = async ({ id, transform, shapes, bodyOptions }: PhysXBodyConfig) => {
    // console.log(id, transform, shapes, bodyOptions)
    const { type, trigger } = bodyOptions;

    let body: PhysX.RigidStatic | PhysX.RigidDynamic;

    if (type === PhysXBodyType.STATIC) {
      body = this.physics.createRigidStatic(transform);
    } else {
      body = this.physics.createRigidDynamic(transform) as PhysX.RigidDynamic;
      if(type === PhysXBodyType.KINEMATIC) {
        // (body as PhysX.RigidDynamic).setKinematicTarget(new PhysX.PxTransform([0,0,0], [0,0,0,0]));
        // (body as PhysX.RigidDynamic).setRigidBodyFlags(PhysX.PxRigidBodyFlags.eKINEMATIC);
      }

      (body as any)._type = type;
    }

    if (trigger) {

    }

    const bodyShapes: PhysX.PxShape[] = [];
    shapes.forEach(({ shape, vertices, indices, options }) => {
      const bodyShape = getShape({ shape, vertices, indices, options });
      bodyShape.setContactOffset(0.0000001)
			const filterData = new PhysX.PxFilterData(1, 1, 0, 0);
			bodyShape.setSimulationFilterData(filterData);
      bodyShapes.push(bodyShape)
      body.attachShape(bodyShape);
    })

    this.shapes.set(id, bodyShapes);
    this.bodies.set(id, body);
    this.scene.addActor(body, null);
  }

  removeBody = async ({ id }) => {
    const body = this.bodies.get(id);
    this.scene.removeActor(body, false);
    this.bodies.delete(id);

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

const isDynamicBody = (body: PhysX.RigidDynamic) => {
  return (body as any)._type === PhysXBodyType.DYNAMIC;
}

const getBodyData = (body: PhysX.RigidActor) => {
  const transform = body.getGlobalPose();
  const linVel = isDynamicBody(body as PhysX.RigidDynamic) ? body.getLinearVelocity() : { x:0, y:0, z:0 };
  const angVel = isDynamicBody(body as PhysX.RigidDynamic) ? body.getAngularVelocity() : { x:0, y:0, z:0 };
  return [
    transform.translation.x, transform.translation.y, transform.translation.z,
    transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w,
    linVel.x, linVel.y, linVel.z,
    angVel.x, angVel.y, angVel.z,
  ]
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
    messageQueue.sendEvent('data', data)
  }
  const addFunctionListener = (eventLabel) => {
    messageQueue.addEventListener(eventLabel, async ({ detail }) => {
      PhysXManager.instance[eventLabel](...detail.args).then((returnValue) => {
        messageQueue.sendEvent(detail.uuid, { returnValue });
      })
    })
  }
  Object.keys(PhysXManager.instance).forEach((key) => {
    if (typeof PhysXManager.instance[key] === 'function') {
      addFunctionListener(key)
    }
  })
  messageQueue.sendEvent('init', {})
}

receiveWorker()