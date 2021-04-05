# Three-Physx

Natively multithreaded physics for threejs with PhysX and an easy interface.

Credit to [Milkshake inc](https://github.com/Milkshake-Inc/ecs/tree/library/src/engine/plugins/physics/physx), [physx-js](https://github.com/ashconnell/physx-js), [three-ammo](https://github.com/InfiniteLee/three-ammo), [three-to-cannon](https://github.com/donmccurdy/three-to-cannon), [engine-3-zjt](https://github.com/jiatuhao/engine-3-zjt/)

Progress:
- [x] Load WASM in webworker
- [x] Set up message queue & function calls over events
- [x] three-to-physx (physx compatible model description version)
- [ ] implement all API functions
- [ ] return transforms
- [ ] collision events