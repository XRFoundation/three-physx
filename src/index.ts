import * as BufferConfig from './BufferConfig';
import { MessageQueue } from './utils/MessageQueue';

import { PhysXConfig, PhysXBodyType, RigidBodyProxy, Object3DBody, PhysXShapeConfig, PhysXEvents, BodyConfig, ShapeConfig, ControllerConfig } from './types/ThreePhysX';
import { Object3D, Quaternion, Scene, Vector3 } from 'three';
import { createPhysXBody, createPhysXShapes, getTransformFromWorldPos } from './threeToPhysX';
import { proxyEventListener } from './utils/proxyEventListener';

let nextAvailableBodyIndex = 0;
let nextAvailablShapeID = 0;

export class PhysXInstance {
  static instance: PhysXInstance;
  worker: Worker;
  onUpdate: any;
  physicsProxy: any;

  bodies: Map<number, RigidBodyProxy> = new Map<number, RigidBodyProxy>();
  shapes: Map<number, PhysXShapeConfig> = new Map<number, PhysXShapeConfig>();
  kinematicBodies: Map<number, Object3DBody> = new Map<number, Object3DBody>();
  controllerBodies: Map<number, any> = new Map<number, any>();
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
      while (offset < ev.detail.length) {
        const body = this.bodies.get(ev.detail[offset]);
        if (body) {
          if (body.options.type === PhysXBodyType.CONTROLLER) {
            body.transform.translation.x = ev.detail[offset + 1];
            body.transform.translation.y = ev.detail[offset + 2];
            body.transform.translation.z = ev.detail[offset + 3];
            body.controller.collisions = {
              down: Boolean(ev.detail[offset + 4]),
              sides: Boolean(ev.detail[offset + 5]),
              up: Boolean(ev.detail[offset + 6]),
            };
          } else if (body.options.type === PhysXBodyType.DYNAMIC) {
            body.transform.translation.x = ev.detail[offset + 1];
            body.transform.translation.y = ev.detail[offset + 2];
            body.transform.translation.z = ev.detail[offset + 3];
            body.transform.rotation.x = ev.detail[offset + 4];
            body.transform.rotation.y = ev.detail[offset + 5];
            body.transform.rotation.z = ev.detail[offset + 6];
            body.transform.rotation.w = ev.detail[offset + 7];
            body.transform.linearVelocity.x = ev.detail[offset + 8];
            body.transform.linearVelocity.y = ev.detail[offset + 9];
            body.transform.linearVelocity.z = ev.detail[offset + 10];
            body.transform.angularVelocity.x = ev.detail[offset + 11];
            body.transform.angularVelocity.y = ev.detail[offset + 12];
            body.transform.angularVelocity.z = ev.detail[offset + 13];
          }
        }
        offset += BufferConfig.BODY_DATA_SIZE;
      }
      this.onUpdate();
    });
    messageQueue.addEventListener('colliderEvent', ({ detail }) => {
      detail.forEach((collision) => {
        switch (collision.event) {
          case PhysXEvents.COLLISION_START:
          case PhysXEvents.COLLISION_PERSIST:
          case PhysXEvents.COLLISION_END:
          case PhysXEvents.TRIGGER_START:
          case PhysXEvents.TRIGGER_END:
            {
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
            }
            break;
          case PhysXEvents.CONTROLLER_SHAPE_HIT:
          case PhysXEvents.CONTROLLER_COLLIDER_HIT:
          case PhysXEvents.CONTROLLER_OBSTACLE_HIT:
            {
              const { event, id, position, normal, length } = collision;
              const controllerBody: RigidBodyProxy = this.controllerBodies.get(id).body;
              controllerBody.dispatchEvent({
                type: event,
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
      addConstraint: pipeRemoteFunction(messageQueue, 'addConstraint'),
      removeConstraint: pipeRemoteFunction(messageQueue, 'removeConstraint'),
      enableDebug: pipeRemoteFunction(messageQueue, 'enableDebug'),
      resetDynamicBody: pipeRemoteFunction(messageQueue, 'resetDynamicBody'),
      activateBody: pipeRemoteFunction(messageQueue, 'activateBody'),
    };

    await this.physicsProxy.initPhysX([config]);
  };

  // update kinematic bodies
  update = async (delta: number) => {
    // TODO: make this rely on kinematicBodies.size instead of bodies.size
    let offset = 0;
    const kinematicArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.KINEMATIC_DATA_SIZE * this.kinematicBodies.size));
    const kinematicIDs = [];
    this.kinematicBodies.forEach((obj, id) => {
      kinematicIDs.push(id);
      obj.body.transform = getTransformFromWorldPos(obj);
      const transform = obj.body.transform;
      kinematicArray.set([id, transform.translation.x, transform.translation.y, transform.translation.z, transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w], offset);
      offset += BufferConfig.KINEMATIC_DATA_SIZE;
    });
    offset = 0;
    const controllerArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.CONTROLLER_DATA_SIZE * this.controllerBodies.size));
    const controllerIDs = [];
    this.controllerBodies.forEach((obj, id) => {
      controllerIDs.push(id);
      const { x, y, z } = obj.body.controller.delta;
      controllerArray.set([id, x, y, z, delta], offset);
      obj.body.controller.delta = { x: 0, y: 0, z: 0 };
      offset += BufferConfig.CONTROLLER_DATA_SIZE;
    });
    this.physicsProxy.update([kinematicArray, controllerArray], [kinematicArray.buffer, controllerArray.buffer]);
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
    createPhysXBody(object, id, shapes || this.addShapes(object, id));
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

  addShapes = (object, id) => {
    const shapes = createPhysXShapes(object, id);
    shapes.forEach((shape) => {
      this.shapes.set(shape.id, shape);
    });
    return shapes;
  };

  updateBody = async (object: Object3DBody | any, options: BodyConfig) => {
    // console.log(object)
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
    await this.physicsProxy.updateBody([{ id, options }]);
    return;
  };

  removeBody = async (object: Object3DBody | any) => {
    if (typeof object.body === 'undefined') {
      throw new Error('three-physx! Tried to update a body that does not exist.');
    }
    const id = (object as Object3DBody).body.id;
    await this.physicsProxy.removeBody([{ id }]);
    this.bodies.delete(id);
    return;
  };

  addController = async (object: Object3D, options?: ControllerConfig) => {
    const id = this._getNextAvailableBodyID();
    createPhysXBody(object, id, []);
    (object as Object3DBody).body.controller = {
      config: { id: this._getNextAvailableShapeID(), height: 1, radius: 0.25 },
      collisions: { down: false, sides: false, up: false },
      delta: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    };
    await this.physicsProxy.addController([
      {
        id: (object as Object3DBody).body.id,
        config: (object as Object3DBody).body.controller.config,
      },
    ]);
    (object as Object3DBody).body.options.type = PhysXBodyType.CONTROLLER;
    this.controllerBodies.set(id, object as Object3DBody);
    proxyEventListener((object as Object3DBody).body);
    this.bodies.set(id, (object as Object3DBody).body);
    return (object as Object3DBody).body;
  };

  updateController = async (controller: any, config: ControllerConfig) => {
    if (typeof controller?.body?.id === 'undefined') return;
    if (!this.controllerBodies.has(controller.body.id)) return;

    await this.physicsProxy.updateController([
      {
        id: (controller as Object3DBody).body.id,
        config,
      },
    ]);
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

  private _getNextAvailableBodyID = () => {
    // todo, make this good
    return nextAvailableBodyIndex++;
  };

  _getNextAvailableShapeID = () => {
    // todo, make this good
    return nextAvailablShapeID++;
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

export { threeToPhysXModelDescription } from './threeToPhysXModelDescription';
