import type { PhysXConfig, PhysXInteface } from "./worker";
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
  physics.initPhysX(config);
  return physics;
}

const pipeRemoteFunction = (messageQueue: MessageQueue, id: string) => {
  return (...args) => {
    messageQueue.sendEvent(id, args);
  }
}

const getTransformsFromBuffer = (buffer: ArrayBuffer) => {
  return buffer;
}