# Three-Physx

Natively multithreaded physics for threejs with PhysX and an easy interface.

Credit to [Milkshake inc](https://github.com/Milkshake-Inc/ecs/tree/library/src/engine/plugins/physics/physx), [physx-js](https://github.com/ashconnell/physx-js), [three-ammo](https://github.com/InfiniteLee/three-ammo), [three-to-cannon](https://github.com/donmccurdy/three-to-cannon), [engine-3-zjt](https://github.com/jiatuhao/engine-3-zjt/)

DISCLAIMER: this is a work in progress and API & implementation is set to change
This will eventually be superseeded by https://github.com/HexaField/web-physx

Progress:
- [x] Load WASM in webworker
- [x] Set up message queue & function calls over events
- [x] three-to-physx shape converter
- [x] return transforms
- [x] kinematic
- [x] collision events
- [x] update bodies
- [x] new build with more bindings
- [x] put body ids on arraybuffers for more efficient data transfer
- [x] capsule
- [x] character controller
- [x] collision filtering
- [x] trimesh and convex
- [x] raycasts
- [x] get rid of transform, make internal and rely entirely on Vector3 & Quaternion
- [x] fix up updating body and shape data
- [x] obstacles
- [ ] fix root object scaling bug
- [ ] raycasts ignore backface option
- [ ] vehicle controller
- [ ] heightfield colliders
- [ ] geometry per instance scaling
- [ ] add subscribe for event listeners on worker to reduce redundant transfer overhead
- [ ] advanced & customisable collision filtering
- [ ] full api support (eventually)
- [ ] move most stuff to WASM for improved performance

## Example

https://three-physx.netlify.app/

[![Netlify Status](https://api.netlify.com/api/v1/badges/dce6d784-da79-4e45-8c34-5f034526853f/deploy-status)](https://app.netlify.com/sites/three-physx/deploys)


## API

*-work in progress-*

This multithreaded PhysX API uses a singleton approach. This way the PhysX interface is accessible globally once instantiated.

```ts
import { PhysXInstance, Transform } from 'three-physx';

// create the interface
await PhysXInstance.instance.initPhysX(new Worker('./worker.js'), { tps: 60, start: true });

// add an object
const body = PhysXInstance.instance.addBody(new Body({
  shapes: [
    {
      shape: SHAPES.Box,
      config: {
        collisionLayer: COLLISIONS.FLOOR,
        collisionMask: COLLISIONS.ALL
      }
    }
  ],
  type: BodyType.DYNAMIC
}));

// In scene loop
PhysXInstance.instance.update();
```

`worker.js`
```ts
import { receiveWorker } from "three-physx";
import PHYSX from './physx.release.js';
PHYSX().then(receiveWorker);
```

## Building PhysX

```
cd physx-js
npm install
npm run generate
npm run dev
```

This will copy files to /lib