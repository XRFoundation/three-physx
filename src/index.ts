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
      const array: Float32Array = ev.detail;
      this.bodies.forEach((rigidBody, id) => {
        const offset = id * BufferConfig.BODY_DATA_SIZE;
        if (rigidBody.options.type === PhysXBodyType.CONTROLLER) {
          rigidBody.transform.translation.x = array[offset];
          rigidBody.transform.translation.y = array[offset + 1];
          rigidBody.transform.translation.z = array[offset + 2];
          rigidBody.controller.collisions = {
            down: Boolean(array[offset + 3]),
            sides: Boolean(array[offset + 4]),
            up: Boolean(array[offset + 5]),
          };
        } else if (rigidBody.options.type === PhysXBodyType.DYNAMIC) {
          rigidBody.transform.translation.x = array[offset];
          rigidBody.transform.translation.y = array[offset + 1];
          rigidBody.transform.translation.z = array[offset + 2];
          rigidBody.transform.rotation.x = array[offset + 3];
          rigidBody.transform.rotation.y = array[offset + 4];
          rigidBody.transform.rotation.z = array[offset + 5];
          rigidBody.transform.rotation.w = array[offset + 6];
          if (rigidBody.options.type === PhysXBodyType.DYNAMIC) {
            rigidBody.transform.linearVelocity.x = array[offset + 7];
            rigidBody.transform.linearVelocity.y = array[offset + 8];
            rigidBody.transform.linearVelocity.z = array[offset + 9];
            rigidBody.transform.angularVelocity.x = array[offset + 10];
            rigidBody.transform.angularVelocity.y = array[offset + 11];
            rigidBody.transform.angularVelocity.z = array[offset + 12];
          }
        }
      });
      this.onUpdate();
    });
    messageQueue.addEventListener('colliderEvent', ({ detail }) => {
      switch (detail.event) {
        case PhysXEvents.COLLISION_START:
        case PhysXEvents.COLLISION_PERSIST:
        case PhysXEvents.COLLISION_END:
        case PhysXEvents.TRIGGER_START:
        case PhysXEvents.TRIGGER_END:
          {
            const { event, idA, idB } = detail;
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
            const { event, id, position, normal, length } = detail;
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
  update = async () => {
    // TODO: make this rely on kinematicBodies.size instead of bodies.size
    const kinematicArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.BODY_DATA_SIZE * this.bodies.size));
    const kinematicIDs = [];
    this.kinematicBodies.forEach((obj, id) => {
      kinematicIDs.push(id);
      obj.body.transform = getTransformFromWorldPos(obj);
      const transform = obj.body.transform;
      kinematicArray.set([transform.translation.x, transform.translation.y, transform.translation.z, transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w], id * BufferConfig.BODY_DATA_SIZE);
    });
    const controllerIDs = [];
    this.controllerBodies.forEach((obj, id) => {
      controllerIDs.push(id);
      const { x, y, z } = obj.body.controller.delta;
      kinematicArray.set([x, y, z, 1 / 60], id * BufferConfig.BODY_DATA_SIZE);
      obj.body.controller.delta = { x: 0, y: 0, z: 0 };
    });
    this.physicsProxy.update([kinematicIDs, controllerIDs, kinematicArray], [kinematicArray.buffer]);
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
    await this.physicsProxy.addController([(object as Object3DBody).body]);
    (object as Object3DBody).body.options.type = PhysXBodyType.CONTROLLER;
    this.controllerBodies.set(id, object as Object3DBody);
    proxyEventListener((object as Object3DBody).body);
    this.bodies.set(id, (object as Object3DBody).body);
    return (object as Object3DBody).body;
  };

  updateController = async () => {
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

  private _getNextAvailableBodyID = () => {
    // todo, make this good
    indexOfSmallest(Object.keys(this.bodies));
    return nextAvailableBodyIndex++;
  };

  _getNextAvailableShapeID = () => {
    // todo, make this good
    return nextAvailablShapeID++;
  };
}

const indexOfSmallest = (a) => {
  var lowest = 0;
  for (var i = 1; i < a.length; i++) {
    if (a[i] < a[lowest]) lowest = i;
  }
  return lowest;
};

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
