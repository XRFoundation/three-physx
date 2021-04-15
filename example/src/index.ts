import { PhysXInstance } from '../../src';
import { Mesh, TorusKnotBufferGeometry, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D, Group, MeshStandardMaterial, CylinderBufferGeometry, Vector3, TorusBufferGeometry, BufferGeometry } from 'three';
import { Object3DBody, PhysXBodyType, PhysXEvents, PhysXModelShapes, RigidBodyProxy } from '../../src/types/ThreePhysX';
import { DebugRenderer } from '../../src/utils/DebugRenderer';
import { CapsuleBufferGeometry } from '../../src/utils/CapsuleBufferGeometry';

const load = async () => {
  const renderer = await import('./renderer');

  const objects = new Map<number, Object3D>();
  const balls = new Map<number, Object3D>();
  (globalThis as any).objects = objects;

  const onUpdate = () => {
    objects.forEach((obj: Object3DBody, id) => {
      if (!obj.body) return;
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
  (globalThis as any).physx = PhysXInstance.instance;

  const kinematicObject = new Group();//new Mesh(new TorusKnotBufferGeometry(), new MeshBasicMaterial({ color: randomColor() })).translateY(-2.5).rotateZ(Math.PI / 2);
  // kinematicObject.scale.setScalar(2)
  kinematicObject.add(new Mesh(new BoxBufferGeometry(4, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateX(2).rotateY(Math.PI / 2));
  // kinematicObject.children[0].scale.setScalar(2);
  kinematicObject.children[0].add(new Mesh(new BoxBufferGeometry(3, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateZ(2).rotateY(Math.PI / 2));
  kinematicObject.userData.physx = { type: PhysXBodyType.KINEMATIC };

  const kinematicBody = await PhysXInstance.instance.addBody(kinematicObject); //, [{ id: undefined, shape: PhysXModelShapes.Sphere, options: { sphereRadius: 2 }}]);
  let isKinematic = true;
  setInterval(() => {
    isKinematic = !isKinematic;
    PhysXInstance.instance.updateBody(kinematicObject, { angularVelocity: { x: 0, y: 0, z: 0 }, linearVelocity: { x: 0, y: 0, z: 0 }, type: isKinematic ? PhysXBodyType.KINEMATIC : PhysXBodyType.DYNAMIC });
  }, 2000);
  objects.set(kinematicBody.id, kinematicObject);
  renderer.addToScene(kinematicObject);
  kinematicBody.addEventListener(PhysXEvents.COLLISION_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('COLLISION DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  });

  const character = new Group();
  character.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  const characterBody = await PhysXInstance.instance.addController(character, { isCapsule: true });
  objects.set(characterBody.id, character);
  characterBody.addEventListener(PhysXEvents.CONTROLLER_SHAPE_HIT, (ev) => {
    // console.log('COLLISION DETECTED', ev);
  });

  createBalls().forEach(async (object) => {
    const body = await PhysXInstance.instance.addBody(object);
    objects.set(body.id, object);
    balls.set(body.id, object);
    renderer.addToScene(object);
  });

  const floor = new Mesh(new BoxBufferGeometry(platformSize, 1, platformSize), new MeshStandardMaterial({ color: randomColor(), side: DoubleSide })).translateY(-2);
  floor.userData.physx = { type: PhysXBodyType.STATIC };
  const floorbody = await PhysXInstance.instance.addBody(floor);
  objects.set(floorbody.id, floor);
  renderer.addToScene(floor);

  renderer.addToScene(character);
  const keys = {}

  document.addEventListener('keydown', (ev) => {
    keys[ev.code] = true;
    if (ev.code === 'Backquote') {
      debug.setEnabled(!debug.enabled)
    }
    if (ev.code === 'ShiftLeft') {
      PhysXInstance.instance.updateController((character as any), { resize: 0 });
    }
  });
  document.addEventListener('keyup', (ev) => {
    delete keys[ev.code];
    if (ev.code === 'ShiftLeft') {
      PhysXInstance.instance.updateController((character as any), { resize: 1 });
    }
  });

  const debug = new DebugRenderer(renderer.scene);
  debug.setEnabled(true);
  let lastTime = Date.now() - (1 / 60);
  let lastDelta = 1 / 60;

  const update = () => {
    const time = Date.now();
    const timeSecs = time / 1000;
    const delta = time - lastTime;

    if ((kinematicObject as any)?.body?.options.type === PhysXBodyType.KINEMATIC) {
      kinematicObject.position.set(Math.sin(timeSecs) * 10, 0, Math.cos(timeSecs) * 10);
      kinematicObject.lookAt(0, 0, 0);
    }
    if (characterBody.controller.collisions.down) {
      if (characterBody.controller.velocity.y < 0)
        characterBody.controller.velocity.y = 0;
    } else {
      characterBody.controller.velocity.y -= (0.2 / delta);
    }
    Object.entries(keys).forEach(([key, value]) => {
      if (key === 'KeyW') {
        characterBody.controller.delta.z -= 2 / delta;
      }
      if (key === 'KeyS') {
        characterBody.controller.delta.z += 2 / delta;
      }
      if (key === 'KeyA') {
        characterBody.controller.delta.x -= 2 / delta;
      }
      if (key === 'KeyD') {
        characterBody.controller.delta.x += 2 / delta;
      }
      if (key === 'Space' && characterBody.controller.collisions.down) {
        characterBody.controller.velocity.y = 5 / delta;
      }
    })
    balls.forEach(async (object: Object3DBody, id) => {
      if (object.position.y < -10 && object.body) {
        await PhysXInstance.instance.removeBody(object);
        balls.delete(id);
        objects.delete(id);
        object.position.copy(randomVector3OnPlatform());
        const body = await PhysXInstance.instance.addBody(object);
        balls.set(body.id, object);
        objects.set(body.id, object);
      }
    })
    characterBody.controller.delta.y += characterBody.controller.velocity.y;
    PhysXInstance.instance.update(delta);
    debug.update();
    renderer.update();
    lastDelta = delta;
    lastTime = time;
    requestAnimationFrame(update);
  };
  update();
};
const platformSize = 50;
const createBalls = () => {
  const geoms = [new BoxBufferGeometry(), new SphereBufferGeometry(1), new CapsuleBufferGeometry(0.5, 0.5, 1)];
  const meshes = [];
  for (let i = 0; i < 1000; i++) {
    const mesh = new Mesh(geoms[i % geoms.length], new MeshStandardMaterial({ color: randomColor() }));
    mesh.position.copy(randomVector3OnPlatform());
    mesh.userData.physx = {
      type: PhysXBodyType.DYNAMIC,
      // shapes: [ { type: PhysXModelShapes.TriangleMesh, } ]
    };
    meshes.push(mesh);
  }

  return [...meshes];
};

const randomVector3OnPlatform = () => {
  return new Vector3((Math.random() - 0.5) * platformSize, Math.random() * platformSize, (Math.random() - 0.5) * platformSize)
}

const randomColor = () => {
  return new Color(Math.random() * 0xffffff);
};

load();
