import { guid, UnknownKeyError} from "@iotile/iotile-common";
import {catService} from "../config";

export abstract class AbstractNotificationService {
    public abstract subscribe(event: string, callback: (string: string, any: any) => void): any;
    public abstract notify(event: string, args: any): void;
}

export class EventManager {
    private callbacks: {[key: string]: (string: string,any: any) => void};

    constructor(event: string){
        this.callbacks = {};
    }

    public addCallback(callback: (string: string, any: any) => void) {
        let id = guid();
        this.callbacks[id] = callback;

        return id;
    }

    public triggerCallback(event: string, args: any){
        for (let callback in this.callbacks){
            try {
                this.callbacks[callback](event, args);
            } catch(err) {
                catService.error("Could not trigger notification callback: ", err);
            }       
        }
    }

    public removeAll(){
        this.callbacks = {};
    }

    public removeCallback(handlerId: string){
        if (handlerId in this.callbacks){
            delete this.callbacks[handlerId];
        } else {
            throw new UnknownKeyError('Unknown event handler key: ' + handlerId);
        }
    }
}

export class BasicNotificationService extends AbstractNotificationService {
    private events: {[key: string]: EventManager};

    constructor(){
        super();
        this.events = {};
    }

    public subscribe(event: string, callback: (string: string, any: any) => void){
        if (!(event in this.events)){
            this.events[event] = new EventManager(event);
        }
        let handlerId = this.events[event].addCallback(callback);
        let that = this;

        let handler = function (){
            that.events[event].removeCallback(handlerId);
        }

        return handler;
    };

    public notify(event: string, args: any){
        if (event in this.events){
            let manager = this.events[event];
            manager.triggerCallback(event, args);
        }
    };

    public removeAll(){
        for (let event in this.events){
            this.events[event].removeAll();
        }
        this.events = {};
    }
}