import { PhysXInstance, CapsuleBufferGeometry, DebugRenderer, Object3DBody, PhysXBodyType, SceneQueryType, RigidBodyProxy, PhysXModelShapes, PhysXShapeConfig, CollisionEvents, ControllerEvents, getShapesFromObject, getTransformFromWorldPos } from '../../';
import { Mesh, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D, Group, MeshStandardMaterial, Vector3, BufferGeometry, BufferAttribute, DodecahedronBufferGeometry, TetrahedronBufferGeometry, CylinderBufferGeometry, TorusKnotBufferGeometry } from 'three';

enum COLLISIONS {
  NONE = 0,
  FLOOR = 1 << 0,
  CHARACTER = 1 << 1,
  BALL = 1 << 2,
  HAMMER = 1 << 3,
  ALL = FLOOR | CHARACTER | BALL | HAMMER,
}

const load = async () => {
  const renderer = await import('./renderer');

  const objects = new Map<number, Object3D>();
  const balls = new Map<number, Object3D>();
  (globalThis as any).objects = objects;

  // @ts-ignore
  await PhysXInstance.instance.initPhysX(new Worker(new URL('./worker.ts', import.meta.url), { type: "module" }), { jsPath: '/physx/physx.release.js', wasmPath: '/physx/physx.release.wasm' });

  const kinematicObject = new Group()//.translateY(-2.5).rotateZ(Math.PI / 2);
  // kinematicObject.scale.setScalar(2)
  kinematicObject.add(new Mesh(new BoxBufferGeometry(4, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateX(2).rotateY(Math.PI / 2));
  kinematicObject.children[0].scale.setScalar(2);
  kinematicObject.children[0].add(new Mesh(new BoxBufferGeometry(3, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateZ(2).rotateY(Math.PI / 2));
  const kinematicBody = PhysXInstance.instance.addBody({
    shapes: getShapesFromObject(kinematicObject).map((shape: PhysXShapeConfig) => { 
      shape.config.collisionLayer = COLLISIONS.HAMMER; 
      shape.config.collisionMask = COLLISIONS.BALL;
      return shape;
    }),
    transform: getTransformFromWorldPos(kinematicObject),
    type: PhysXBodyType.KINEMATIC,
  });
  let isKinematic = true;
  // setInterval(() => {
  //   isKinematic = !isKinematic;
  //   PhysXInstance.instance.updateBody(kinematicBody, { angularVelocity: { x: 0, y: 0, z: 0 }, linearVelocity: { x: 0, y: 0, z: 0 }, type: isKinematic ? PhysXBodyType.KINEMATIC : PhysXBodyType.DYNAMIC });
  // }, 2000);
  objects.set(kinematicBody.id, kinematicObject);
  renderer.addToScene(kinematicObject);
  (kinematicObject as any).body = kinematicBody;
  kinematicBody.addEventListener(CollisionEvents.TRIGGER_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('TRIGGER DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  });

  const character = new Group();
  character.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  const characterBody = PhysXInstance.instance.createController({ isCapsule: true, position: { y: 5 } });
  (character as any).body = characterBody;
  objects.set(characterBody.id, character);
  characterBody.addEventListener(ControllerEvents.CONTROLLER_SHAPE_HIT, (ev) => {
    // console.log('COLLISION DETECTED', ev);
  });
  const raycastQuery = PhysXInstance.instance.addRaycastQuery({
    type: SceneQueryType.Closest,
    origin: character.position,
    direction: new Vector3(0, -1, 0),
    maxDistance: 1,
    collisionLayer: COLLISIONS.ALL, // this only works if both are COLLISIONS.NONE
    collisionMask: COLLISIONS.ALL
  });

  createBalls().forEach(async (object) => {
    const body = PhysXInstance.instance.addBody({
      shapes: getShapesFromObject(object).map((shape: PhysXShapeConfig) => { 
        shape.config.collisionLayer = COLLISIONS.BALL; 
        shape.config.collisionMask = COLLISIONS.FLOOR | COLLISIONS.HAMMER | COLLISIONS.BALL;
        return shape;
      }),
      transform: getTransformFromWorldPos(object),
      type: PhysXBodyType.DYNAMIC
    });
    object.body = body;
    objects.set(body.id, object);
    balls.set(body.id, object);
    renderer.addToScene(object);
  });

  const floor = new Mesh(new BoxBufferGeometry(platformSize, 1, platformSize), new MeshStandardMaterial({ color: randomColor(), side: DoubleSide })).translateY(-2);
  const floorbody = PhysXInstance.instance.addBody({
    shapes: getShapesFromObject(floor).map((shape: PhysXShapeConfig) => { 
      shape.config.collisionLayer = COLLISIONS.FLOOR; 
      shape.config.collisionMask = COLLISIONS.CHARACTER | COLLISIONS.BALL;
      return shape;
    }),
    transform: getTransformFromWorldPos(floor),
    type: PhysXBodyType.STATIC
  });
  (floor as any).body = floorbody;
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

  PhysXInstance.instance.startPhysX(true);
  const update = () => {
    const time = Date.now();
    const timeSecs = time / 1000;
    const delta = time - lastTime;

    if ((kinematicObject as any)?.body?.options.type === PhysXBodyType.KINEMATIC) {
      kinematicObject.position.set(Math.sin(timeSecs) * 10, 0, Math.cos(timeSecs) * 10);
      kinematicBody.transform.translation.x = kinematicObject.position.x;
      kinematicBody.transform.translation.y = kinematicObject.position.y;
      kinematicBody.transform.translation.z = kinematicObject.position.z;
      kinematicBody.transform.rotation.x = kinematicObject.quaternion.x;
      kinematicBody.transform.rotation.y = kinematicObject.quaternion.y;
      kinematicBody.transform.rotation.z = kinematicObject.quaternion.z;
      kinematicBody.transform.rotation.w = kinematicObject.quaternion.w;
      kinematicObject.lookAt(0, 0, 0);
    }
    if (characterBody.controller.collisions.down) {
      if (characterBody.controller.velocity.y < 0)
        characterBody.controller.velocity.y = 0;
    } else {
      characterBody.controller.velocity.y -= (0.2 / delta);
    }
    Object.entries(keys).forEach(([key]) => {
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
        characterBody.controller.velocity.y = 0.2;
      }
    })
    characterBody.controller.delta.y += characterBody.controller.velocity.y;
    raycastQuery.origin = new Vector3().copy(character.position).add(new Vector3(0, -1, 0));
    console.log(raycastQuery.hits);
    PhysXInstance.instance.update(delta);
    objects.forEach((obj: Object3DBody) => {
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
    balls.forEach(async (object: Object3DBody, id) => {
      const { body } = object;
      if (object.position.y < -10 && body) {
        delete object.body;
        PhysXInstance.instance.removeBody(body);
        balls.delete(id);
        objects.delete(id);
        object.position.copy(randomVector3OnPlatform());
        object.updateWorldMatrix(true, true)
        const newbody = PhysXInstance.instance.addBody({
          transform: getTransformFromWorldPos(object),
          shapes: getShapesFromObject(object).map((shape: PhysXShapeConfig) => { 
            shape.config.collisionLayer = COLLISIONS.BALL; 
            shape.config.collisionMask = COLLISIONS.FLOOR | COLLISIONS.HAMMER | COLLISIONS.BALL;
            return shape;
          }),
          type: PhysXBodyType.DYNAMIC
        });
        object.body = newbody;
        balls.set(newbody.id, object);
        objects.set(newbody.id, object);
      }
    })
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
  const geoms = [
    new BoxBufferGeometry(),
    new SphereBufferGeometry(1),
    new CapsuleBufferGeometry(0.5, 0.5, 1),
    // new DodecahedronBufferGeometry(),
    // new TetrahedronBufferGeometry(),
    // new CylinderBufferGeometry()
  ];
  const meshes = [];
  for (let i = 0; i < 0; i++) {
    const mesh = new Mesh(geoms[i % geoms.length], new MeshStandardMaterial({ color: randomColor(), flatShading: true }));
    mesh.position.copy(randomVector3OnPlatform());
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
