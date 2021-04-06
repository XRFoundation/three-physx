import * as BufferConfig from "./BufferConfig";
import { MessageQueue } from "./utils/MessageQueue";

import { PhysXConfig, PhysXInteface, PhysXBodyConfig, PhysXBodyTransform, PhysXBodyData, PhysXBodyType, RigidBodyProxy, Object3DBody } from "./types/ThreePhysX";
import { Object3D, Quaternion, Vector3 } from "three";
import { threeToPhysX } from "./threeToPhysX";

let nextAvailableBodyIndex = 0;
const arrayBuffer = new ArrayBuffer(BufferConfig.ARRAY_LENGTH);
let objectMatricesFloatArray = new Float32Array(arrayBuffer);

export class PhysXInstance implements PhysXInteface {
  static instance: PhysXInstance;
  worker: Worker;
  onUpdate: any;
  physicsProxy: PhysXInteface;

  bodies: Map<number, RigidBodyProxy> = new Map<number, RigidBodyProxy>();

  constructor(worker: Worker, onUpdate: any) {
    PhysXInstance.instance = this;
    this.worker = worker;
    this.onUpdate = onUpdate;
  }

  initPhysX = async (config: PhysXConfig): Promise<void> => {
    const messageQueue = new MessageQueue(this.worker);
    await new Promise((resolve) => {
      messageQueue.addEventListener('init', () => {
        resolve(true)
      })
    })
    messageQueue.addEventListener('data', (ev) => {
      const buffer: Float32Array = ev.detail;
      this.bodies.forEach((rigidBody, id) => {
        const offset = id * BufferConfig.BODY_DATA_SIZE;
        rigidBody.transform.translation.fromArray(buffer, offset);
        rigidBody.transform.rotation.fromArray(buffer, offset + 3);
        if(rigidBody.bodyConfig.bodyOptions.type === PhysXBodyType.DYNAMIC) {
          rigidBody.transform.linearVelocity.fromArray(buffer, offset + 8);
          rigidBody.transform.angularVelocity.fromArray(buffer, offset + 12);
        }
      })
      this.onUpdate();
    })

    this.physicsProxy = {
      initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX', [objectMatricesFloatArray.buffer]),
      startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
      addBody: pipeRemoteFunction(messageQueue, 'addBody'),
      removeBody: pipeRemoteFunction(messageQueue, 'removeBody'),
      addConstraint: pipeRemoteFunction(messageQueue, 'addConstraint'),
      removeConstraint: pipeRemoteFunction(messageQueue, 'removeConstraint'),
      enableDebug: pipeRemoteFunction(messageQueue, 'enableDebug'),
      resetDynamicBody: pipeRemoteFunction(messageQueue, 'resetDynamicBody'),
      activateBody: pipeRemoteFunction(messageQueue, 'activateBody'),
    } as PhysXInteface

    await this.physicsProxy.initPhysX(config, objectMatricesFloatArray)
  }

  startPhysX = async (start: boolean) => {
    return this.physicsProxy.startPhysX(start)
  }

  addBody = async (object: Object3D) => {
    const id = this._getNextAvailableID();
    const bodyConfig = threeToPhysX(object, id);
    await this.physicsProxy.addBody(bodyConfig)
    this.bodies.set(id, (object as Object3DBody).body);
    return bodyConfig;
  }

  updateBody = async (object: Object3D, options: any) => {
    const id = (object as Object3DBody).body.id;
    await this.physicsProxy.updateBody({ id, options })
    return;
  }

  removeBody = async (object: Object3D) => {
    const id = (object as Object3DBody).body.id;
    await this.physicsProxy.removeBody({ id });
    delete this.bodies[id];
    return;
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

  _getNextAvailableID = () => {
    indexOfSmallest(Object.keys(this.bodies))
    return nextAvailableBodyIndex++;
  }
  
}

const indexOfSmallest = (a) => {
  var lowest = 0;
  for (var i = 1; i < a.length; i++) {
   if (a[i] < a[lowest]) lowest = i;
  }
  return lowest;
 }

const pipeRemoteFunction = (messageQueue: MessageQueue, id: string, transferrables?: Transferable[]) => {
  return (...args) => {
    return new Promise<any>((resolve) => {
      const uuid = generateUUID();
      messageQueue.addEventListener(uuid, ({ detail }) => {
        resolve(detail.returnValue);
      });
      messageQueue.sendEvent(id, { args, uuid }, transferrables);
    })
  }
}

const generateUUID = (): string => {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}

export { threeToPhysXModelDescription } from './threeToPhysXModelDescription'
export type { PhysXBodyConfig };