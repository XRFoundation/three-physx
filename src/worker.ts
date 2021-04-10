///<reference path="./types/PhysX.d.ts"/>

import { Matrix4, Vector3, Quaternion } from 'three';
import { getShape } from './getShape';
import { PhysXConfig, PhysXBodyTransform, PhysXBodyType, PhysXEvents, BodyConfig, PhysXBodyData, RigidBodyProxy, ShapeConfig, PhysXShapeConfig, ControllerConfig } from './types/ThreePhysX';
import { MessageQueue } from './utils/MessageQueue';
import * as BufferConfig from './BufferConfig';

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
  controllerManager: PhysX.PxControllerManager;

  updateInterval: any;
  tps: number = 60;
  onUpdate: any;
  onEvent: any;
  transformArray: Float32Array;

  bodies: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  dynamic: Map<number, PhysX.RigidActor> = new Map<number, PhysX.RigidActor>();
  shapes: Map<number, PhysX.PxShape> = new Map<number, PhysX.PxShape>();
  shapeIDByPointer: Map<number, number> = new Map<number, number>();
  bodyShapes: Map<number, PhysX.PxShape[]> = new Map<number, PhysX.PxShape[]>();
  matrices: Map<number, Matrix4> = new Map<number, Matrix4>();
  indices: Map<number, number> = new Map<number, number>();
  controllers: Map<number, PhysX.PxController> = new Map<number, PhysX.PxController>();
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
    this.foundation = PhysX.PxCreateFoundation(this.physxVersion, this.allocator, this.defaultErrorCallback);
    this.cookingParamas = new PhysX.PxCookingParams(new PhysX.PxTolerancesScale());
    this.cooking = PhysX.PxCreateCooking(this.physxVersion, this.foundation, this.cookingParamas);
    this.physics = PhysX.PxCreatePhysics(this.physxVersion, this.foundation, new PhysX.PxTolerancesScale(), false, null);

    const triggerCallback = {
      onContactBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent({
          event: PhysXEvents.COLLISION_START,
          idA: this.shapeIDByPointer.get(shapeA.$$.ptr),
          idB: this.shapeIDByPointer.get(shapeB.$$.ptr),
        });
      },
      onContactEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent({
          event: PhysXEvents.COLLISION_END,
          idA: this.shapeIDByPointer.get(shapeA.$$.ptr),
          idB: this.shapeIDByPointer.get(shapeB.$$.ptr),
        });
      },
      onContactPersist: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent({
          event: PhysXEvents.COLLISION_PERSIST,
          idA: this.shapeIDByPointer.get(shapeA.$$.ptr),
          idB: this.shapeIDByPointer.get(shapeB.$$.ptr),
        });
      },
      onTriggerBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent({
          event: PhysXEvents.TRIGGER_START,
          idA: this.shapeIDByPointer.get(shapeA.$$.ptr),
          idB: this.shapeIDByPointer.get(shapeB.$$.ptr),
        });
      },
      onTriggerEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => {
        this.onEvent({
          event: PhysXEvents.TRIGGER_END,
          idA: this.shapeIDByPointer.get(shapeA.$$.ptr),
          idB: this.shapeIDByPointer.get(shapeB.$$.ptr),
        });
      },
    };

    this.scale = this.physics.getTolerancesScale();
    this.sceneDesc = PhysX.getDefaultSceneDesc(this.scale, 0, PhysX.PxSimulationEventCallback.implement(triggerCallback as any));
    this.sceneDesc.bounceThresholdVelocity = 0.001;

    this.scene = this.physics.createScene(this.sceneDesc);
    this.controllerManager = PhysX.PxCreateControllerManager(this.scene, false);

    this.startPhysX(true);
  };

  simulate = async () => {
    const now = Date.now();
    const delta = now - lastTick;
    this.scene.simulate(delta / 1000, true);
    this.scene.fetchResults(true);
    const bodyArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.BODY_DATA_SIZE * this.bodies.size));
    let offset = 0;
    this.bodies.forEach((body: PhysX.RigidActor, id: number) => {
      if (isDynamicBody(body)) {
        bodyArray.set([id, ...getBodyData(body)], offset);
      } else if (isControllerBody(body)) {
        const controller = this.controllers.get(id);
        const { x, y, z } = controller.getPosition();
        bodyArray.set([id, x, y, z, ...(controller as any)._collisions], offset);
      }
      offset += BufferConfig.BODY_DATA_SIZE;
    });
    this.onUpdate(bodyArray); //, shapeArray);
    lastTick = now;
  };

  update = async (kinematicBodiesArray: Float32Array, controllerBodiesArray: Float32Array) => {
    let offset = 0;
    while (offset < kinematicBodiesArray.length) {
      const id = kinematicBodiesArray[offset];
      const body = this.bodies.get(id) as PhysX.RigidDynamic;
      if (!body) return;

      const currentPose = body.getGlobalPose();
      currentPose.translation.x = kinematicBodiesArray[offset + 1];
      currentPose.translation.y = kinematicBodiesArray[offset + 2];
      currentPose.translation.z = kinematicBodiesArray[offset + 3];
      currentPose.rotation.x = kinematicBodiesArray[offset + 4];
      currentPose.rotation.y = kinematicBodiesArray[offset + 5];
      currentPose.rotation.z = kinematicBodiesArray[offset + 6];
      currentPose.rotation.w = kinematicBodiesArray[offset + 7];
      body.setKinematicTarget(currentPose);
      body.setGlobalPose(currentPose, true);
      offset += BufferConfig.KINEMATIC_DATA_SIZE;
    }
    offset = 0;
    while (offset < controllerBodiesArray.length) {
      const id = controllerBodiesArray[offset];
      const controller = this.controllers.get(id) as PhysX.PxController;
      if (!controller) return;
      // const position = controller.getPosition();
      const deltaPos = {
        x: controllerBodiesArray[offset + 1],
        y: controllerBodiesArray[offset + 2],
        z: controllerBodiesArray[offset + 3],
      };
      const deltaTime = controllerBodiesArray[offset + 4];
      // TODO
      // const filterData = new PhysX.PxFilterData(1, 1, 1, 1);
      // const queryCallback = PhysX.PxQueryFilterCallback.implement({ preFilter: console.log, postFilter: console.log })
      const filters = new PhysX.PxControllerFilters(null, null, null);
      const collisionFlags = controller.move(deltaPos, 0.01, deltaTime, filters, null);
      const collisions = {
        down: collisionFlags.isSet(PhysX.PxControllerCollisionFlag.eCOLLISION_DOWN) ? 1 : 0,
        sides: collisionFlags.isSet(PhysX.PxControllerCollisionFlag.eCOLLISION_SIDES) ? 1 : 0,
        up: collisionFlags.isSet(PhysX.PxControllerCollisionFlag.eCOLLISION_UP) ? 1 : 0,
      };
      (controller as any)._collisions = [collisions.down, collisions.sides, collisions.up];
      offset += BufferConfig.CONTROLLER_DATA_SIZE;
    }
  };

  startPhysX = async (start: boolean = true) => {
    if (start) {
      lastTick = Date.now();
      this.updateInterval = setInterval(this.simulate, 1000 / this.tps);
    } else {
      clearInterval(this.updateInterval);
    }
  };

  addBody = async ({ id, transform, shapes, options }: RigidBodyProxy) => {
    const { type } = options;

    let rigidBody: PhysX.RigidStatic | PhysX.RigidDynamic;

    if (type === PhysXBodyType.STATIC) {
      rigidBody = this.physics.createRigidStatic(transform);
    } else {
      rigidBody = this.physics.createRigidDynamic(transform) as PhysX.RigidDynamic;
    }
    (rigidBody as any)._type = type;

    const bodyShapes: PhysX.PxShape[] = [];
    shapes.forEach(({ id: shapeID, shape, transform, options, config }: PhysXShapeConfig) => {
      const bodyShape = getShape({
        shape,
        transform,
        options,
      });
      bodyShape.setContactOffset(0.0000001);
      // const filterData = new PhysX.PxFilterData(1, 1, 0, 0);
      // bodyShape.setSimulationFilterData(filterData);
      bodyShapes.push(bodyShape);
      rigidBody.attachShape(bodyShape);
      this.shapeIDByPointer.set(bodyShape.$$.ptr, shapeID);
      this.shapes.set(shapeID, bodyShape);
      this._updateShape(config);
    });

    this.bodyShapes.set(id, bodyShapes);
    this.bodies.set(id, rigidBody);
    this.scene.addActor(rigidBody, null);

    delete options.type;
    this.updateBody({ id, options });
  };

  updateBody = async ({ id, options }: { id: number; options: BodyConfig }) => {
    const body = this.bodies.get(id);
    const actorFlags = body.getActorFlags();
    if (!isStaticBody(body)) {
      if (typeof options.type !== 'undefined') {
        let flags = (body as PhysX.RigidDynamic).getRigidBodyFlags();
        if (options.type === PhysXBodyType.KINEMATIC) {
          flags |= PhysX.PxRigidBodyFlag.eKINEMATIC.value;
        } else {
          flags &= ~PhysX.PxRigidBodyFlag.eKINEMATIC.value;
        }
        (body as PhysX.RigidDynamic).setRigidBodyFlags(new PhysX.PxRigidBodyFlags(flags));
      }
      if (options.mass) {
        (body as PhysX.RigidDynamic).setMass(options.mass);
      }
      if (options.linearDamping) {
        (body as PhysX.RigidDynamic).setLinearDamping(options.linearDamping);
      }
      if (options.angularDamping) {
        (body as PhysX.RigidDynamic).setAngularDamping(options.angularDamping);
      }
    }
    if (options.linearVelocity) {
      const linearVelocity = body.getLinearVelocity();
      body.setLinearVelocity({ x: options.linearVelocity.x ?? linearVelocity.x, y: options.linearVelocity.y ?? linearVelocity.x, z: options.linearVelocity.z ?? linearVelocity.z }, true);
    }
    if (options.angularVelocity) {
      const angularVelocity = body.getAngularVelocity();
      body.setAngularVelocity({ x: options.angularVelocity.x ?? angularVelocity.x, y: options.angularVelocity.y ?? angularVelocity.x, z: options.angularVelocity.z ?? angularVelocity.z }, true);
    }
    if (options.transform) {
      const transform = body.getGlobalPose();
      transform.translation.x = options.transform.translation.x ?? transform.translation.x;
      transform.translation.y = options.transform.translation.y ?? transform.translation.y;
      transform.translation.z = options.transform.translation.z ?? transform.translation.z;
      transform.rotation.x = options.transform.rotation.x ?? transform.rotation.x;
      transform.rotation.y = options.transform.rotation.y ?? transform.rotation.y;
      transform.rotation.z = options.transform.rotation.z ?? transform.rotation.z;
      transform.rotation.w = options.transform.rotation.w ?? transform.rotation.w;
      body.setGlobalPose(transform, true);
    }
    options.shapes?.forEach(this._updateShape);
  };

  _updateShape({ id, isTrigger, collisionId, collisionMask, staticFriction, dynamicFriction, restitution }: ShapeConfig) {
    const shape = this.shapes.get(id);
    if (!shape) return;
    const filterData = new PhysX.PxFilterData(collisionId, collisionMask, 1, 1);
    shape.setSimulationFilterData(filterData);
    if (typeof staticFriction !== 'undefined' || typeof dynamicFriction !== 'undefined' || typeof restitution !== 'undefined') {
    }
  }

  removeBody = async ({ id }) => {
    const body = this.bodies.get(id);
    this.scene.removeActor(body, false);
    this.bodies.delete(id);
  };

  addController = async ({ id, config }: { id: number; config: ControllerConfig }) => {
    const controllerDesc = new PhysX.PxCapsuleControllerDesc();
    controllerDesc.position = config.position ?? { x: 0, y: 0, z: 0 };
    controllerDesc.height = config.height ?? 1;
    controllerDesc.radius = config.radius ?? 0.25;
    controllerDesc.stepOffset = config.stepOffset ?? 0.1;
    controllerDesc.maxJumpHeight = config.maxJumpHeight ?? 0.1;
    controllerDesc.contactOffset = config.contactOffset ?? 0.01;
    controllerDesc.invisibleWallHeight = config.invisibleWallHeight ?? 0;
    controllerDesc.slopeLimit = config.slopeLimit ?? Math.cos((45 * Math.PI) / 180);
    controllerDesc.climbingMode = config.climbingMode ?? PhysX.PxCapsuleClimbingMode.eEASY;
    controllerDesc.setReportCallback(
      PhysX.PxUserControllerHitReport.implement({
        onShapeHit: (shape) => {
          // TODO: make, get and return shape ID
          const position = shape.getWorldPos();
          const normal = shape.getWorldNormal();
          const length = shape.getLength();
          this.onEvent({ event: PhysXEvents.CONTROLLER_SHAPE_HIT, id, position, normal, length });
        },
        onControllerHit: (shape) => {
          // TODO
          console.warn('three-physx: onControllerHit event not implemented');
        },
        onObstacleHit: (shape) => {
          // TODO
          console.warn('three-physx: onObstacleHit event not implemented');
        },
      }),
    );
    controllerDesc.setMaterial(this.physics.createMaterial(0.5, 0.5, 0.5));
    if (!controllerDesc.isValid()) {
      console.warn('[WARN] Controller Description invalid!');
    }
    const controller = this.controllerManager.createController(controllerDesc);
    this.controllers.set(id, controller);
    this.bodies.set(id, controller as any);
    (controller as any)._collisions = [];
    (controller as any)._type = PhysXBodyType.CONTROLLER;

    // todo
  };

  updateController = async ({ id, config }: { id: number; config: ControllerConfig }) => {
    const controller = this.controllers.get(id) as PhysX.PxCapsuleController;
    if (typeof config.height !== 'undefined') {
      controller.setHeight(config.height);
    }
    if (typeof config.radius !== 'undefined') {
      controller.setRadius(config.radius);
    }
    if (typeof config.height !== 'undefined') {
      controller.setClimbingMode(config.climbingMode);
    }
    // todo
  };

  removeController = async () => {
    // todo
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
function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}
const isKinematicBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.KINEMATIC;
};

const isControllerBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.CONTROLLER;
};

const isDynamicBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.DYNAMIC;
};

const isStaticBody = (body: PhysX.RigidActor) => {
  return (body as any)._type === PhysXBodyType.STATIC;
};

const getRigidBodyFlag = (body: PhysX.RigidActor, flag: number) => {
  return Boolean(flag & (body as PhysX.RigidBody).getRigidBodyFlags());
};

const getBodyData = (body: PhysX.RigidActor) => {
  const transform = body.getGlobalPose();
  const linVel = body.getLinearVelocity();
  const angVel = body.getAngularVelocity();
  return [transform.translation.x, transform.translation.y, transform.translation.z, transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w, linVel.x, linVel.y, linVel.z, angVel.x, angVel.y, angVel.z];
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
    scale: {
      x: scale.x,
      y: scale.y,
      z: scale.z,
    },
  };
};

export const receiveWorker = async (): Promise<void> => {
  const messageQueue = new MessageQueue(globalThis as any);
  let latestCollisions = [];
  PhysXManager.instance = new PhysXManager();
  PhysXManager.instance.onUpdate = (data: Uint8Array) => {
    messageQueue.sendEvent('data', data, [data.buffer]);
    messageQueue.sendEvent('colliderEvent', [...latestCollisions]);
    latestCollisions = [];
  };
  PhysXManager.instance.onEvent = (data) => {
    latestCollisions.push(data);
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
