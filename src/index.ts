import * as Comlink from 'comlink'
import type { PhysXManager } from './worker';

let _physxInteface: Comlink.RemoteObject<PhysXManager>;
const _entityArray: number[] = [];

export const getPhysX = () => {
  return _physxInteface;
}

export const initializePhysX = async (worker: Worker, wasmPath: string) => {
  _physxInteface = Comlink.wrap(worker);
  await _physxInteface.initPhysX({ build: wasmPath });
  return _physxInteface;
}

export const createPhysicsWorld = async () => {
  
}