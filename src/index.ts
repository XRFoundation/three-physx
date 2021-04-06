import * as BufferConfig from "./BufferConfig";
import { MessageQueue } from "./utils/MessageQueue";

import type { PhysXConfig, PhysXInteface, PhysXBodyConfig } from "./types/ThreePhysX";
import type { Object3D } from "three";
import { threeToPhysX } from "./threeToPhysX";

let nextAvailableBodyIndex = 0;
const arrayBuffer = new ArrayBuffer(BufferConfig.ARRAY_LENGTH);
let objectMatricesFloatArray = new Float32Array(arrayBuffer);

export class PhysXInstance implements PhysXInteface {
  static instance: PhysXInstance;
  worker: Worker;
  onUpdate: any;
  physicsProxy: PhysXInteface;

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
    messageQueue.addEventListener('data', ({ detail }: { detail: Float32Array }) => {
      this.onUpdate(detail)
    })

    this.physicsProxy = {
      addBody: pipeRemoteFunction(messageQueue, 'addBody'),
      initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX', [objectMatricesFloatArray.buffer]),
      startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
    } as PhysXInteface

    await this.physicsProxy.initPhysX(config, objectMatricesFloatArray)
  }

  addBody = async (object: Object3D) => {
    const bodyData = threeToPhysX(object, nextAvailableBodyIndex++);
    await this.physicsProxy.addBody(bodyData)
    return bodyData;
  }

  startPhysX = async (start: boolean) => {
    return this.physicsProxy.startPhysX(start)
  }
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