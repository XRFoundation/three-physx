import { PhysXInstance, CapsuleBufferGeometry, DebugRenderer, SceneQueryType, CollisionEvents, ControllerEvents, getShapesFromObject, getTransformFromWorldPos, Body, Shape, BodyType, Controller, SHAPES, arrayOfPointsToArrayOfVector3, Transform, Obstacle, BoxObstacle } from '../../src';
import { Mesh, MeshBasicMaterial, BoxBufferGeometry, SphereBufferGeometry, DoubleSide, Color, Object3D, Group, MeshStandardMaterial, Vector3, BufferGeometry, BufferAttribute, DodecahedronBufferGeometry, TetrahedronBufferGeometry, CylinderBufferGeometry, TorusKnotBufferGeometry, PlaneBufferGeometry, Raycaster, Vector2, Euler } from 'three';
import { ConeBufferGeometry } from 'three';
import { IcosahedronBufferGeometry } from 'three';
import { OctahedronBufferGeometry } from 'three';
import { TorusBufferGeometry } from 'three';
import { TubeBufferGeometry } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry';
import { Quaternion } from 'three';

const vector3 = new Vector3();

enum COLLISIONS {
  NONE = 0,
  FLOOR = 1 << 0,
  CHARACTER = 1 << 1,
  BALL = 1 << 2,
  HAMMER = 1 << 3,
  TRIGGER = 1 << 4,
  ALL = FLOOR | CHARACTER | BALL | HAMMER | TRIGGER,
}

const load = async () => {
  const renderer = await import('./renderer');

  const objects = new Map<number, Object3D>();
  const balls = new Map<number, Object3D>();
  (globalThis as any).objects = objects;

  // @ts-ignore
  await PhysXInstance.instance.initPhysX(new Worker(new URL('./worker.ts', import.meta.url), { type: "module" }), {});

  // const kinematicObject = new Group().translateY(2.5);
  // kinematicObject.scale.setScalar(2)
  // kinematicObject.add(new Mesh(new BoxBufferGeometry(4, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateX(2).rotateY(Math.PI / 2));
  // kinematicObject.children[0].scale.setScalar(2);
  // kinematicObject.children[0].add(new Mesh(new BoxBufferGeometry(3, 1, 1), new MeshStandardMaterial({ color: randomColor() })).translateZ(2).rotateY(Math.PI / 2));
  // const kinematicBody = PhysXInstance.instance.addBody(new Body({
  //   shapes: getShapesFromObject(kinematicObject).map((shape: Shape) => {
  //     shape.config.collisionLayer = COLLISIONS.HAMMER;
  //     shape.config.collisionMask = COLLISIONS.BALL;
  //     return shape;
  //   }),
  //   transform: getTransformFromWorldPos(kinematicObject),
  //   type: BodyType.KINEMATIC,
  // }));
  // let isKinematic = true;
  // setInterval(() => {
  //   isKinematic = !isKinematic;
  //   kinematicBody.type = isKinematic ? BodyType.KINEMATIC : BodyType.DYNAMIC;
  // }, 2000);
  // objects.set(kinematicBody.id, kinematicObject);
  // renderer.addToScene(kinematicObject);
  // (kinematicObject as any).body = kinematicBody;
  // kinematicBody.addEventListener(CollisionEvents.TRIGGER_START, ({ bodySelf, bodyOther, shapeSelf, shapeOther }) => {
    // console.log('TRIGGER DETECTED', bodySelf, bodyOther, shapeSelf, shapeOther);
  // });

  const character = new Group();
  character.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  const characterBody = PhysXInstance.instance.createController(new Controller({
    isCapsule: true,
    radius: 0.5,
    position: { y: 5 },
    collisionLayer: COLLISIONS.CHARACTER,
    collisionMask: COLLISIONS.ALL
  }));
  renderer.addToScene(character);

  (character as any).body = characterBody;
  objects.set(characterBody.id, character);
  characterBody.addEventListener(ControllerEvents.CONTROLLER_SHAPE_HIT, (ev) => {
    // console.log('Hit shape', ev);
  });
  characterBody.addEventListener(ControllerEvents.CONTROLLER_CONTROLLER_HIT, (ev) => {
    // console.log('Hit controller', ev);
  });
  characterBody.addEventListener(ControllerEvents.CONTROLLER_OBSTACLE_HIT, (ev) => {
    // console.log('Hit obstacle', ev);
  });

  const characterRaycastQuery = PhysXInstance.instance.addRaycastQuery({
    type: SceneQueryType.Closest,
    origin: character.position,
    direction: new Vector3(0, -1, 0),
    maxDistance: 1,
    collisionMask: COLLISIONS.ALL
  });

  const character2 = new Group();
  character2.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  character2.position.set(2, 1.5, 2);
  const characterBody2 = PhysXInstance.instance.createController(new Controller({
    isCapsule: true,
    radius: 0.5,
    position: character2.position,
    collisionLayer: COLLISIONS.CHARACTER,
    collisionMask: COLLISIONS.ALL
  }));

  renderer.addToScene(character2);
  (character2 as any).body = characterBody2;
  objects.set(characterBody2.id, character2);

  // const triggerPos = createNewTransform();
  // triggerPos.translation.x = 2;
  // triggerPos.translation.y = 1;

  // const triggerBody = PhysXInstance.instance.addBody(new Body({
  //   shapes: [
  //     {
  //       shape: SHAPES.Box,
  //       transform: createNewTransform(),
  //       config: {
  //         isTrigger: true,
  //         collisionLayer: COLLISIONS.BALL,
  //         collisionMask: COLLISIONS.ALL
  //       }
  //     }
  //   ],
  //   transform: triggerPos,
  //   type: BodyType.STATIC,
  // }));

  // triggerBody.addEventListener(CollisionEvents.TRIGGER_START, (ev) => {
  //   console.log(ev)
  // })

  const cameraRaycastQuery = PhysXInstance.instance.addRaycastQuery({
    type: SceneQueryType.Closest,
    origin: character.position,
    direction: new Vector3(0, -1, 0),
    maxDistance: 10,
    collisionMask: COLLISIONS.ALL
  });

  createBalls().forEach(async (object) => {
    const body = PhysXInstance.instance.addBody(new Body({
      shapes: getShapesFromObject(object).map((shape: Shape) => {
        shape.config.collisionLayer = COLLISIONS.BALL;
        shape.config.collisionMask = COLLISIONS.FLOOR | COLLISIONS.HAMMER | COLLISIONS.BALL;
        return shape;
      }),
      transform: getTransformFromWorldPos(object),
      type: BodyType.DYNAMIC
    }));
    PhysXInstance.instance.updateBody(body, { mass: Math.random() * 4, shapes: [ { config: { material: { dynamicFriction: 0.5, staticFriction: 0.2, restitution: 0.5 } } } ] });
    object.body = body;
    objects.set(body.id, object);
    balls.set(body.id, object);
    renderer.addToScene(object);
  });

  const platform = new Mesh(new BoxBufferGeometry(platformSize, 1, platformSize), new MeshStandardMaterial({ color: randomColor(), side: DoubleSide }));
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
    type: BodyType.STATIC
  }));
  (platform as any).body = groundPlane;
  objects.set(groundPlaneBody.id, groundPlane);
  renderer.addToScene(groundPlane);

  const obstacle1 = PhysXInstance.instance.addObstacle(new BoxObstacle({ 
    isCapsule: false,
    position: new Vector3(platformSize / 2, 2, 0),
    rotation: new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0), true),
    halfExtents: new Vector3(platformSize / 2, 1, 0.25)
  })); 

  const obstacle2 = PhysXInstance.instance.addObstacle(new BoxObstacle({ 
    isCapsule: false,
    position: new Vector3(-platformSize / 2, 2, 0),
    rotation: new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0), true),
    halfExtents: new Vector3(platformSize / 2, 1, 0.25)
  }));

  const obstacle3 = PhysXInstance.instance.addObstacle(new BoxObstacle({ 
    isCapsule: false,
    position: new Vector3(0, 2, platformSize / 2),
    rotation: new Quaternion().setFromEuler(new Euler(0, 0, 0), true),
    halfExtents: new Vector3(platformSize / 2, 1, 0.25)
  }));

  const obstacle4 = PhysXInstance.instance.addObstacle(new BoxObstacle({ 
    isCapsule: false,
    position: new Vector3(0, 2, -platformSize / 2),
    rotation: new Quaternion().setFromEuler(new Euler(0, 0, 0), true),
    halfExtents: new Vector3(platformSize / 2, 1, 0.25)
  }));

  const keys = {};
  document.addEventListener('keydown', (ev) => {
    keys[ev.code] = true;
    if (ev.code === 'Backquote') {
      debug.setEnabled(!debug.enabled)
    }
    if (ev.code === 'ShiftLeft') {
      // characterBody.resize(0);
    }
  });
  document.addEventListener('keyup', (ev) => {
    delete keys[ev.code];
    if (ev.code === 'ShiftLeft') {
      // characterBody.resize(1);
    }
    if (ev.code === 'KeyR') {
      characterBody.updateTransform({ translation: { x: 1, y: 1, z: 1 } })
    }
  });

  const debug = new DebugRenderer(renderer.scene);
  debug.setEnabled(true);
  let lastTime = Date.now() - (1 / 60);
  let lastDelta = 1 / 60;

  let lastCharacterPos = new Vector3();
  const raycaster = new Raycaster();
  const mouse = new Vector2();
  document.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  });

  document.addEventListener('pointerdown', (event) => {
    raycaster.setFromCamera( mouse, renderer.camera );
  	const intersects = raycaster.intersectObjects(Array.from(balls.values()));
    for ( let i = 0; i < intersects.length; i ++ ) {
      renderer.camera.getWorldDirection(vector3);
      vector3.multiplyScalar(10000);
      ((intersects[i].object as any).body as Body).addForce({ x: vector3.x, y: vector3.y, z: vector3.z })
	  }
  });

  PhysXInstance.instance.startPhysX(true);
  const update = () => {
    const time = Date.now();
    const timeSecs = time / 1000;
    const delta = time - lastTime;

    // if (kinematicBody.type === BodyType.KINEMATIC) {
    //   kinematicObject.position.set(Math.sin(timeSecs) * 10, 0, Math.cos(timeSecs) * 10);
    //   kinematicObject.lookAt(0, 0, 0);
    //   kinematicObject.position.setY(1);
    //   kinematicBody.updateTransform({ translation: kinematicObject.position, rotation: kinematicObject.quaternion });
    // }
    if (characterBody.collisions.down) {
      if (characterBody.velocity.y < 0)
        characterBody.velocity.y = 0;
    } else {
      characterBody.velocity.y -= (0.2 / delta);
    }
    Object.entries(keys).forEach(([key]) => {
      if (key === 'KeyW') {
        characterBody.delta.z -= 0.1;
      }
      if (key === 'KeyS') {
        characterBody.delta.z += 0.1;
      }
      if (key === 'KeyA') {
        characterBody.delta.x -= 0.1;
      }
      if (key === 'KeyD') {
        characterBody.delta.x += 0.1;
      }
      if (key === 'Space' && characterBody.collisions.down) {
        characterBody.velocity.y = 0.2;
      }
    })
    characterBody.delta.y += characterBody.velocity.y;
    characterRaycastQuery.origin = new Vector3().copy(character.position).add(new Vector3(0, -1, 0));

    const raycastDirection = new Vector3().subVectors(renderer.camera.position, renderer.controls.target).normalize();
    cameraRaycastQuery.origin = renderer.camera.position;
    cameraRaycastQuery.direction = new Vector3(raycastDirection.x, raycastDirection.y, raycastDirection.z);

    // console.log('cam', cameraRaycastQuery.hits.length, 'char', raycastQuery.hits.length)
    // console.log(cameraRaycastQuery.hits)
    objects.forEach((obj: any) => {
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
    balls.forEach(async (object: any, id) => {
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
    PhysXInstance.instance.update();
    debug.update();
    renderer.update();
    lastCharacterPos.copy(character.position);
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
    new CapsuleBufferGeometry(0.5, 0.5, 1),
    new ConeBufferGeometry(),
    new CylinderBufferGeometry(),
    new DodecahedronBufferGeometry(),
    new IcosahedronBufferGeometry(),
    new OctahedronBufferGeometry(),
    new SphereBufferGeometry(1),
    new TetrahedronBufferGeometry(),
    new TorusBufferGeometry(),
    new TorusKnotBufferGeometry(),
  ].map((geom) => { return new ConvexGeometry(arrayOfPointsToArrayOfVector3(geom.attributes.position.array)) }).concat([
    new BoxBufferGeometry(),
    new CapsuleBufferGeometry(0.5, 0.5, 1),
    new ConeBufferGeometry(),
    new CylinderBufferGeometry(),
    new DodecahedronBufferGeometry(),
    new IcosahedronBufferGeometry(),
    new OctahedronBufferGeometry(),
    new SphereBufferGeometry(1),
    new TetrahedronBufferGeometry(),
    new TorusBufferGeometry(),
    new TorusKnotBufferGeometry(),
  ])
  const meshes = [];
  for (let i = 0; i < 10; i++) {
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
