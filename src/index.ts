import type { PhysXConfig, PhysXInteface, PhysXBodyConfig } from "./types/threePhysX";
import { MessageQueue } from "./utils/MessageQueue";
const BUFFER_CONFIG = {
  HEADER_LENGTH: 2,
  MAX_BODIES: 10000,
  MATRIX_OFFSET: 0,
  LINEAR_VELOCITY_OFFSET: 16,
  ANGULAR_VELOCITY_OFFSET: 17,
  COLLISIONS_OFFSET: 18,
  BODY_DATA_SIZE: 26
};

export const initializePhysX = async (worker: Worker, onUpdate: any, config: PhysXConfig): Promise<PhysXInteface> => {
  const messageQueue = new MessageQueue(worker);
  await new Promise((resolve) => {
    messageQueue.addEventListener('init', () => {
      resolve(true)
    })
  })
  messageQueue.addEventListener('data', ({ detail }: { detail: Float32Array }) => {
    onUpdate(getTransformsFromBuffer(detail))
  })
  const physics = {
    addBody: pipeRemoteFunction(messageQueue, 'addBody'),
    initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX'),
    startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
  }
  // const arrayBuffer = new ArrayBuffer(
  //   4 * BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES + //matrices
  //     4 * BUFFER_CONFIG.MAX_BODIES //velocities
  // );
  // let objectMatricesFloatArray = new Float32Array(arrayBuffer);
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