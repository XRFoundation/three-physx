
import React from 'react';
import { initializePhysX } from '../src'

const page = () => {
  return (<canvas />);
};

export default page;

const load = async () => {

  const renderer = await import('./renderer')
  const { makeEntities } = await import('./entities')

  const onUpdate = (transforms) => {
    console.log('got transforms', transforms)
  }

  const physics = await initializePhysX(new Worker(new URL("../src/worker.ts", import.meta.url)), onUpdate, { jsPath: '/physx.release.js', wasmPath: '/physx.release.wasm' });
  physics.addBody('body added!!!');
  physics.startPhysX(true);
  
  const entities = makeEntities()
  
  const update = () => {
    renderer.update(entities)
    requestAnimationFrame(update)
  }
  
  renderer.init(entities)
  update()


}

if (typeof window !== 'undefined') {
  load();
}