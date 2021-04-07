///<reference path="./types/PhysX.d.ts"/>

import { Matrix4, Vector3, Quaternion, Matrix } from 'three';
import { getShape } from './getShape';
import {
  PhysXConfig,
  PhysXBodyTransform,
  PhysXBodyType,
  PhysXEvents,
} from './types/ThreePhysX';
import { MessageQueue } from './utils/MessageQueue';
import * as BufferConfig from './BufferConfig';

const noop = () => {};

const mat4 = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();

let lastTick = 0;

export class PhysXManager {
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
  onUpdate: any;
  onEvent: any;
  transformArray: Float32Array;

  bodies: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  dynamic: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  shapes: Map<number, number> = new Map<number, number>();
  matrices: Map<number, Matrix4> = new Map<number, Matrix4>();
  indices: Map<number, number> = new Map<number, number>();

  bodyIDByShape: Map<PhysX.PxShape, number> = new Map<PhysX.PxShape, number>();

  objectArray: Float32Array;

  // constraints: // TODO

  initPhysX = async (config: PhysXConfig): Promise<void> => {
    //@ts-ignore
    importScripts(config.jsPath);
    if (config?.tps) {
      this.tps = config.tps;
    }
    (globalThis as any).PhysX = await new (globalThis as any).PHYSX({
      locateFile: () => {
        return config.wasmPath;
      },
    });
    this.physxVersion = PhysX.PX_PHYSICS_VERSION;
    this.defaultErrorCallback = new PhysX.PxDefaultErrorCallback();
    this.allocator = new PhysX.PxDefaultAllocator();
    this.foundation = PhysX.PxCreateFoundation(
      this.physxVersion,
      this.allocator,
      this.defaultErrorCallback,
    );
    this.cookingParamas = new PhysX.PxCookingParams(
      new PhysX.PxTolerancesScale(),
    );
    this.cooking = PhysX.PxCreateCooking(
      this.physxVersion,
      this.foundation,
      this.cookingParamas,
    );
    this.physics = PhysX.PxCreatePhysics(
      this.physxVersion,
      this.foundation,
      new PhysX.PxTolerancesScale(),
      false,
      null,
    );

    const triggerCallback = {
      onContactBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent(
          PhysXEvents.COLLISION_START,
          this.shapes.get(shapeA.$$.ptr),
          this.shapes.get(shapeB.$$.ptr),
        );
      },
      onContactEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent(
          PhysXEvents.COLLISION_END,
          this.shapes.get(shapeA.$$.ptr),
          this.shapes.get(shapeB.$$.ptr),
        );
      },
      onContactPersist: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent(
          PhysXEvents.COLLISION_PERSIST,
          this.shapes.get(shapeA.$$.ptr),
          this.shapes.get(shapeB.$$.ptr),
        );
      },
      onTriggerBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent(
          PhysXEvents.TRIGGER_START,
          this.shapes.get(shapeA.$$.ptr),
          this.shapes.get(shapeB.$$.ptr),
        );
      },
      onTriggerEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent(
          PhysXEvents.TRIGGER_END,
          this.shapes.get(shapeA.$$.ptr),
          this.shapes.get(shapeB.$$.ptr),
        );
      },
    };

    this.scale = this.physics.getTolerancesScale();
    this.sceneDesc = PhysX.getDefaultSceneDesc(
      this.scale,
      0,
      PhysX.PxSimulationEventCallback.implement(triggerCallback as any),
    );
    this.sceneDesc.bounceThresholdVelocity = 0.001;

    this.scene = this.physics.createScene(this.sceneDesc);

    this.startPhysX(true);
  };

  simulate = async () => {
    const now = Date.now();
    const delta = now - lastTick;
    this.scene.simulate(delta / 1000, true);
    this.scene.fetchResults(true);
    this.objectArray = new Float32Array(
      new ArrayBuffer(4 * BufferConfig.BODY_DATA_SIZE * this.bodies.size),
    );
    this.bodies.forEach((body: PhysX.RigidActor, id: number) => {
      if (isDynamicBody(body)) {
        this.objectArray.set(
          getBodyData(body),
          id * BufferConfig.BODY_DATA_SIZE,
        );
      }
    });
    this.onUpdate(this.objectArray);
    lastTick = now;
  };

  update = async (
    kinematicIDs: number[],
    kinematicBodiesArray: Float32Array,
  ) => {
    kinematicIDs.forEach((id) => {
      const body = this.bodies.get(id) as PhysX.RigidDynamic;
      const offset = id * BufferConfig.BODY_DATA_SIZE;
      const currentPose = body.getGlobalPose();
      currentPose.translation.x = kinematicBodiesArray[offset];
      currentPose.translation.y = kinematicBodiesArray[offset + 1];
      currentPose.translation.z = kinematicBodiesArray[offset + 2];
      currentPose.rotation.x = kinematicBodiesArray[offset + 3];
      currentPose.rotation.y = kinematicBodiesArray[offset + 4];
      currentPose.rotation.z = kinematicBodiesArray[offset + 5];
      currentPose.rotation.w = kinematicBodiesArray[offset + 6];
      body.setKinematicTarget(currentPose);
    });
  };

  startPhysX = async (start: boolean = true) => {
    if (start) {
      lastTick = Date.now() - 1 / this.tps; // pretend like it's only been one tick
      this.updateInterval = setInterval(this.simulate, 1000 / this.tps);
    } else {
      clearInterval();
    }
  };

  addBody = async ({ id, transform, shapes, bodyOptions }) => {
    const { type, trigger } = bodyOptions;

    let rigidBody: PhysX.RigidStatic | PhysX.RigidDynamic;

    if (type === PhysXBodyType.STATIC) {
      rigidBody = this.physics.createRigidStatic(transform);
    } else {
      rigidBody = this.physics.createRigidDynamic(
        transform,
      ) as PhysX.RigidDynamic;
      if (type === PhysXBodyType.KINEMATIC) {
        const flags = new PhysX.PxRigidBodyFlags(
          PhysX.PxRigidBodyFlag.eKINEMATIC.value,
        );
        (rigidBody as PhysX.RigidDynamic).setRigidBodyFlags(flags);
        // (rigidBody as PhysX.RigidDynamic).setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC.value, true);
      }

      (rigidBody as any)._type = type;
    }

    if (trigger) {
    }

    const bodyShapes: PhysX.PxShape[] = [];
    shapes.forEach(({ id: shapeID, shape, vertices, indices, options }) => {
      const bodyShape = getShape({ shape, vertices, indices, options });
      bodyShape.setContactOffset(0.0000001);
      const filterData = new PhysX.PxFilterData(1, 1, 0, 0);
      bodyShape.setSimulationFilterData(filterData);
      bodyShapes.push(bodyShape);
      rigidBody.attachShape(bodyShape);
      this.bodyIDByShape.set(bodyShape, id);
      this.shapes.set(bodyShape.$$.ptr, shapeID);
    });

    this.bodies.set(id, rigidBody);
    this.scene.addActor(rigidBody, null);
  };

  updateBody = async ({ options }) => {
    // todo
  };

  removeBody = async ({ id }) => {
    const body = this.bodies.get(id);
    this.scene.removeActor(body, false);
    this.bodies.delete(id);
  };

  addConstraint = async () => {
    // todo
  };

  removeConstraint = async () => {
    // todo
  };

  enableDebug = async () => {
    // todo
  };

  resetDynamicBody = async () => {
    // todo
  };

  activateBody = async () => {
    // todo
  };
}

const isKinematicBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.KINEMATIC;
};

const isDynamicBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.DYNAMIC;
};

const getBodyData = (body: PhysX.RigidActor) => {
  const transform = body.getGlobalPose();
  const linVel = body.getLinearVelocity();
  const angVel = body.getAngularVelocity();
  return [
    transform.translation.x,
    transform.translation.y,
    transform.translation.z,
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w,
    linVel.x,
    linVel.y,
    linVel.z,
    angVel.x,
    angVel.y,
    angVel.z,
  ];
};

const mat4ToTransform = (matrix: Matrix4): PhysXBodyTransform => {
  matrix.decompose(pos, quat, scale);
  return {
    translation: {
      x: pos.x,
      y: pos.y,
      z: pos.z,
    },
    rotation: {
      x: quat.x,
      y: quat.y,
      z: quat.z,
      w: quat.w,
    },
  };
};

export const receiveWorker = async (): Promise<void> => {
  const messageQueue = new MessageQueue(globalThis as any);
  PhysXManager.instance = new PhysXManager();
  PhysXManager.instance.onUpdate = (data: Uint8Array) => {
    messageQueue.sendEvent('data', data, [data.buffer]);
  };
  PhysXManager.instance.onEvent = (event: string, idA: any, idB: any) => {
    messageQueue.sendEvent('colliderEvent', { event, idA, idB });
  };
  const addFunctionListener = (eventLabel) => {
    messageQueue.addEventListener(eventLabel, async ({ detail }) => {
      PhysXManager.instance[eventLabel](...detail.args).then((returnValue) => {
        messageQueue.sendEvent(detail.uuid, { returnValue });
      });
    });
  };
  Object.keys(PhysXManager.instance).forEach((key) => {
    if (typeof PhysXManager.instance[key] === 'function') {
      addFunctionListener(key);
    }
  });
  messageQueue.sendEvent('init', {});
};

receiveWorker();
