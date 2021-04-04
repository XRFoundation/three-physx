///<reference path="./types/PhysX.d.ts"/>
console.log(location)
import * as Comlink from 'comlink';
interface PhysXConfig {
  build: string;
  tps?: number;
}

export class PhysXManager {

  physxVersion: number;
  defaultErrorCallback: PhysX.PxDefaultErrorCallback;
  allocator: PhysX.PxDefaultAllocator;
  foundation: PhysX.PxFoundation;
  cookingParamas: PhysX.PxCookingParams;
  cooking: PhysX.PxCooking;
  physics: PhysX.PxPhysics;
  scale: PhysX.PxTolerancesScale;
  sceneDesc: PhysX.PxSceneDesc;
  scene: PhysX.PxScene;

  updateInterval: any;
  tps: number = 60;

  async initPhysX (config: PhysXConfig): Promise<void> {
    //@ts-ignore
    importScripts(config.build)
    console.log(globalThis)
    if(config?.tps) {
      this.tps = config.tps;
    } 
    (globalThis as any).PhysX = await new (globalThis as any).PHYSX();
    this.physxVersion = PhysX.PX_PHYSICS_VERSION;
    this.defaultErrorCallback = new PhysX.PxDefaultErrorCallback();
    this.allocator = new PhysX.PxDefaultAllocator();
    this.foundation = PhysX.PxCreateFoundation(this.physxVersion, this.allocator, this.defaultErrorCallback);
    this.cookingParamas = new PhysX.PxCookingParams(new PhysX.PxTolerancesScale());
    this.cooking = PhysX.PxCreateCooking(this.physxVersion, this.foundation, this.cookingParamas);
    this.physics = PhysX.PxCreatePhysics(this.physxVersion, this.foundation, new PhysX.PxTolerancesScale(), false, null);

    const triggerCallback = {
      onContactBegin : () => {},
      onContactEnd : () => {},
      onContactPersist : () => {},
      onTriggerBegin : () => {},
      onTriggerEnd : () => {},
    };

    this.scale = this.physics.getTolerancesScale();
    this.sceneDesc = PhysX.getDefaultSceneDesc(this.scale, 0, PhysX.PxSimulationEventCallback.implement(triggerCallback as any));
    this.sceneDesc.bounceThresholdVelocity = 0.001;

    this.scene = this.physics.createScene(this.sceneDesc);

    console.log(this.scene)

    this.simulate = this.simulate.bind(this)
    this.startPhysX(true);
  }

  simulate() {
    this.scene.simulate(1/this.tps, true);
    this.scene.fetchResults(true);
  }

  startPhysX(start: boolean) {
    if(start) {
      this.updateInterval = setInterval(this.simulate, 1000/this.tps);
    } else {
      clearInterval()
    }
  }
}

const _physxmanager = new PhysXManager()

Comlink.expose(_physxmanager);
