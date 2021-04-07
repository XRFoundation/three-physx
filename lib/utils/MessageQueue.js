export var MessageType;
(function (MessageType) {
    MessageType[MessageType["ADD_EVENT"] = 0] = "ADD_EVENT";
    MessageType[MessageType["REMOVE_EVENT"] = 1] = "REMOVE_EVENT";
    MessageType[MessageType["EVENT"] = 2] = "EVENT";
})(MessageType || (MessageType = {}));
export class EventDispatcherProxy {
    constructor() {
        this.eventTarget = new EventTarget();
        this._listeners = {};
        this.eventListener = (args) => {
            this.queue.push({
                messageType: MessageType.EVENT,
                message: simplifyObject(args),
            });
        };
        this.messageTypeFunctions = new Map();
        this.messageTypeFunctions.set(MessageType.EVENT, (event) => {
            event.preventDefault = () => { };
            event.stopPropagation = () => { };
            delete event.target;
            this.dispatchEvent(event, true);
        });
        this.messageTypeFunctions.set(MessageType.ADD_EVENT, ({ type }) => {
            this.eventTarget.addEventListener(type, this.eventListener);
        });
        this.messageTypeFunctions.set(MessageType.REMOVE_EVENT, ({ type }) => {
            this.eventTarget.removeEventListener(type, this.eventListener);
        });
    }
    addEventListener(type, listener) {
        if (this._listeners[type] === undefined) {
            this._listeners[type] = [];
        }
        if (this._listeners[type].indexOf(listener) === -1) {
            this._listeners[type].push(listener);
        }
    }
    hasEventListener(type, listener) {
        return (this._listeners[type] !== undefined &&
            this._listeners[type].indexOf(listener) !== -1);
    }
    removeEventListener(type, listener) {
        const listenerArray = this._listeners[type];
        if (listenerArray !== undefined) {
            const index = listenerArray.indexOf(listener);
            if (index !== -1) {
                listenerArray.splice(index, 1);
            }
        }
    }
    dispatchEvent(event, fromSelf) {
        const listenerArray = this._listeners[event.type];
        if (listenerArray !== undefined) {
            event.target = this;
            const array = listenerArray.slice(0);
            for (let i = 0, l = array.length; i < l; i++) {
                array[i].call(this, event);
            }
        }
    }
}
export class MessageQueue extends EventDispatcherProxy {
    constructor(messagePort) {
        super();
        this.eventTarget = new EventTarget();
        this.messagePort = messagePort;
        this.queue = [];
        this.messagePort.onmessage = (message) => {
            this.receiveQueue(message.data);
        };
        this.interval = setInterval(() => {
            this.sendQueue();
        }, 1000 / 60);
    }
    sendEvent(type, detail, transferables) {
        this.queue.push({
            messageType: MessageType.EVENT,
            message: {
                type,
                detail,
            },
            transferables,
        });
    }
    sendQueue() {
        var _a;
        if (!((_a = this.queue) === null || _a === void 0 ? void 0 : _a.length))
            return;
        const messages = [];
        this.queue.forEach((message) => {
            messages.push({
                messageType: message.messageType,
                message: message.message,
            });
        });
        const transferables = [];
        this.queue.forEach((message) => {
            message.transferables && transferables.push(...message.transferables);
        });
        try {
            this.messagePort.postMessage(messages, transferables);
        }
        catch (e) {
            console.log(e, messages, this, globalThis);
        }
        this.queue = [];
    }
    receiveQueue(queue) {
        queue.forEach((element) => {
            const { messageType, message } = element;
            if (this.messageTypeFunctions.has(messageType)) {
                this.messageTypeFunctions.get(messageType)(message);
            }
        });
    }
    addEventListener(type, listener) {
        this.queue.push({
            messageType: MessageType.ADD_EVENT,
            message: { type },
        });
        super.addEventListener(type, listener);
    }
    removeEventListener(type, listener) {
        this.queue.push({
            messageType: MessageType.REMOVE_EVENT,
            message: { type },
        });
        super.removeEventListener(type, listener);
    }
    dispatchEvent(ev, fromSelf) {
        if (!fromSelf) {
            this.queue.push({
                messageType: MessageType.EVENT,
                message: simplifyObject(ev),
            });
        }
        super.dispatchEvent(ev);
    }
}
function simplifyObject(object) {
    const messageData = {};
    for (const prop in object)
        if (typeof object[prop] !== 'function')
            messageData[prop] = object[prop];
    return messageData;
}
//# sourceMappingURL=MessageQueue.js.map