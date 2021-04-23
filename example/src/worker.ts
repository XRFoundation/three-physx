import { receiveWorker } from "../../src";
import PHYSX from '../dist/physx/physx.release.js';
import physxModule from '../dist/physx/physx.release.wasm';

PHYSX({
  // locateFile(path) {
  //   if (path.endsWith('.wasm')) {
  //     return physxModule
  //   }
  //   return path
  // },
  // onRuntimeInitialized() {
  //   console.log('PhysX loaded')
  // },
}).then(receiveWorker);