
import React from 'react';
import { initializePhysX, threeToPhysXModelDescription, PhysXBodyConfig } from '..'
import { Object3D, Mesh, BoxGeometry, MeshBasicMaterial, Vector3, Quaternion } from 'three'

const page = () => {
  return (<canvas />);
};

export default page;

const load = async () => {

  const renderer = await import('./renderer')
  
  const entities: Object3D[] = []
  entities.push(new Mesh(new BoxGeometry(1, 1), new MeshBasicMaterial()))

  const onUpdate = (transforms) => {
    // console.log('got transforms', transforms)
  }
  
  const physics = await initializePhysX(new Worker(new URL("../src/worker.ts", import.meta.url)), onUpdate, { jsPath: '/physx.release.js', wasmPath: '/physx.release.wasm' });
  entities.forEach((entity) => {
    physics.addBody(createPhysXBody(entity, threeToPhysXModelDescription(entity), true));
  })

  const update = () => {
    // renderer.update(entities)
    requestAnimationFrame(update)
  }
  
  // renderer.init(entities)
  update()


}

let id = 0;

const createPhysXBody = (entity, model, dynamic) => {
  const pos = new Vector3();
  entity.getWorldPosition(pos);
  const quat = new Quaternion();
  entity.getWorldQuaternion(quat);
  const physxBodyConfig: PhysXBodyConfig = {
    id: id++,
    transform: {
      translation: {
        x: pos.x,
        y: pos.y,
        z: pos.z
      },
      rotation: {
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w,
      },
    },
    model,
    dynamic
  }
  return physxBodyConfig;
}

if (typeof window !== 'undefined') {
  load();
}