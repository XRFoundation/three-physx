
import { PhysXInstance } from '../../src'
import { Mesh, TorusKnotBufferGeometry, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D } from 'three'
import { PhysXBodyType, PhysXEvents, PhysXModelShapes, RigidBodyProxy } from '../../src/types/ThreePhysX';
import { PhysXDebugRenderer } from './PhysXDebugRenderer';

const load = async () => {

  const renderer = await import('./renderer')

  const objects = new Map<number, Object3D>();
  (globalThis as any).objects = objects

  const onUpdate = () => {
    objects.forEach((obj: any, id) => {
      if((obj.body as RigidBodyProxy).bodyOptions.type === PhysXBodyType.DYNAMIC) {
        const translation = (obj.body as RigidBodyProxy).transform.translation;
        const rotation = (obj.body as RigidBodyProxy).transform.rotation;
        obj.position.set(translation.x, translation.y, translation.z);
        obj.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    })
  }
  new PhysXInstance(new Worker(new URL("../../src/worker.ts", import.meta.url)), onUpdate);
  await PhysXInstance.instance.initPhysX({ jsPath: '/physx/physx.release.js', wasmPath: '/physx/physx.release.wasm' });

  createScene().forEach(async (object) => {
    const body = await PhysXInstance.instance.addBody(object);
    objects.set(body.id, object)
    renderer.addToScene(object);
  })

  const kinematicObject = new Mesh(new TorusKnotBufferGeometry(), new MeshBasicMaterial({ color: randomColor() }));
  kinematicObject.add(new Mesh(new BoxBufferGeometry(4, 1, 1), new MeshBasicMaterial({ color: randomColor() })).translateX(1).rotateY(1).rotateZ(1));
  kinematicObject.userData.physx = { type: PhysXBodyType.KINEMATIC };
  
  const body = await PhysXInstance.instance.addBody(kinematicObject)//, [{ id: undefined, shape: PhysXModelShapes.Sphere, options: { sphereRadius: 2 }}]);
  objects.set(body.id, kinematicObject)
  renderer.addToScene(kinematicObject);
  body.addEventListener(PhysXEvents.COLLISION_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('COLLISION DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  })

  const debug = new PhysXDebugRenderer(renderer.scene)
  debug.setEnabled(true);

  const update = () => {
    const time = Date.now() / 1000;
    kinematicObject.position.set(Math.sin(time) * 10, 0, Math.cos(time) * 10);
    kinematicObject.lookAt(0, 0, 0)
    PhysXInstance.instance.update();
    debug.update(objects)
    renderer.update()
    requestAnimationFrame(update)
  }
  update()
}

const createScene = () => {
  const geoms = [new BoxBufferGeometry(), new SphereBufferGeometry(1)]
  const meshes = []
  for(let i = 0; i < 1000; i++){
    const mesh = new Mesh(geoms[i%2], new MeshBasicMaterial({ color: randomColor() }))
    mesh.position.set(Math.random() * 50 - 25, Math.random() * 50, Math.random() * 50 - 25);
    mesh.userData.physx = { type: PhysXBodyType.DYNAMIC };
    meshes.push(mesh)
  }
  const floor = new Mesh(new BoxBufferGeometry(100, 1, 100), new MeshBasicMaterial({ color: randomColor(), side: DoubleSide })).translateY(-2);
  floor.userData.physx = { type: PhysXBodyType.STATIC };
  
  return [...meshes, floor];
}

const randomColor = () => {
  return new Color(Math.random() * 0xffffff)
}

load()
