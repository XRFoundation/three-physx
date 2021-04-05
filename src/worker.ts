///<reference path="./types/PhysX.d.ts"/>

import { MessageQueue } from "./utils/MessageQueue";
export interface PhysXConfig {
  jsPath: string;
  wasmPath: string;
  tps?: number;
}

const noop = () => {}


export interface PhysXInteface {
  addBody: (body: any) => void;
  initPhysX: (config: PhysXConfig) => void;
  startPhysX: (start?: boolean) => void;
}

export class PhysXManager implements PhysXInteface {

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
  onUpdate: any = noop;

  initPhysX = async (config: PhysXConfig): Promise<void> => {
    //@ts-ignore
    importScripts(config.jsPath)
    if(config?.tps) {
      this.tps = config.tps;
    } 
    (globalThis as any).PhysX = await new (globalThis as any).PHYSX({
      locateFile: () => { return config.wasmPath; }
    });
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

    this.startPhysX(true);
  }

  simulate = () => {
    // this.scene.simulate(1/this.tps, true);
    // this.scene.fetchResults(true);
    this.onUpdate(new Uint8Array([0, 1, 2]));
  }

  startPhysX = (start: boolean = true) => {
    if(start) {
      this.updateInterval = setInterval(this.simulate, 1000/this.tps);
    } else {
      clearInterval()
    }
  }


  /**
   * PhysxInteface
   */

 addBody(body) {
   console.log(body)
 }

}

export const receiveWorker = async (): Promise<void> => {
  const messageQueue = new MessageQueue(globalThis as any);
  const _physxmanager = new PhysXManager()
  _physxmanager.onUpdate = (data: Uint8Array) => {
    messageQueue.sendEvent('data', data, [data.buffer])
  }
  const addFunctionListener = (eventLabel) => {
    messageQueue.addEventListener(eventLabel, ({ detail }) => {
      _physxmanager[eventLabel](...detail)
    })
  }
  Object.keys(_physxmanager).forEach((key) => {
    if(typeof _physxmanager[key] === 'function') {
      addFunctionListener(key)
    }
  })
  messageQueue.sendEvent('init', {})
}

receiveWorker()