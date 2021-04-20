export declare enum MessageType {
    ADD_EVENT = 0,
    REMOVE_EVENT = 1,
    EVENT = 2
}
export interface Message {
    messageType: MessageType | string;
    message: object;
    transferables?: Transferable[];
}
export declare class EventDispatcherProxy {
    [x: string]: any;
    eventTarget: EventTarget;
    eventListener: any;
    messageTypeFunctions: Map<MessageType | string, any>;
    _listeners: any;
    constructor();
    addEventListener(type: string, listener: any): void;
    hasEventListener(type: string, listener: any): boolean;
    removeEventListener(type: string, listener: any): void;
    dispatchEvent(event: any, fromSelf?: boolean): void;
}
export declare class MessageQueue extends EventDispatcherProxy {
    messagePort: any;
    queue: Message[];
    interval: any;
    eventTarget: EventTarget;
    toTransfer: Transferable[];
    constructor(messagePort: any);
    sendEvent(type: string, detail: any, transferables?: Transferable[]): void;
    sendQueue(): void;
    receiveQueue(message: any): void;
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
    dispatchEvent(ev: any, fromSelf?: boolean): void;
}
