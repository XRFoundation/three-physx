
import { PhysXInstance } from '..'
import { Object3D, Mesh, TorusKnotBufferGeometry, MeshNormalMaterial, BoxBufferGeometry, SphereBufferGeometry, PlaneBufferGeometry, CylinderBufferGeometry, DoubleSide } from 'three'
import * as BufferConfig from "../src/BufferConfig";
import { PhysXBodyType } from '../src/types/ThreePhysX';
let ids = 0;
const load = async () => {

  const renderer = await import('./renderer')

  const objects = new Map<number, Object3D>();
  (globalThis as any).objects = objects

  const onUpdate = (buffer: Float32Array) => {
    objects.forEach((obj, id) => {
      const offset = id * BufferConfig.BODY_DATA_SIZE;
      obj.position.fromArray(buffer, offset);
      obj.quaternion.fromArray(buffer, offset + 3);
      // linearVelocity.fromArray(buffer, offset + 8);
      // angularVelocity.fromArray(buffer, offset + 12);
    })
  }
  new PhysXInstance(new Worker(new URL("../src/worker.ts", import.meta.url)), onUpdate);
  await PhysXInstance.instance.initPhysX({ jsPath: '/physx.release.js', wasmPath: '/physx.release.wasm' });

  createScene().forEach(async (object) => {
    const body = await PhysXInstance.instance.addBody(object);
    objects.set(body.id, object)
    renderer.addToScene(object);
  })

  const update = () => {
    renderer.update()
    requestAnimationFrame(update)
  }
  update()
}

const createScene = () => {
  const meshes = []
  for(let i = 0; i < 1000; i++){
    const mesh = new Mesh(new BoxBufferGeometry(), new MeshNormalMaterial({ flatShading: true }))
    mesh.position.set(Math.random() * 50 - 25, Math.random() * 50 - 25, Math.random() * 50 - 25);
    mesh.userData.physx = { type: PhysXBodyType.KINEMATIC };
    meshes.push(mesh)
  }

  const mesh2 = new Mesh(new CylinderBufferGeometry(), new MeshNormalMaterial({ flatShading: true })).translateX(-2);
  mesh2.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh3 = new Mesh(new PlaneBufferGeometry(), new MeshNormalMaterial({ flatShading: true, side: DoubleSide }));
  mesh3.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh4 = new Mesh(new SphereBufferGeometry(), new MeshNormalMaterial({ flatShading: true })).translateX(2);
  mesh4.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh5 = new Mesh(new TorusKnotBufferGeometry(), new MeshNormalMaterial({ flatShading: true })).translateX(6);
  mesh5.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const floor = new Mesh(new BoxBufferGeometry(100, 1, 100), new MeshNormalMaterial({ flatShading: true, side: DoubleSide })).translateY(-25);
  floor.userData.physx = { type: PhysXBodyType.STATIC };
  
  return [...meshes, mesh2, mesh3, mesh4, mesh5, floor];
}

load()
