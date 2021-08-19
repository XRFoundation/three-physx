import { PhysXInstance, SceneQueryType, CollisionEvents, ControllerEvents, Body, ShapeType, BodyType, Controller, SHAPES, Transform, Obstacle, BoxObstacle, Shape, ColliderHitEvent, RaycastQuery, ControllerHitEvent } from '../../src';
import { Mesh, MeshBasicMaterial, Color, Object3D, Group, Vector3, Raycaster, Vector2 } from 'three';
import { getShapesFromObject, getTransformFromWorldPos } from './threeToPhysX';
import { CapsuleBufferGeometry } from './CapsuleBufferGeometry';
import { DebugRenderer } from './DebugRenderer';
import Terrain from './trimeshTerrain';
import { MeshAnalyser } from './meshAnalyser';

const vector3 = new Vector3();

export enum COLLISIONS {
  NONE = 0,
  FLOOR = 1 << 0,
  CHARACTER = 1 << 1,
  BALL = 1 << 2,
  HAMMER = 1 << 3,
  TRIGGER = 1 << 4,
  ALL = FLOOR | CHARACTER | BALL | HAMMER | TRIGGER ,
}

export const load = async () => {
  const renderer = await import('./renderer');

  const objects = new Map<number, Object3D>();
  const balls = new Map<number, Object3D>();
  (globalThis as any).objects = objects;

  // @ts-ignore
  await PhysXInstance.instance.initPhysX(new Worker(new URL('./worker.ts', import.meta.url), { type: "module" }), { 
    // substeps: 8, 
    // verbose: true 
  });

  const character = new Group();
  character.add(new Mesh(new CapsuleBufferGeometry(0.5, 0.5, 1), new MeshBasicMaterial({ color: randomColor() })));
  const characterBody = PhysXInstance.instance.createController(new Controller({
    isCapsule: true,
    radius: 0.5,
    position: { y: 5 },
  }));
  characterBody.collisionLayer = COLLISIONS.CHARACTER;
  characterBody.collisionMask = COLLISIONS.ALL;
  let characterGrounded = false;
  renderer.addToScene(character);

  (character as any).body = characterBody;
  objects.set(characterBody.id, character);

  const characterRaycastQuery = PhysXInstance.instance.addRaycastQuery(new RaycastQuery({
    type: SceneQueryType.Closest,
    origin: new Vector3(),
    direction: new Vector3(0, -1, 0),
    maxDistance: 0.05,
    collisionMask: COLLISIONS.ALL
  }));

  const terrain = new Terrain();
  const terrainBody = PhysXInstance.instance.addBody(new Body({
    shapes: getShapesFromObject(terrain.mesh).map((shape: ShapeType) => {
      shape.config.collisionLayer = COLLISIONS.FLOOR;
      shape.config.collisionMask = COLLISIONS.ALL;
      shape.config.contactOffset = 0
      return shape;
    }),
    transform: getTransformFromWorldPos(terrain.mesh),
    type: BodyType.STATIC
  }));
  objects.set(terrainBody.id, terrain.mesh)
  renderer.addToScene(terrain.mesh)

  // const meshAnalyser = new MeshAnalyser(terrain.mesh)

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

  const update = () => {
    const time = Date.now();
    const timeSecs = time / 1000;
    const delta = time - lastTime;

    characterGrounded = characterBody.collisions.down || characterRaycastQuery.hits.length > 0;

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
      if (key === 'Space' && characterGrounded) {
        characterBody.velocity.y = 0.2;
      }
    })
    if (characterGrounded) {
      if (characterBody.velocity.y < 0)
        characterBody.velocity.y = 0;
    }
    characterBody.velocity.y -= (0.2 / delta);
    characterBody.delta.y += characterBody.velocity.y;
    characterRaycastQuery.origin.copy(character.position).y -= 1;

    // console.log('cam', cameraRaycastQuery.hits.length, 'char', characterRaycastQuery.hits.length)
    // console.log(cameraRaycastQuery.hits, characterRaycastQuery.hits)
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
    // meshAnalyser.update()

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

const randomColor = () => {
  return new Color(Math.random() * 0xffffff);
};
