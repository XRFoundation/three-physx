
import React from 'react';
import { initializePhysX } from '..'
import { Object3D, Mesh, TorusKnotBufferGeometry, MeshNormalMaterial, BoxBufferGeometry, SphereBufferGeometry, PlaneBufferGeometry, CylinderBufferGeometry, DoubleSide } from 'three'
import { createPhysXBody } from '../src/createPhysXBody';

const page = () => {
  return (<></>);
};

export default page;
let ids = 0;

const load = async () => {

  const renderer = await import('./renderer')
  
  const objects = new Map<number, Object3D>();
  objects.set(ids++, (new Mesh(new BoxBufferGeometry(1, 1), new MeshNormalMaterial({ flatShading: true }))).translateX(-4))
  objects.set(ids++, (new Mesh(new CylinderBufferGeometry(1, 1), new MeshNormalMaterial({ flatShading: true }))).translateX(-2))
  objects.set(ids++, (new Mesh(new PlaneBufferGeometry(1, 1), new MeshNormalMaterial({ flatShading: true, side: DoubleSide }))))
  objects.set(ids++, (new Mesh(new SphereBufferGeometry(1, 1), new MeshNormalMaterial({ flatShading: true }))).translateX(2))
  objects.set(ids++, (new Mesh(new TorusKnotBufferGeometry(1, 1), new MeshNormalMaterial({ flatShading: true }))).translateX(6))

  const onUpdate = (transforms) => {
    // console.log(transforms)
    // mesh.position.fromArray(entity.transform.position)
    // mesh.quaternion.fromArray(entity.transform.rotation)
    // console.log('got transforms', transforms)
  }
  
  const physics = await initializePhysX(new Worker(new URL("../src/worker.ts", import.meta.url)), onUpdate, { jsPath: '/physx.release.js', wasmPath: '/physx.release.wasm' });
  objects.forEach((object, id) => {
    physics.addBody(createPhysXBody(object, id, true));
  })

  const update = () => {
    renderer.update(objects)
    requestAnimationFrame(update)
  }
  
  renderer.init(objects)
  update()
}


if (typeof window !== 'undefined') {
  load();
}