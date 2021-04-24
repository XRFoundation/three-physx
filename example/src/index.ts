import { PhysXInstance, CapsuleBufferGeometry, DebugRenderer, Object3DBody, SceneQueryType, CollisionEvents, ControllerEvents, getShapesFromObject, getTransformFromWorldPos, Body, Shape, BodyType, Controller, SHAPES, createNewTransform } from '../../src';
import { Mesh, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D, Group, MeshStandardMaterial, Vector3, BufferGeometry, BufferAttribute, DodecahedronBufferGeometry, TetrahedronBufferGeometry, CylinderBufferGeometry, TorusKnotBufferGeometry, PlaneBufferGeometry } from 'three';

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
  const kinematicBody = PhysXInstance.instance.addBody(new Body({
    shapes: getShapesFromObject(kinematicObject).map((shape: Shape) => {
      shape.config.collisionLayer = COLLISIONS.HAMMER;
      shape.config.collisionMask = COLLISIONS.BALL;
      return shape;
    }),
    transform: getTransformFromWorldPos(kinematicObject),
    type: BodyType.KINEMATIC,
  }));
  // let isKinematic = true;
  // setInterval(() => {
  //   isKinematic = !isKinematic;
  //   kinematicBody.type = isKinematic ? BodyType.KINEMATIC : BodyType.DYNAMIC;
  // }, 2000);
  objects.set(kinematicBody.id, kinematicObject);
  renderer.addToScene(kinematicObject);
  (kinematicObject as any).body = kinematicBody;
  kinematicBody.addEventListener(CollisionEvents.TRIGGER_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('TRIGGER DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  });

  const character = new Group();
  character.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  const characterBody = PhysXInstance.instance.createController(new Controller({
    isCapsule: true,
    radius: 0.5,
    position: { y: 5 },
    collisionLayer: COLLISIONS.CHARACTER,
    collisionMask: COLLISIONS.ALL
  }));

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
    collisionMask: COLLISIONS.ALL
  });
  renderer.addToScene(character);

  createBalls().forEach(async (object) => {
    const body = new Body({
      shapes: getShapesFromObject(object).map((shape: Shape) => {
        shape.config.collisionLayer = COLLISIONS.BALL;
        shape.config.collisionMask = COLLISIONS.FLOOR | COLLISIONS.HAMMER | COLLISIONS.BALL;
        return shape;
      }),
      transform: getTransformFromWorldPos(object),
      type: BodyType.DYNAMIC
    });
    PhysXInstance.instance.addBody(body);
    object.body = body;
    objects.set(body.id, object);
    balls.set(body.id, object);
    renderer.addToScene(object);
  });

  const platform = new Mesh(new BoxBufferGeometry(platformSize, 1, platformSize), new MeshStandardMaterial({ color: randomColor(), side: DoubleSide })).translateY(-2);
  const platformBody = PhysXInstance.instance.addBody(new Body({
    shapes: getShapesFromObject(platform).map((shape: Shape) => {
      shape.config.collisionLayer = COLLISIONS.FLOOR;
      shape.config.collisionMask = COLLISIONS.CHARACTER | COLLISIONS.BALL;
      return shape;
    }),
    transform: getTransformFromWorldPos(platform),
    type: BodyType.STATIC
  }));
  (platform as any).body = platformBody;
  objects.set(platformBody.id, platform);
  renderer.addToScene(platform);


  const groundPlane = new Mesh(new PlaneBufferGeometry(10000, 10000), new MeshStandardMaterial({ color: randomColor() })).translateY(-5).rotateX(-Math.PI / 2);
  const groundPlaneBody = PhysXInstance.instance.addBody(new Body({
    shapes: [
      {
        shape: SHAPES.Plane,
        transform: getTransformFromWorldPos(groundPlane),
        config: {
          collisionLayer: COLLISIONS.FLOOR,
          collisionMask: COLLISIONS.ALL
        }
      }
    ],
    transform: createNewTransform(),
    type: BodyType.STATIC
  }));
  (platform as any).body = groundPlane;
  objects.set(groundPlaneBody.id, groundPlane);
  renderer.addToScene(groundPlane);

  const keys = {};
  document.addEventListener('keydown', (ev) => {
    keys[ev.code] = true;
    if (ev.code === 'Backquote') {
      debug.setEnabled(!debug.enabled)
    }
    if (ev.code === 'ShiftLeft') {
      characterBody.resize(0);
    }
  });
  document.addEventListener('keyup', (ev) => {
    delete keys[ev.code];
    if (ev.code === 'ShiftLeft') {
      characterBody.resize(1);
    }
    if (ev.code === 'KeyR') {
      characterBody.updateTransform({ translation: { x: 1, y: 1, z: 1 } })
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

    if (kinematicBody.type === BodyType.KINEMATIC) {
      kinematicObject.position.set(Math.sin(timeSecs) * 10, 0, Math.cos(timeSecs) * 10);
      kinematicObject.lookAt(0, 0, 0);
      kinematicBody.updateTransform({ translation: kinematicObject.position, rotation: kinematicObject.quaternion });
    }
    if (characterBody.collisions.down) {
      if (characterBody.velocity.y < 0)
        characterBody.velocity.y = 0;
    } else {
      characterBody.velocity.y -= (0.2 / delta);
    }
    Object.entries(keys).forEach(([key]) => {
      if (key === 'KeyW') {
        characterBody.delta.z -= 2 / delta;
      }
      if (key === 'KeyS') {
        characterBody.delta.z += 2 / delta;
      }
      if (key === 'KeyA') {
        characterBody.delta.x -= 2 / delta;
      }
      if (key === 'KeyD') {
        characterBody.delta.x += 2 / delta;
      }
      if (key === 'Space' && characterBody.collisions.down) {
        characterBody.velocity.y = 0.2;
      }
    })
    characterBody.delta.y += characterBody.velocity.y;
    raycastQuery.origin = new Vector3().copy(character.position).add(new Vector3(0, -1, 0));
    // console.log(raycastQuery.hits)
    PhysXInstance.instance.update();
    objects.forEach((obj: Object3DBody) => {
      if (!obj.body) return;
      if ((obj.body as Body).type === BodyType.DYNAMIC) {
        const translation = (obj.body as Body).transform.translation;
        const rotation = (obj.body as Body).transform.rotation;
        obj.position.set(translation.x, translation.y, translation.z);
        obj.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      } else if ((obj.body as Body).type === BodyType.CONTROLLER) {
        const translation = (obj.body as Body).transform.translation;
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
        const newbody = PhysXInstance.instance.addBody(new Body({
          transform: getTransformFromWorldPos(object),
          shapes: getShapesFromObject(object).map((shape: Shape) => {
            shape.config.collisionLayer = COLLISIONS.BALL;
            shape.config.collisionMask = COLLISIONS.FLOOR | COLLISIONS.HAMMER | COLLISIONS.BALL;
            return shape;
          }),
          type: BodyType.DYNAMIC
        }));
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
const platformSize = 25;
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
  for (let i = 0; i < 250; i++) {
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
