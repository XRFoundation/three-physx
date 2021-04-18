import * as BufferConfig from './BufferConfig';
import { MessageQueue } from './utils/MessageQueue';

import { PhysXConfig, PhysXBodyType, RigidBodyProxy, Object3DBody, PhysXShapeConfig, BodyConfig, ShapeConfig, ControllerConfig, SceneQuery, SceneQueryType, CollisionEvents, ControllerEvents } from './types/ThreePhysX';
import { Object3D, Quaternion, Scene, Vector3 } from 'three';
import { createPhysXBody, createPhysXShapes, getTransformFromWorldPos } from './threeToPhysX';
import { proxyEventListener } from './utils/proxyEventListener';

let nextAvailableBodyIndex = 0;
let nextAvailableShapeID = 0;
let nextAvailableRaycastID = 0;

export class PhysXInstance {
  static instance: PhysXInstance;
  worker: Worker;
  onUpdate: any;
  physicsProxy: any;

  bodies: Map<number, RigidBodyProxy> = new Map<number, RigidBodyProxy>();
  shapes: Map<number, PhysXShapeConfig> = new Map<number, PhysXShapeConfig>();
  kinematicBodies: Map<number, Object3DBody> = new Map<number, Object3DBody>();
  controllerBodies: Map<number, RigidBodyProxy> = new Map<number, RigidBodyProxy>();
  raycasts: Map<number, SceneQuery> = new Map<number, SceneQuery>();
  scene: Scene;

  constructor(worker: Worker, onUpdate: any, scene: Scene) {
    PhysXInstance.instance = this;
    this.scene = scene;
    this.worker = worker;
    this.onUpdate = onUpdate;
  }

  initPhysX = async (config: PhysXConfig): Promise<void> => {
    const messageQueue = new MessageQueue(this.worker);
    await new Promise((resolve) => {
      messageQueue.addEventListener('init', () => {
        resolve(true);
      });
    });
    messageQueue.addEventListener('data', (ev) => {
      let offset = 0;
      const { raycastResults, bodyArray } = ev.detail;
      while (offset < bodyArray.length) {
        const body = this.bodies.get(bodyArray[offset]);
        if (body) {
          if (body.options.type === PhysXBodyType.CONTROLLER) {
            body.transform.translation.x = bodyArray[offset + 1];
            body.transform.translation.y = bodyArray[offset + 2];
            body.transform.translation.z = bodyArray[offset + 3];
            body.controller.collisions = {
              down: Boolean(bodyArray[offset + 4]),
              sides: Boolean(bodyArray[offset + 5]),
              up: Boolean(bodyArray[offset + 6]),
            };
          } else if (body.options.type === PhysXBodyType.DYNAMIC) {
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
      this.raycasts.forEach((raycastQuery) => {
        raycastQuery.hits = raycastResults[raycastQuery.id] ?? [];
      });
      this.onUpdate();
    });
    messageQueue.addEventListener('colliderEvent', ({ detail }) => {
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
                const shapeA = this.shapes.get(idA);
                const shapeB = this.shapes.get(idB);
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
              const controllerBody: RigidBodyProxy = this.bodies.get(controllerID);
              const shape = this.shapes.get(shapeID);
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

    this.physicsProxy = {
      initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX'),
      update: pipeRemoteFunction(messageQueue, 'update'),
      startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
      addBody: pipeRemoteFunction(messageQueue, 'addBody'),
      updateBody: pipeRemoteFunction(messageQueue, 'updateBody'),
      removeBody: pipeRemoteFunction(messageQueue, 'removeBody'),
      addController: pipeRemoteFunction(messageQueue, 'addController'),
      updateController: pipeRemoteFunction(messageQueue, 'updateController'),
      removeController: pipeRemoteFunction(messageQueue, 'removeController'),
      addRaycastQuery: pipeRemoteFunction(messageQueue, 'addRaycastQuery'),
      updateRaycastQuery: pipeRemoteFunction(messageQueue, 'updateRaycastQuery'),
      removeRaycastQuery: pipeRemoteFunction(messageQueue, 'removeRaycastQuery'),
    };

    await this.physicsProxy.initPhysX([config]);
  };

  // update kinematic bodies
  update = async (delta: number) => {
    // TODO: make this rely on kinematicBodies.size instead of bodies.size
    let offset = 0;
    const kinematicArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.KINEMATIC_DATA_SIZE * this.kinematicBodies.size));
    this.kinematicBodies.forEach((obj, id) => {
      obj.body.transform = getTransformFromWorldPos(obj);
      const transform = obj.body.transform;
      kinematicArray.set([id, transform.translation.x, transform.translation.y, transform.translation.z, transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w], offset);
      offset += BufferConfig.KINEMATIC_DATA_SIZE;
    });
    offset = 0;
    const controllerArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.CONTROLLER_DATA_SIZE * this.controllerBodies.size));
    this.controllerBodies.forEach((body, id) => {
      const { x, y, z } = body.controller.delta;
      controllerArray.set([id, x, y, z, delta], offset);
      body.controller.delta = { x: 0, y: 0, z: 0 };
      offset += BufferConfig.CONTROLLER_DATA_SIZE;
    });
    offset = 0;
    const raycastArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.RAYCAST_DATA_SIZE * this.raycasts.size));
    this.raycasts.forEach((raycast, id) => {
      const { x, y, z } = raycast.origin;
      raycastArray.set([id, x, y, z]);
      offset += BufferConfig.RAYCAST_DATA_SIZE;
    });
    this.physicsProxy.update([kinematicArray, controllerArray, raycastArray], [kinematicArray.buffer, controllerArray.buffer, raycastArray.buffer]);
  };

  startPhysX = async (start: boolean) => {
    return this.physicsProxy.startPhysX([start]);
  };

  addBody = async (object: Object3D, shapes?: PhysXShapeConfig[]) => {
    const id = this._getNextAvailableBodyID();
    if (shapes) {
      shapes.forEach((shape) => {
        shape.id = this._getNextAvailableShapeID();
        this.shapes.set(shape.id, shape);
      });
    }
    createPhysXBody(object, id, shapes || this.addShapes(object));
    await this.physicsProxy.addBody([(object as Object3DBody).body]);
    (object as Object3DBody).body.shapes.forEach((shape) => {
      (shape as any).body = (object as Object3DBody).body;
    });
    proxyEventListener((object as Object3DBody).body);
    this.bodies.set(id, (object as Object3DBody).body);
    if ((object as Object3DBody).body.options.type === PhysXBodyType.KINEMATIC) {
      this.kinematicBodies.set(id, object as Object3DBody);
    }
    return (object as Object3DBody).body;
  };

  addShapes = (object) => {
    const shapes = createPhysXShapes(object);
    shapes.forEach((shape) => {
      this.shapes.set(shape.id, shape);
    });
    return shapes;
  };

  updateBody = async (object: Object3DBody | any, options: BodyConfig) => {
    if (typeof object.body === 'undefined') {
      throw new Error('three-physx! Tried to update a body that does not exist.');
    }
    if (object.body.options.type === PhysXBodyType.STATIC && typeof options.type !== 'undefined') {
      throw new Error('three-physx! Tried to change the type of a static object. This is not allowed, instead remove the body and create a new one.');
    }
    if (object.body.options.type === PhysXBodyType.DYNAMIC && options.type === PhysXBodyType.KINEMATIC) {
      this.kinematicBodies.set(object.body.id, object as Object3DBody);
      object.body.options.type = PhysXBodyType.KINEMATIC;
    } else if (object.body.options.type === PhysXBodyType.KINEMATIC && options.type === PhysXBodyType.DYNAMIC) {
      this.kinematicBodies.delete(object.body.id);
      object.body.options.type = PhysXBodyType.DYNAMIC;
    }
    const id = (object as Object3DBody).body.id;
    (object as Object3DBody).body.shapes.forEach((shape) => {
      shape._debugNeedsUpdate = true;
    });
    await this.physicsProxy.updateBody([{ id, options }]);
    return;
  };

  removeBody = async (object: Object3DBody) => {
    if (!object.body) return;
    this.bodies.delete(object.body.id);
    if (object.body.options.type === PhysXBodyType.KINEMATIC) {
      this.kinematicBodies.delete(object.body.id);
    }
    object.body.shapes.forEach((shape) => {
      this.shapes.delete(shape.id);
    })
    const id = object.body.id;
    delete object.body;
    await this.physicsProxy.removeBody([{ id }]);
  };

  addController = async (object: Object3D, options?: ControllerConfig) => {
    const id = this._getNextAvailableBodyID();
    createPhysXBody(object, id, []);
    const shape = options ?? {};
    if (typeof options !== 'undefined') {
      if (options.isCapsule) {
        shape.height = options.height ?? 1;
        shape.radius = options.radius ?? 0.5;
      } else {
        shape.halfForwardExtent = options.halfForwardExtent ?? 0.5;
        shape.halfHeight = options.halfHeight ?? 0.5;
        shape.halfSideExtent = options.halfSideExtent ?? 0.5;
      }
    }
    shape.id = this._getNextAvailableShapeID();
    shape.body = (object as Object3DBody).body;
    (object as Object3DBody).body.controller = {
      config: shape,
      collisions: { down: false, sides: false, up: false },
      delta: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    };
    this.shapes.set(shape.id, shape as any);
    await this.physicsProxy.addController([
      {
        id: (object as Object3DBody).body.id,
        config: shape,
      },
    ]);
    (object as Object3DBody).body.options.type = PhysXBodyType.CONTROLLER;
    this.controllerBodies.set(id, (object as Object3DBody).body);
    proxyEventListener((object as Object3DBody).body);
    this.bodies.set(id, (object as Object3DBody).body);
    return (object as Object3DBody).body;
  };

  updateController = async (object: Object3DBody, config: ControllerConfig) => {
    if (typeof object?.body?.id === 'undefined') return;
    if (!this.controllerBodies.has(object.body.id)) return;
    object.body.controller._debugNeedsUpdate = true;
    if (typeof config.height !== 'undefined') {
      object.body.controller.config.height = config.height;
    }
    if (typeof config.resize !== 'undefined') {
      if (typeof object.body.controller.config.height !== 'undefined') {
        object.body.controller.config.height = config.resize;
      }
      if (typeof object.body.controller.config.halfHeight !== 'undefined') {
        object.body.controller.config.halfHeight = config.resize * 2;
      }
    }
    if (typeof config.radius !== 'undefined') {
      object.body.controller.config.radius = config.radius;
    }
    if (typeof config.climbingMode !== 'undefined') {
      object.body.controller.config.climbingMode = config.climbingMode;
    }
    if (typeof config.halfForwardExtent !== 'undefined') {
      object.body.controller.config.halfForwardExtent = config.halfForwardExtent;
    }
    if (typeof config.halfHeight !== 'undefined') {
      object.body.controller.config.halfHeight = config.halfHeight;
    }
    if (typeof config.halfSideExtent !== 'undefined') {
      object.body.controller.config.halfSideExtent = config.halfSideExtent;
    }
    await this.physicsProxy.updateController([
      {
        id: object.body.id,
        config,
      },
    ]);
  };

  removeController = async (id) => {
    if (await this.physicsProxy.removeController([{ id }])) {
      const body = this.controllerBodies.get(id);
      this.shapes.delete(body.controller.config.id);
      this.controllerBodies.delete(id);
      this.bodies.delete(id);
    }
  };

  addRaycastQuery = async (raycastQuery: SceneQuery) => {
    if (typeof raycastQuery.type === 'undefined') throw new Error('Scene raycast query must have a type!');
    if (typeof raycastQuery.origin === 'undefined') throw new Error('Scene raycast query must include origin!');
    if (typeof raycastQuery.direction === 'undefined') throw new Error('Scene raycast query must include direction!');

    raycastQuery.flags = raycastQuery.flags ?? 1;
    raycastQuery.maxDistance = raycastQuery.maxDistance ?? 1;
    raycastQuery.maxHits = raycastQuery.maxHits ?? 1;

    const id = this._getNextAvailableRaycastID();
    this.raycasts.set(id, raycastQuery);
    raycastQuery.id = id;
    await this.physicsProxy.addRaycastQuery([raycastQuery]);
    return raycastQuery;
  };

  updateRaycastQuery = async (raycastQuery: any) => {
    if (!this.raycasts.has(raycastQuery.id)) return;
    // todo
    // await this.physicsProxy.updateRaycastQuery([raycastQuery.id]);
  };

  removeRaycastQuery = async (raycastQuery: SceneQuery) => {
    if (!this.raycasts.has(raycastQuery.id)) return;
    this.raycasts.delete(raycastQuery.id);
    await this.physicsProxy.removeRaycastQuery([raycastQuery.id]);
  };

  addConstraint = async () => {
    // todo
  };

  removeConstraint = async () => {
    // todo
  };

  private _getNextAvailableBodyID = () => {
    // todo, make this smart
    return nextAvailableBodyIndex++;
  };

  _getNextAvailableShapeID = () => {
    // todo, make this smart
    return nextAvailableShapeID++;
  };

  private _getNextAvailableRaycastID = () => {
    // todo, make this smart
    return nextAvailableRaycastID++;
  };
}

const pipeRemoteFunction = (messageQueue: MessageQueue, id: string) => {
  return (args, transferables) => {
    return new Promise<any>((resolve) => {
      const uuid = generateUUID();
      const callback = ({ detail }) => {
        messageQueue.removeEventListener(uuid, callback);
        resolve(detail.returnValue);
      };
      messageQueue.addEventListener(uuid, callback);
      messageQueue.sendEvent(id, { args, uuid }, transferables);
    });
  };
};

const generateUUID = (): string => {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join('-');
};

export { CapsuleBufferGeometry } from './utils/CapsuleBufferGeometry';
export { DebugRenderer } from './utils/DebugRenderer';
export * from './types/ThreePhysX';
export * from './threeToPhysX';
