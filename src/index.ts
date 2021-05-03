import * as BufferConfig from './BufferConfig';
import { MessageQueue } from './utils/MessageQueue';

import {
  PhysXConfig,
  BodyType,
  RigidBody,
  Shape,
  SceneQuery,
  CollisionEvents,
  ControllerEvents,
  Transform,
  Quat,
  QuatFragment,
  Vec3,
  Vec3Fragment,
  ControllerRigidBody,
  MaterialConfig,
  ControllerConfig,
  BodyConfig,
  SHAPES,
} from './types/ThreePhysX';
import { createNewTransform } from './threeToPhysX';
import { proxyEventListener } from './utils/proxyEventListener';
import { clone } from './utils/misc';
import { EventDispatcher, Vector3 } from 'three';

let nextAvailableBodyIndex = 0;
let nextAvailableShapeID = 0;
let nextAvailableRaycastID = 0;
let lastUpdateTick = 0;

export class PhysXInstance {
  static instance: PhysXInstance = new PhysXInstance();
  _physicsProxy: any;
  _messageQueue: MessageQueue;

  _bodies: Map<number, Body> = new Map<number, Body>();
  _shapes: Map<number, Shape> = new Map<number, Shape>();
  _kinematicBodies: Map<number, Body> = new Map<number, Body>();
  _controllerBodies: Map<number, Controller> = new Map<number, Controller>();
  _raycasts: Map<number, SceneQuery> = new Map<number, SceneQuery>();

  initPhysX = async (worker: Worker, config: PhysXConfig = {}): Promise<void> => {
    this._messageQueue = new MessageQueue(worker);
    await new Promise((resolve) => {
      this._messageQueue.addEventListener('init', () => {
        resolve(true);
      });
      this._messageQueue.sendQueue();
    });
    await new Promise((resolve) => {
      this._messageQueue.addEventListener('initphysx', (ev) => {
        resolve(true);
      });
      this._messageQueue.sendEvent('initphysx', config);
      this._messageQueue.sendQueue();
    });
    this._messageQueue.addEventListener('data', (ev) => {
      let offset = 0;
      const { raycastResults, bodyArray } = ev.detail;
      while (offset < bodyArray.length) {
        const body = this._bodies.get(bodyArray[offset]);
        if (body) {
          if (body.type === BodyType.CONTROLLER) {
            body.transform.translation.x = bodyArray[offset + 1];
            body.transform.translation.y = bodyArray[offset + 2];
            body.transform.translation.z = bodyArray[offset + 3];
            (body as Controller).collisions = {
              down: Boolean(bodyArray[offset + 4]),
              sides: Boolean(bodyArray[offset + 5]),
              up: Boolean(bodyArray[offset + 6]),
            };
          } else if (body.type === BodyType.DYNAMIC) {
            body.transform.translation.x = bodyArray[offset + 1];
            body.transform.translation.y = bodyArray[offset + 2];
            body.transform.translation.z = bodyArray[offset + 3];
            body.transform.rotation.x = bodyArray[offset + 4];
            body.transform.rotation.y = bodyArray[offset + 5];
            body.transform.rotation.z = bodyArray[offset + 6];
            body.transform.rotation.w = bodyArray[offset + 7];
            body.transform.linearVelocity.x = bodyArray[offset + 8];
            body.transform.linearVelocity.y = bodyArray[offset + 9];
            body.transform.linearVelocity.z = bodyArray[offset + 10];
            body.transform.angularVelocity.x = bodyArray[offset + 11];
            body.transform.angularVelocity.y = bodyArray[offset + 12];
            body.transform.angularVelocity.z = bodyArray[offset + 13];
          }
        }
        offset += BufferConfig.BODY_DATA_SIZE;
      }
      this._raycasts.forEach((raycastQuery) => {
        raycastQuery.hits = raycastResults[raycastQuery.id] ?? [];
        raycastQuery.hits.forEach((hit) => {
          hit.body = this._bodies.get(hit._bodyID);
          delete hit._bodyID;
        });
      });
    });
    this._messageQueue.addEventListener('colliderEvent', ({ detail }) => {
      detail.forEach((collision) => {
        switch (collision.event) {
          case CollisionEvents.COLLISION_START:
          case CollisionEvents.COLLISION_PERSIST:
          case CollisionEvents.COLLISION_END:
          case CollisionEvents.TRIGGER_START:
          case CollisionEvents.TRIGGER_END:
            {
              try {
                const { event, idA, idB } = collision;
                const shapeA = this._shapes.get(idA);
                const shapeB = this._shapes.get(idB);
                const bodyA = (shapeA as any).body;
                const bodyB = (shapeB as any).body;
                if (!bodyA || !bodyB) return; // TODO this is a hack
                bodyA.dispatchEvent({
                  type: event,
                  bodySelf: bodyA,
                  bodyOther: bodyB,
                  shapeSelf: shapeA,
                  shapeOther: shapeB,
                });
                bodyB.dispatchEvent({
                  type: event,
                  bodySelf: bodyB,
                  bodyOther: bodyA,
                  shapeSelf: shapeB,
                  shapeOther: shapeA,
                });
              } catch (e) {
                console.log(collision, e);
              }
            }
            break;
          case ControllerEvents.CONTROLLER_SHAPE_HIT:
          case ControllerEvents.CONTROLLER_CONTROLLER_HIT:
          case ControllerEvents.CONTROLLER_OBSTACLE_HIT:
            {
              const { event, controllerID, shapeID, position, normal, length } = collision;
              const controllerBody: RigidBody = this._bodies.get(controllerID);
              const shape = this._shapes.get(shapeID);
              controllerBody.dispatchEvent({
                type: event,
                shape,
                position,
                normal,
                length,
              });
            }
            break;
        }
      });
    });

    this._physicsProxy = {
      initPhysX: pipeRemoteFunction(true, 'initPhysX'),
      update: pipeRemoteFunction(true, 'update'),
      startPhysX: pipeRemoteFunction(true, 'startPhysX'),
      addBody: pipeRemoteFunction(false, 'addBody'),
      updateBody: pipeRemoteFunction(false, 'updateBody'),
      removeBody: pipeRemoteFunction(false, 'removeBody'),
      createController: pipeRemoteFunction(false, 'createController'),
      updateController: pipeRemoteFunction(false, 'updateController'),
      removeController: pipeRemoteFunction(false, 'removeController'),
      addRaycastQuery: pipeRemoteFunction(false, 'addRaycastQuery'),
      updateRaycastQuery: pipeRemoteFunction(false, 'updateRaycastQuery'),
      removeRaycastQuery: pipeRemoteFunction(false, 'removeRaycastQuery'),
      _classGetter: pipeRemoteFunction(true, '_classFunc'),
      _classSetter: pipeRemoteFunction(false, '_classFunc'),
    };
    this._messageQueue.sendQueue();
  };

  // update kinematic bodies
  update() {
    // TODO: make this rely on kinematicBodies.size instead of bodies.size
    const now = Date.now();
    const deltaTime = now - lastUpdateTick;
    lastUpdateTick = now;
    let offset = 0;
    const kinematicArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.KINEMATIC_DATA_SIZE * this._kinematicBodies.size));
    this._kinematicBodies.forEach((body, id) => {
      const { translation, rotation } = body.transform;
      kinematicArray.set([id, translation.x, translation.y, translation.z, rotation.x, rotation.y, rotation.z, rotation.w], offset);
      offset += BufferConfig.KINEMATIC_DATA_SIZE;
    });
    offset = 0;
    const controllerArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.CONTROLLER_DATA_SIZE * this._controllerBodies.size));
    this._controllerBodies.forEach((body, id) => {
      const { x, y, z } = body.delta;
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        controllerArray.set([id, x, y, z], offset);
      }
      body.delta = { x: 0, y: 0, z: 0 };
      offset += BufferConfig.CONTROLLER_DATA_SIZE;
    });
    offset = 0;
    const raycastArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.RAYCAST_DATA_SIZE * this._raycasts.size));
    this._raycasts.forEach((raycast, id) => {
      const ori = raycast.origin;
      const dir = raycast.direction;
      raycastArray.set([id, ori.x, ori.y, ori.z, dir.x, dir.y, dir.z], offset);
      offset += BufferConfig.RAYCAST_DATA_SIZE;
    });
    this._physicsProxy.update([kinematicArray, controllerArray, raycastArray, deltaTime], [kinematicArray.buffer, controllerArray.buffer, raycastArray.buffer]);
    this._messageQueue.sendQueue();
  }

  startPhysX(start: boolean) {
    return this._physicsProxy.startPhysX([start]);
  }

  addBody(body: Body) {
    this._physicsProxy.addBody([
      clone({
        id: body.id,
        transform: body.transform,
        shapes: body.shapes,
        type: body.type,
      }),
    ]);
    return body;
  }

  removeBody(body: RigidBody) {
    this._bodies.delete(body.id);
    if (body.type === BodyType.KINEMATIC) {
      this._kinematicBodies.delete(body.id);
    }
    body.shapes.forEach((shape) => {
      this._shapes.delete(shape.id);
    });
    const id = body.id;
    this._physicsProxy.removeBody([{ id }]);
  }

  createController(controller: Controller) {
    this._physicsProxy.createController([
      clone({
        id: controller.id,
        config: controller._shape,
      }),
    ]);
    return controller;
  }

  removeController(body: Controller) {
    if (typeof body?.id === 'undefined') return;
    const id = body.id;
    this._physicsProxy.removeController([{ id }]);
    this._shapes.delete(body._shape.id);
    this._controllerBodies.delete(id);
    this._bodies.delete(id);
  }

  addRaycastQuery(raycastQuery: SceneQuery) {
    if (typeof raycastQuery.type === 'undefined') throw new Error('Scene raycast query must have a type!');
    if (typeof raycastQuery.origin === 'undefined') throw new Error('Scene raycast query must include origin!');
    if (typeof raycastQuery.direction === 'undefined') throw new Error('Scene raycast query must include direction!');

    raycastQuery.maxDistance = raycastQuery.maxDistance ?? 1;
    raycastQuery.maxHits = raycastQuery.maxHits ?? 1;

    const id = this._getNextAvailableRaycastID();
    this._raycasts.set(id, raycastQuery);
    raycastQuery.id = id;
    raycastQuery.hits = []; // init
    this._physicsProxy.addRaycastQuery([clone(raycastQuery)]);
    return raycastQuery;
  }

  updateRaycastQuery(id, newArgs: any) {
    const raycast = this._raycasts.get(id);
    if (!raycast) return;
    if (typeof newArgs.flags !== 'undefined') {
      raycast.flags = newArgs.flags;
    }
    if (typeof newArgs.maxDistance !== 'undefined') {
      raycast.maxDistance = newArgs.maxDistance;
    }
    if (typeof newArgs.maxHits !== 'undefined') {
      raycast.maxHits = newArgs.maxHits;
    }
    if (typeof newArgs.collisionMask !== 'undefined') {
      raycast.collisionMask = newArgs.collisionMask;
    }
    this._physicsProxy.updateRaycastQuery([clone({ id, ...newArgs })]);
  }

  removeRaycastQuery(raycastQuery: SceneQuery) {
    if (!this._raycasts.has(raycastQuery.id)) return;
    this._raycasts.delete(raycastQuery.id);
    this._physicsProxy.removeRaycastQuery([raycastQuery.id]);
  }

  addConstraint = async () => {
    // todo
  };

  removeConstraint = async () => {
    // todo
  };

  _getNextAvailableBodyID = () => {
    // todo, make this smart
    return nextAvailableBodyIndex++;
  };

  _getNextAvailableShapeID = () => {
    // todo, make this smart
    return nextAvailableShapeID++;
  };

  _getNextAvailableRaycastID = () => {
    // todo, make this smart
    return nextAvailableRaycastID++;
  };
}

const mergeTransformFragments = (original: Transform, fragments: any): Transform => {
  return {
    translation: fragments.translation ? mergeTranslationFragments(original.translation, fragments.translation) : original.translation,
    rotation: fragments.rotation ? mergeRotationFragments(original.rotation, fragments.rotation) : original.rotation,
    scale: original.scale,
    linearVelocity: fragments.linearVelocity ? mergeTranslationFragments(original.linearVelocity, fragments.linearVelocity) : original.linearVelocity,
    angularVelocity: fragments.angularVelocity ? mergeTranslationFragments(original.angularVelocity, fragments.angularVelocity) : original.angularVelocity,
  };
};

const mergeTranslationFragments = (original: Vec3, fragments: Vec3Fragment): Vec3 => {
  return {
    x: fragments.x ?? original.x,
    y: fragments.y ?? original.y,
    z: fragments.z ?? original.z,
  };
};

const mergeRotationFragments = (original: Quat, fragments: QuatFragment): Quat => {
  return {
    x: fragments.x ?? original.x,
    y: fragments.y ?? original.y,
    z: fragments.z ?? original.z,
    w: fragments.w ?? original.w,
  };
};

const pipeRemoteFunction = (awaitResponse: boolean, id: string) => {
  return (args, transferables) => {
    return awaitResponse ? PhysXInstance.instance._messageQueue.sendEvent(id, { args }, transferables) : 
    new Promise<any>((resolve) => {
      const uuid = generateUUID();
      const callback = ({ detail }) => {
        PhysXInstance.instance._messageQueue.removeEventListener(uuid, callback);
        resolve(detail.returnValue);
      };
      PhysXInstance.instance._messageQueue.addEventListener(uuid, callback);
      PhysXInstance.instance._messageQueue.sendEvent(id, { args, uuid }, transferables);
    });
  };
};

const generateUUID = (): string => {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join('-');
};

const bodyGetterFunctions = [
  'getAngularDamping',
  'getLinearDamping',
  'getAngularVelocity',
  'getLinearDamping',
  'getMass',
  'getRigidBodyFlags',
];

const bodySetterFunctions = [
  'setAngularDamping',
  'setLinearDamping',
  'setAngularVelocity',
  'setLinearVelocity',
  'setMass',
  'setCMassLocalPose',
  'clearForce',
  'clearTorque',
  'addForce',
  'addForceAtPos',
  'addForceAtLocalPos',
  'addLocalForceAtLocalPos',
  'addImpulseAtPos',
  'addImpulseAtLocalPos',
  'addLocalImpulseAtLocalPos',
  'applyImpulse',
  'applyLocalImpulse',
  'applyForce',
  'applyLocalForce',
  'addTorque',
  'setRigidBodyFlags',
  'setRigidBodyFlag',
  'setMassandUpdateInertia',
  'setMassSpaceInertiaTensor',
  'updateMassAndInertia',
];

const assignSetterFunction = (type, assignee, id, func) => {
  assignee[func] = (...args) => { PhysXInstance.instance._physicsProxy._classSetter(clone([type, func, id, ...args])); }
}

const assignGetterFunction = (type, assignee, id, func) => {
  assignee[func] = (...args) => { return PhysXInstance.instance._physicsProxy._classGetter(clone([type, func, id, ...args])); }
}

export class Body extends EventDispatcher implements RigidBody {
  id: number;
  transform: Transform;
  shapes: Shape[];
  userData: any;
  private _type: BodyType;
  [x: string]: any;

  constructor({ shapes, type, transform, userData }: { shapes?: Shape[]; type?: BodyType; transform?: Transform; userData?: any } = {}) {
    super();

    this.id = PhysXInstance.instance._getNextAvailableBodyID();
    this._type = type;
    this.transform = mergeTransformFragments(createNewTransform(), transform);
    this.userData = userData;

    bodySetterFunctions.forEach((func) => {
      assignSetterFunction('body', this, this.id, func);
    })

    bodyGetterFunctions.forEach((func) => {
      assignGetterFunction('body', this, this.id, func);
    })

    this.shapes = shapes ?? [];
    this.shapes.forEach((shape) => {
      if (!shape.options) shape.options = {};
      switch (shape.shape) {
        case SHAPES.Box:
          if (!shape.options?.boxExtents) shape.options.boxExtents = { x: 1, y: 1, z: 1 };
          break;
        case SHAPES.Capsule:
          if (!shape.options?.halfHeight) shape.options.halfHeight = 1; // yes, dont break here
        case SHAPES.Sphere:
          if (!shape.options?.radius) shape.options.radius = 0.5;
          break;
      }
      shape.id = PhysXInstance.instance._getNextAvailableShapeID();
      PhysXInstance.instance._shapes.set(shape.id, shape);
    });

    PhysXInstance.instance._bodies.set(this.id, this);
    if (this._type === BodyType.KINEMATIC) {
      PhysXInstance.instance._kinematicBodies.set(this.id, this);
    }
  }

  set type(value: BodyType) {
    if (this._type === BodyType.STATIC && typeof value !== 'undefined') {
      throw new Error('three-physx! Tried to change the type of a static object. This is not allowed, instead remove the body and create a new one.');
    }
    if (this._type === BodyType.DYNAMIC && value === BodyType.KINEMATIC) {
      PhysXInstance.instance._kinematicBodies.set(this.id, this);
      this._type = BodyType.KINEMATIC;
    } else if (this._type === BodyType.KINEMATIC && value === BodyType.DYNAMIC) {
      PhysXInstance.instance._kinematicBodies.delete(this.id);
      this._type = BodyType.DYNAMIC;
    }

    this.shapes.forEach((shape) => {
      shape._debugNeedsUpdate = true;
    });

    PhysXInstance.instance._physicsProxy.updateBody([{ id: this.id, type: value }]);
  }

  get type(): BodyType {
    return this._type;
  }

  updateTransform(newTransform) {
    if (this._type === BodyType.KINEMATIC) {
      this.transform = mergeTransformFragments(this.transform, newTransform);
      return;
    }
    PhysXInstance.instance._physicsProxy.updateBody([clone({ id: this.id, transform: newTransform })]);
  }
}

const DefaultControllerConfig: ControllerConfig = {
  userData: {},
  height: 1,
  radius: 0.25,
  stepOffset: 0.1,
  contactOffset: 0.01,
  slopeLimit: 1,
  invisibleWallHeight: 1,
};

export class Controller extends Body implements ControllerRigidBody {
  // internal
  _debugNeedsUpdate?: any;
  _shape: ControllerConfig;
  collisions: { down: boolean; sides: boolean; up: boolean };
  delta: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };

  constructor(config: ControllerConfig) {
    super({ type: BodyType.CONTROLLER, transform: { translation: mergeTranslationFragments({ x: 0, y: 0, z: 0 }, config.position) }, userData: config.userData });

    this._shape = {
      ...DefaultControllerConfig,
      ...config,
      id: PhysXInstance.instance._getNextAvailableShapeID(),
    };

    this.collisions = { down: false, sides: false, up: false };
    this.delta = new Vector3();
    this.velocity = new Vector3();

    PhysXInstance.instance._shapes.set(this._shape.id, this._shape as any);
    PhysXInstance.instance._controllerBodies.set(this.id, this);
  }
  updateTransform = (newTransform) => {
    PhysXInstance.instance._physicsProxy.updateController([clone({ id: this.id, position: newTransform.translation })]);
  };
  set type(value: BodyType) {}
  get type() {
    return BodyType.CONTROLLER;
  }

  resize(value: number) {
    this._shape.isCapsule ? (this._shape.height = value) : (this._shape.halfHeight = value);
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, resize: value }]);
    this._debugNeedsUpdate = true;
  }

  get height() {
    return this._shape.height;
  }
  set height(value: number) {
    this._shape.height = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, height: value }]);
    this._debugNeedsUpdate = true;
  }
  get radius() {
    return this._shape.radius;
  }
  set radius(value: number) {
    this._shape.radius = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, radius: value }]);
    this._debugNeedsUpdate = true;
  }
  get climbingMode() {
    return this._shape.climbingMode;
  }
  set climbingMode(value: number) {
    this._shape.climbingMode = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, climbingMode: value }]);
    this._debugNeedsUpdate = true;
  }
  get halfForwardExtent() {
    return this._shape.halfForwardExtent;
  }
  set halfForwardExtent(value: number) {
    this._shape.halfForwardExtent = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, halfForwardExtent: value }]);
    this._debugNeedsUpdate = true;
  }
  get halfHeight() {
    return this._shape.halfHeight;
  }
  set halfHeight(value: number) {
    this._shape.halfHeight = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, halfHeight: value }]);
    this._debugNeedsUpdate = true;
  }
  get halfSideExtent() {
    return this._shape.halfSideExtent;
  }
  set halfSideExtent(value: number) {
    this._shape.halfSideExtent = value;
    PhysXInstance.instance._physicsProxy.updateController([{ id: this.id, halfSideExtent: value }]);
    this._debugNeedsUpdate = true;
  }

  // TODO: implement rest of ControllerConfig
}

export class RaycastQuery {
  constructor() {}
}

export { CapsuleBufferGeometry } from './utils/CapsuleBufferGeometry';
export { DebugRenderer } from './utils/DebugRenderer';
export * from './types/ThreePhysX';
export * from './threeToPhysX';
export { PhysXManager, receiveWorker } from './worker';
