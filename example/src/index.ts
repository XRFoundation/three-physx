import { PhysXInstance } from '../../src';
import { Mesh, TorusKnotBufferGeometry, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D, Group } from 'three';
import { Object3DBody, PhysXBodyType, PhysXEvents, PhysXModelShapes, RigidBodyProxy } from '../../src/types/ThreePhysX';
import { PhysXDebugRenderer } from './PhysXDebugRenderer';

const load = async () => {
  const renderer = await import('./renderer');

  const objects = new Map<number, Object3D>();
  (globalThis as any).objects = objects;

  const onUpdate = () => {
    objects.forEach((obj: any, id) => {
      if ((obj.body as RigidBodyProxy).options.type === PhysXBodyType.DYNAMIC) {
        const translation = (obj.body as RigidBodyProxy).transform.translation;
        const rotation = (obj.body as RigidBodyProxy).transform.rotation;
        obj.position.set(translation.x, translation.y, translation.z);
        obj.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      } else if ((obj.body as RigidBodyProxy).options.type === PhysXBodyType.CONTROLLER) {
        const translation = (obj.body as RigidBodyProxy).transform.translation;
        obj.position.set(translation.x, translation.y, translation.z);
      }
    });
  };
  // @ts-ignore
  new PhysXInstance(new Worker(new URL('../../src/worker.ts', import.meta.url)), onUpdate, renderer.scene);
  await PhysXInstance.instance.initPhysX({ jsPath: '/physx/physx.release.js', wasmPath: '/physx/physx.release.wasm' });

  createScene().forEach(async (object) => {
    const body = await PhysXInstance.instance.addBody(object);
    objects.set(body.id, object);
    renderer.addToScene(object);
  });
/*
  const kinematicObject = new Group(); //new Mesh(new TorusKnotBufferGeometry(), new MeshBasicMaterial({ color: randomColor() })).translateY(-2.5).rotateZ(Math.PI / 2);
  // kinematicObject.scale.setScalar(2)
  kinematicObject.add(new Mesh(new BoxBufferGeometry(4, 1, 1), new MeshBasicMaterial({ color: randomColor() })).translateX(2).rotateY(Math.PI / 2));
  kinematicObject.children[0].scale.setScalar(2);
  kinematicObject.children[0].add(new Mesh(new BoxBufferGeometry(3, 1, 1), new MeshBasicMaterial({ color: randomColor() })).translateZ(2).rotateY(Math.PI / 2));
  kinematicObject.userData.physx = { type: PhysXBodyType.DYNAMIC };

  const kinematicBody = await PhysXInstance.instance.addBody(kinematicObject); //, [{ id: undefined, shape: PhysXModelShapes.Sphere, options: { sphereRadius: 2 }}]);
  let isKinematic = false;
  setInterval(() => {
    PhysXInstance.instance.updateBody(kinematicObject, { angularVelocity: { x: 0, y: 0, z: 0 }, linearVelocity: { x: 0, y: 0, z: 0 }, type: isKinematic ? PhysXBodyType.KINEMATIC : PhysXBodyType.DYNAMIC });
    isKinematic = !isKinematic;
  }, 2000);
  objects.set(kinematicBody.id, kinematicObject);
  renderer.addToScene(kinematicObject);
  kinematicBody.addEventListener(PhysXEvents.COLLISION_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('COLLISION DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  });*/

  const character = new Group();
  character.add(new Mesh(new BoxBufferGeometry(0.25, 2, 0.25), new MeshBasicMaterial({ color: randomColor() })));
  character.add(new Mesh(new SphereBufferGeometry(0.4), new MeshBasicMaterial({ color: randomColor() })).translateY(1));
  const characterBody = await PhysXInstance.instance.addController(character);
  console.log(characterBody)
  objects.set(characterBody.id, character);
  console.log(objects)

  renderer.addToScene(character);

  document.addEventListener('keypress', (ev) => {
    if (ev.key === 'w') {
      (character as any).body.controller.delta.x += 0.2;
    }
    if (ev.key === 's') {
      (character as any).body.controller.delta.x -= 0.2;
    }
    if (ev.key === 'a') {
      (character as any).body.controller.delta.z -= 0.2;
    }
    if (ev.key === 'd') {
      (character as any).body.controller.delta.z += 0.2;
    }
    if (ev.code === 'Space') {
      (character as any).body.controller.delta.y += 2;
    }
  });

  const debug = new PhysXDebugRenderer(renderer.scene);
  debug.setEnabled(true);

  const update = () => {
    const time = Date.now() / 1000;
    // if ((kinematicObject as any).body.options.type === PhysXBodyType.KINEMATIC) {
    //   kinematicObject.position.set(Math.sin(time) * 10, 0, Math.cos(time) * 10);
    //   kinematicObject.lookAt(0, 0, 0);
    // }
    PhysXInstance.instance.update();
    debug.update(objects);
    renderer.update();
    requestAnimationFrame(update);
  };
  update();
};

const createScene = () => {
  const geoms = [new BoxBufferGeometry(), new SphereBufferGeometry(1)];
  const meshes = [];
  for (let i = 0; i < 1000; i++) {
    const mesh = new Mesh(geoms[i % 2], new MeshBasicMaterial({ color: randomColor() }));
    mesh.position.set(Math.random() * 100 - 50, Math.random() * 50, Math.random() * 100 - 50);
    mesh.userData.physx = {
      type: PhysXBodyType.DYNAMIC,
    };
    meshes.push(mesh);
  }
  const floor = new Mesh(new BoxBufferGeometry(100, 1, 100), new MeshBasicMaterial({ color: randomColor(), side: DoubleSide })).translateY(-2);
  floor.userData.physx = { type: PhysXBodyType.STATIC };

  // return [floor];
  return [...meshes, floor];
};

const randomColor = () => {
  return new Color(Math.random() * 0xffffff);
};

load();
