import { PhysXInstance } from '@/xr3ngine/three-physx';

PhysXInstance.instance.initPhysX(new Worker(new URL('../../src/worker.ts', import.meta.url)), { jsPath: '/physx/physx.release.js', wasmPath: '/physx/physx.release.wasm' });
