import { Object3D, Raycaster, Vector3 } from "three";
import { PhysXInstance, RaycastQuery, SceneQueryType } from "../../src";
import { COLLISIONS } from "./golf";

const dist = 9.9
const step = 0.1

export class MeshAnalyser {
  raycastQuery: RaycastQuery
  sceneRaycast: Raycaster
  targetObj: Object3D
  currentPos: Vector3
  finished = false

  constructor (obj: Object3D) {
    this.targetObj = obj
    this.currentPos = new Vector3(-dist, 5, -dist)
    this.raycastQuery = PhysXInstance.instance.addRaycastQuery(new RaycastQuery({
      type: SceneQueryType.Closest,
      origin: this.currentPos,
      direction: new Vector3(0, -1, 0),
      maxDistance: 10,
      collisionMask: COLLISIONS.ALL
    }));
    this.sceneRaycast = new Raycaster(this.currentPos, new Vector3(0, -1, 0), 0, 10)
  }

  update() {
    if(this.finished) return;
    const physicsHit = this.raycastQuery.hits[0]
    this.sceneRaycast.set(this.currentPos, new Vector3(0, -1, 0))
    const sceneHit = this.sceneRaycast.intersectObject(this.targetObj, true)[0]

    if(physicsHit && sceneHit) { 
      if(Math.abs(physicsHit.distance - sceneHit.distance) < 0.01) {
        console.log('Hit!', physicsHit.distance - sceneHit.distance, physicsHit.distance, sceneHit.distance)
      } else  {
        console.error('Discrepancy!', physicsHit.distance - sceneHit.distance, physicsHit.distance, sceneHit.distance)
      }
    } else {
      console.warn('No hit', physicsHit, sceneHit)
    }
    if(this.currentPos.x > dist) {
      this.currentPos.x = -dist
      this.currentPos.z += step
      if(this.currentPos.z > dist) {
        this.finished = true
      }
    } else {
      this.currentPos.x += step
    }
    this.raycastQuery.origin.copy(this.currentPos)
  }

}