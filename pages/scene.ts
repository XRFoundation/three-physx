
import { PhysXInstance } from '..'
import { Object3D, Mesh, TorusKnotBufferGeometry, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, PlaneBufferGeometry, CylinderBufferGeometry, DoubleSide, Color } from 'three'
import * as BufferConfig from "../src/BufferConfig";
import { Object3DBody, PhysXBodyType, RigidBodyProxy } from '../src/types/ThreePhysX';
import { PhysXDebugRenderer } from './PhysXDebugRenderer';
let ids = 0;
const load = async () => {

  const renderer = await import('./renderer')

  const objects = new Map<number, Object3DBody>();
  (globalThis as any).objects = objects

  const onUpdate = () => {
    objects.forEach((obj: any, id) => {
      obj.position.copy((obj.body as RigidBodyProxy).transform.translation);
      obj.quaternion.copy((obj.body as RigidBodyProxy).transform.rotation);
    })
  }
  new PhysXInstance(new Worker(new URL("../src/worker.ts", import.meta.url)), onUpdate);
  await PhysXInstance.instance.initPhysX({ jsPath: '/physx.release.js', wasmPath: '/physx.release.wasm' });

  createScene().forEach(async (object) => {
    const body = await PhysXInstance.instance.addBody(object);
    objects.set(body.id, object)
    renderer.addToScene(object);
  })

  const debug = new PhysXDebugRenderer(renderer.scene)

  const update = () => {
    debug.update(objects)
    renderer.update()
    requestAnimationFrame(update)
  }
  update()
}

const createScene = () => {
  const meshes = []
  for(let i = 0; i < 1000; i++){
    const mesh = new Mesh(new BoxBufferGeometry(), new MeshBasicMaterial({ color: randomColor() }))
    mesh.position.set(Math.random() * 50 - 25, Math.random() * 50 - 25, Math.random() * 50 - 25);
    mesh.userData.physx = { type: PhysXBodyType.KINEMATIC };
    meshes.push(mesh)
  }

  const mesh2 = new Mesh(new CylinderBufferGeometry(), new MeshBasicMaterial({ color: randomColor() })).translateX(-2);
  mesh2.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh3 = new Mesh(new PlaneBufferGeometry(), new MeshBasicMaterial({ color: randomColor(), side: DoubleSide }));
  mesh3.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh4 = new Mesh(new SphereBufferGeometry(), new MeshBasicMaterial({ color: randomColor() })).translateX(2);
  mesh4.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const mesh5 = new Mesh(new TorusKnotBufferGeometry(), new MeshBasicMaterial({ color: randomColor() })).translateX(6);
  mesh5.userData.physx = { type: PhysXBodyType.DYNAMIC };
  
  const floor = new Mesh(new BoxBufferGeometry(100, 1, 100), new MeshBasicMaterial({ color: randomColor(), side: DoubleSide })).translateY(-25);
  floor.userData.physx = { type: PhysXBodyType.STATIC };
  
  return [...meshes, mesh2, mesh3, mesh4, mesh5, floor];
}

const randomColor = () => {
  return new Color(Math.random() * 0xffffff)
}

load()
