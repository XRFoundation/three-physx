import type { PhysXConfig, PhysXInteface, PhysXBodyConfig } from "./worker";
import { MessageQueue } from "./utils/MessageQueue";

export const initializePhysX = async (worker: Worker, onUpdate: any, config: PhysXConfig): Promise<PhysXInteface> => {
  const messageQueue = new MessageQueue(worker);
  await new Promise((resolve) => {
    messageQueue.addEventListener('init', () => {
      resolve(true)
    })
  })
  messageQueue.addEventListener('data', ({ detail }: { detail: Uint8Array }) => {
    onUpdate(getTransformsFromBuffer(detail))
  })
  const physics = {
    addBody: pipeRemoteFunction(messageQueue, 'addBody'),
    initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX'),
    startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
  }
  await physics.initPhysX(config);
  return physics;
}

const pipeRemoteFunction = (messageQueue: MessageQueue, id: string) => {
  return (...args) => {
    return new Promise<any>((resolve) => {
      const uuid = generateUUID();
      messageQueue.addEventListener(uuid, ({ detail }) => {
        resolve(detail.returnValue);
      });
      messageQueue.sendEvent(id, { args, uuid });
    })
  }
}

const getTransformsFromBuffer = (buffer: ArrayBuffer) => {
  return buffer;
}

const generateUUID = (): string => {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}

export { threeToPhysXModelDescription } from './threeToPhysXModelDescription'
export type { PhysXBodyConfig };