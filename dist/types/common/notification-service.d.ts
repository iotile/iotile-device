export declare abstract class AbstractNotificationService {
    abstract subscribe(event: string, callback: (string: string, any: any) => void): any;
    abstract notify(event: string, args: any): void;
}
export declare class EventManager {
    private callbacks;
    constructor(event: string);
    addCallback(callback: (string: string, any: any) => void): any;
    triggerCallback(event: string, args: any): void;
    removeAll(): void;
    removeCallback(handlerId: string): void;
}
export declare class BasicNotificationService extends AbstractNotificationService {
    private events;
    constructor();
    subscribe(event: string, callback: (string: string, any: any) => void): () => void;
    notify(event: string, args: any): void;
    removeAll(): void;
}
