///<reference path="./types/PhysX.d.ts"/>
import { Matrix4, Vector3, Quaternion } from 'three';
import { getShape } from './getShape';
import { PhysXBodyType, } from './types/ThreePhysX';
import { MessageQueue } from './utils/MessageQueue';
import * as BufferConfig from './BufferConfig';
const noop = () => { };
const mat4 = new Matrix4();
const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();
let lastTick = 0;
export class PhysXManager {
    constructor() {
        this.tps = 60;
        this.onUpdate = noop;
        this.bodies = new Map();
        this.dynamic = new Map();
        this.shapes = new Map();
        this.matrices = new Map();
        this.indices = new Map();
        // constraints: // TODO
        this.initPhysX = async (config) => {
            //@ts-ignore
            importScripts(config.jsPath);
            if (config === null || config === void 0 ? void 0 : config.tps) {
                this.tps = config.tps;
            }
            globalThis.PhysX = await new globalThis.PHYSX({
                locateFile: () => {
                    return config.wasmPath;
                },
            });
            this.physxVersion = PhysX.PX_PHYSICS_VERSION;
            this.defaultErrorCallback = new PhysX.PxDefaultErrorCallback();
            this.allocator = new PhysX.PxDefaultAllocator();
            this.foundation = PhysX.PxCreateFoundation(this.physxVersion, this.allocator, this.defaultErrorCallback);
            this.cookingParamas = new PhysX.PxCookingParams(new PhysX.PxTolerancesScale());
            this.cooking = PhysX.PxCreateCooking(this.physxVersion, this.foundation, this.cookingParamas);
            this.physics = PhysX.PxCreatePhysics(this.physxVersion, this.foundation, new PhysX.PxTolerancesScale(), false, null);
            const triggerCallback = {
                onContactBegin: (shapeA, shapeB) => {
                    // console.log('onContactBegin', shapeA, shapeB)
                },
                onContactEnd: (shapeA, shapeB) => {
                    // console.log('onContactEnd', shapeA, shapeB)
                },
                onContactPersist: (shapeA, shapeB) => {
                    // console.log('onContactPersist', shapeA, shapeB)
                },
                onTriggerBegin: (shapeA, shapeB) => {
                    // console.log('onTriggerBegin', shapeA, shapeB)
                },
                onTriggerEnd: (shapeA, shapeB) => {
                    // console.log('onTriggerEnd', shapeA, shapeB)
                },
            };
            this.scale = this.physics.getTolerancesScale();
            this.sceneDesc = PhysX.getDefaultSceneDesc(this.scale, 0, PhysX.PxSimulationEventCallback.implement(triggerCallback));
            this.sceneDesc.bounceThresholdVelocity = 0.001;
            this.scene = this.physics.createScene(this.sceneDesc);
            this.startPhysX(true);
        };
        this.simulate = async () => {
            const now = Date.now();
            const delta = now - lastTick;
            this.scene.simulate(delta / 1000, true);
            this.scene.fetchResults(true);
            this.objectArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.BODY_DATA_SIZE * this.bodies.size));
            this.bodies.forEach((body, id) => {
                if (isDynamicBody(body)) {
                    this.objectArray.set(getBodyData(body), id * BufferConfig.BODY_DATA_SIZE);
                }
            });
            this.onUpdate(this.objectArray);
            lastTick = now;
        };
        this.update = async (kinematicIDs, kinematicBodiesArray) => {
            kinematicIDs.forEach((id) => {
                const body = this.bodies.get(id);
                const offset = id * BufferConfig.BODY_DATA_SIZE;
                const currentPose = body.getGlobalPose();
                currentPose.translation.x = kinematicBodiesArray[offset];
                currentPose.translation.y = kinematicBodiesArray[offset + 1];
                currentPose.translation.z = kinematicBodiesArray[offset + 2];
                currentPose.rotation.x = kinematicBodiesArray[offset + 3];
                currentPose.rotation.y = kinematicBodiesArray[offset + 4];
                currentPose.rotation.z = kinematicBodiesArray[offset + 5];
                currentPose.rotation.w = kinematicBodiesArray[offset + 6];
                body.setKinematicTarget(currentPose);
            });
        };
        this.startPhysX = async (start = true) => {
            if (start) {
                lastTick = Date.now() - 1 / this.tps; // pretend like it's only been one tick
                this.updateInterval = setInterval(this.simulate, 1000 / this.tps);
            }
            else {
                clearInterval();
            }
        };
        this.addBody = async ({ id, transform, bodyConfig }) => {
            const { shapes, bodyOptions } = bodyConfig;
            const { type, trigger } = bodyOptions;
            let rigidBody;
            if (type === PhysXBodyType.STATIC) {
                rigidBody = this.physics.createRigidStatic(transform);
            }
            else {
                rigidBody = this.physics.createRigidDynamic(transform);
                if (type === PhysXBodyType.KINEMATIC) {
                    const flags = new PhysX.PxRigidBodyFlags(PhysX.PxRigidBodyFlag.eKINEMATIC.value);
                    rigidBody.setRigidBodyFlags(flags);
                    // (rigidBody as PhysX.RigidDynamic).setRigidBodyFlag(PhysX.PxRigidBodyFlag.eKINEMATIC.value, true);
                }
                rigidBody._type = type;
            }
            if (trigger) {
            }
            const bodyShapes = [];
            shapes.forEach(({ shape, vertices, indices, options }) => {
                const bodyShape = getShape({ shape, vertices, indices, options });
                bodyShape.setContactOffset(0.0000001);
                const filterData = new PhysX.PxFilterData(1, 1, 0, 0);
                bodyShape.setSimulationFilterData(filterData);
                bodyShapes.push(bodyShape);
                rigidBody.attachShape(bodyShape);
            });
            this.shapes.set(id, bodyShapes);
            this.bodies.set(id, rigidBody);
            this.scene.addActor(rigidBody, null);
        };
        this.updateBody = async ({ options }) => {
            // todo
        };
        this.removeBody = async ({ id }) => {
            const body = this.bodies.get(id);
            this.scene.removeActor(body, false);
            this.bodies.delete(id);
        };
        this.addConstraint = async () => {
            // todo
        };
        this.removeConstraint = async () => {
            // todo
        };
        this.enableDebug = async () => {
            // todo
        };
        this.resetDynamicBody = async () => {
            // todo
        };
        this.activateBody = async () => {
            // todo
        };
    }
}
const isKinematicBody = (body) => {
    return body._type === PhysXBodyType.KINEMATIC;
};
const isDynamicBody = (body) => {
    return body._type === PhysXBodyType.DYNAMIC;
};
const getBodyData = (body) => {
    const transform = body.getGlobalPose();
    const linVel = body.getLinearVelocity();
    const angVel = body.getAngularVelocity();
    return [
        transform.translation.x,
        transform.translation.y,
        transform.translation.z,
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.w,
        linVel.x,
        linVel.y,
        linVel.z,
        angVel.x,
        angVel.y,
        angVel.z,
    ];
};
const mat4ToTransform = (matrix) => {
    matrix.decompose(pos, quat, scale);
    return {
        translation: {
            x: pos.x,
            y: pos.y,
            z: pos.z,
        },
        rotation: {
            x: quat.x,
            y: quat.y,
            z: quat.z,
            w: quat.w,
        },
    };
};
export const receiveWorker = async () => {
    const messageQueue = new MessageQueue(globalThis);
    PhysXManager.instance = new PhysXManager();
    PhysXManager.instance.onUpdate = (data) => {
        messageQueue.sendEvent('data', data, [data.buffer]);
    };
    const addFunctionListener = (eventLabel) => {
        messageQueue.addEventListener(eventLabel, async ({ detail }) => {
            PhysXManager.instance[eventLabel](...detail.args).then((returnValue) => {
                messageQueue.sendEvent(detail.uuid, { returnValue });
            });
        });
    };
    Object.keys(PhysXManager.instance).forEach((key) => {
        if (typeof PhysXManager.instance[key] === 'function') {
            addFunctionListener(key);
        }
    });
    messageQueue.sendEvent('init', {});
};
receiveWorker();
//# sourceMappingURL=worker.js.map