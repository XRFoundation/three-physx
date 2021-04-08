# Three-Physx

Natively multithreaded physics for threejs with PhysX and an easy interface.

Credit to [Milkshake inc](https://github.com/Milkshake-Inc/ecs/tree/library/src/engine/plugins/physics/physx), [physx-js](https://github.com/ashconnell/physx-js), [three-ammo](https://github.com/InfiniteLee/three-ammo), [three-to-cannon](https://github.com/donmccurdy/three-to-cannon), [engine-3-zjt](https://github.com/jiatuhao/engine-3-zjt/)

Progress:
- [x] Load WASM in webworker
- [x] Set up message queue & function calls over events
- [x] three-to-physx shape converter
- [x] return transforms
- [x] kinematic
- [x] collision events
- [ ] update bodies
- [ ] character & vehicle
- [ ] implement all API functions
- [ ] raycasts

## Example

https://three-physx.netlify.app/

[![Netlify Status](https://api.netlify.com/api/v1/badges/dce6d784-da79-4e45-8c34-5f034526853f/deploy-status)](https://app.netlify.com/sites/three-physx/deploys)


## API

*-work in progress-*

This multithreaded PhysX API uses a singleton approach. This way the PhysX interface is accessible globally once instantiated.

```javascript

// create the interface
new PhysXInstance(worker: Worker, onUpdate: () => void);

// load PhysX and launch the simulation
await PhysXInstance.instance.initPhysX({ jsPath: string, wasmPath: string });

// add an object
await PhysXInstance.instance.addBody(object: Object3D);
```

Body parameters are read from `object.userData`. This allows externally loaded models to be given physx bodies in their respective editors.

```javascript
object.userData.physx = {
  type: PhysXBodyType,
  // todo
}
```
