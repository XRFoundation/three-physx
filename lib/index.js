import * as BufferConfig from './BufferConfig';
import { MessageQueue } from './utils/MessageQueue';
import { PhysXBodyType, } from './types/ThreePhysX';
import { threeToPhysX } from './threeToPhysX';
let nextAvailableBodyIndex = 0;
export class PhysXInstance {
    constructor(worker, onUpdate) {
        this.bodies = new Map();
        this.kinematicBodies = new Map();
        this.initPhysX = async (config) => {
            const messageQueue = new MessageQueue(this.worker);
            await new Promise((resolve) => {
                messageQueue.addEventListener('init', () => {
                    resolve(true);
                });
            });
            messageQueue.addEventListener('data', (ev) => {
                const array = ev.detail;
                this.bodies.forEach((rigidBody, id) => {
                    if (rigidBody.bodyConfig.bodyOptions.type === PhysXBodyType.DYNAMIC) {
                        const offset = id * BufferConfig.BODY_DATA_SIZE;
                        rigidBody.transform.translation.x = array[offset];
                        rigidBody.transform.translation.y = array[offset + 1];
                        rigidBody.transform.translation.z = array[offset + 2];
                        rigidBody.transform.rotation.x = array[offset + 3];
                        rigidBody.transform.rotation.y = array[offset + 4];
                        rigidBody.transform.rotation.z = array[offset + 5];
                        rigidBody.transform.rotation.w = array[offset + 6];
                        if (rigidBody.bodyConfig.bodyOptions.type === PhysXBodyType.DYNAMIC) {
                            rigidBody.transform.linearVelocity.x = array[offset + 7];
                            rigidBody.transform.linearVelocity.y = array[offset + 8];
                            rigidBody.transform.linearVelocity.z = array[offset + 9];
                            rigidBody.transform.angularVelocity.x = array[offset + 10];
                            rigidBody.transform.angularVelocity.y = array[offset + 11];
                            rigidBody.transform.angularVelocity.z = array[offset + 12];
                        }
                    }
                });
                this.onUpdate();
            });
            this.physicsProxy = {
                initPhysX: pipeRemoteFunction(messageQueue, 'initPhysX'),
                update: pipeRemoteFunction(messageQueue, 'update'),
                startPhysX: pipeRemoteFunction(messageQueue, 'startPhysX'),
                addBody: pipeRemoteFunction(messageQueue, 'addBody'),
                updateBody: pipeRemoteFunction(messageQueue, 'updateBody'),
                removeBody: pipeRemoteFunction(messageQueue, 'removeBody'),
                addConstraint: pipeRemoteFunction(messageQueue, 'addConstraint'),
                removeConstraint: pipeRemoteFunction(messageQueue, 'removeConstraint'),
                enableDebug: pipeRemoteFunction(messageQueue, 'enableDebug'),
                resetDynamicBody: pipeRemoteFunction(messageQueue, 'resetDynamicBody'),
                activateBody: pipeRemoteFunction(messageQueue, 'activateBody'),
            };
            await this.physicsProxy.initPhysX([config]);
        };
        // update kinematic bodies
        this.update = async () => {
            // TODO: make this rely on kinematicBodies.size instead of bodies.size
            this.kinematicArray = new Float32Array(new ArrayBuffer(4 * BufferConfig.BODY_DATA_SIZE * this.bodies.size));
            const kinematicIDs = [];
            this.kinematicBodies.forEach((obj, id) => {
                kinematicIDs.push(id);
                obj.body.transform.translation.x = obj.position.x;
                obj.body.transform.translation.y = obj.position.y;
                obj.body.transform.translation.z = obj.position.z;
                obj.body.transform.rotation.x = obj.quaternion.x;
                obj.body.transform.rotation.y = obj.quaternion.y;
                obj.body.transform.rotation.z = obj.quaternion.z;
                obj.body.transform.rotation.w = obj.quaternion.w;
                const transform = obj.body.transform;
                this.kinematicArray.set([
                    transform.translation.x,
                    transform.translation.y,
                    transform.translation.z,
                    transform.rotation.x,
                    transform.rotation.y,
                    transform.rotation.z,
                    transform.rotation.w,
                ], id * BufferConfig.BODY_DATA_SIZE);
            });
            this.physicsProxy.update([kinematicIDs, this.kinematicArray], [this.kinematicArray.buffer]);
        };
        this.startPhysX = async (start) => {
            return this.physicsProxy.startPhysX([start]);
        };
        this.addBody = async (object) => {
            const id = this._getNextAvailableID();
            threeToPhysX(object, id);
            await this.physicsProxy.addBody([object.body]);
            this.bodies.set(id, object.body);
            if (object.body.bodyConfig.bodyOptions.type ===
                PhysXBodyType.KINEMATIC) {
                this.kinematicBodies.set(id, object);
            }
            return object.body;
        };
        this.updateBody = async (object, options) => {
            const id = object.body.id;
            await this.physicsProxy.updateBody([{ id, options }]);
            return;
        };
        this.removeBody = async (object) => {
            const id = object.body.id;
            await this.physicsProxy.removeBody([{ id }]);
            delete this.bodies[id];
            return;
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
        this._getNextAvailableID = () => {
            indexOfSmallest(Object.keys(this.bodies));
            return nextAvailableBodyIndex++;
        };
        PhysXInstance.instance = this;
        this.worker = worker;
        this.onUpdate = onUpdate;
    }
    getBuffer() {
        return this.kinematicArray.buffer;
    }
}
const indexOfSmallest = (a) => {
    var lowest = 0;
    for (var i = 1; i < a.length; i++) {
        if (a[i] < a[lowest])
            lowest = i;
    }
    return lowest;
};
const pipeRemoteFunction = (messageQueue, id, transferrables) => {
    return (args, transferables) => {
        return new Promise((resolve) => {
            const uuid = generateUUID();
            const callback = ({ detail }) => {
                messageQueue.removeEventListener(uuid, callback);
                resolve(detail.returnValue);
            };
            messageQueue.addEventListener(uuid, callback);
            messageQueue.sendEvent(id, { args, uuid }, transferables);
        });
    };
};
const generateUUID = () => {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join('-');
};
export { threeToPhysXModelDescription } from './threeToPhysXModelDescription';
//# sourceMappingURL=index.js.map