import { BasicNotificationService } from "./notification-service";
import { IOTileAdvertisement } from "./advertisement";
import { IOTileReport } from "./iotile-reports";
import { InterfaceNotImplementedError, DeviceAdapterInInvalidStateError, DeviceInInvalidStateError } from "./error-space";
import { Platform } from "./iotile-types";
import { Category } from "typescript-logging";
import { ArgumentError } from "iotile-common";

/*
 * Different types of support device adapters.
 * 
 * These correspond with different communications protocols and allow IOTileAdapter
 * to apply different optimizations or procedures based on the general protocol used.
 * For example, we need to optimize the connection interval on BLE based device adapters
 * but we don't need to on Websockets.
 */
export const BLE_DEVICE_ADAPTER_CLASS = "ble";

export type ProgressCallback = (doneCount: number, totalCount: number) => void;

export enum DeviceAdapterEvent {
    DeviceSeen = "DeviceSeen",
    PreviousDevicesInvalid = "PreviousDevicesInvalid",
    ReportChunkReceived = "ReportChunkReceived",
    TraceChunkReceived = "TraceChunkReceived",
    AdapterError = "AdapterError",
    AdapterPermissionError = "AdapterPermissionError",
    DeviceDisconnected = "DeviceDisconnected"
}

export enum DeviceAdapterConfig {
    ExpirationTime = 'ExpirationTime'
}

export enum DeviceAdapterState {
    Stopped = 0,
    Starting,
    Started,
    Stopping,
    Error
};


export abstract class DeviceAdapter {
    private     callbacks: BasicNotificationService;
    private     config: {[key: string]: string|number};

    protected   type: string;
    protected   name: string;
    protected   id: number;
    protected   state: DeviceAdapterState;
    protected   platform: Platform;
    protected   logger: Category;

    constructor(type: string, name: string, platform: Platform, logger: Category) {
        this.callbacks = new BasicNotificationService();
        this.type = type;
        this.name = name;
        this.platform = platform;
        this.id = -1;
        this.state = DeviceAdapterState.Stopped;
        this.logger = logger;
        this.config = {};
    }

    public setConfig(name: DeviceAdapterConfig, value: string | number) {
        this.config[name] = value
    }

    public getConfig(name: DeviceAdapterConfig, defaultValue?: string | number) {
        if (!(name in this.config)) {
            if (defaultValue === undefined)
                throw new ArgumentError(`DeviceAdapter.getConfig called without default value on ${name} and no value was set`);
            
            return defaultValue;
        }

        return this.config[name];
    }

    public setID(id: number) {
        this.id = id;
    }

    public get adapterID(): number {
        return this.id;
    }

    public get adapterClass(): string {
        return this.type;
    }

    public get adapterName(): string {
        return this.name;
    }

    public addCallback(event: DeviceAdapterEvent, callback: (event: string, data: any) => void): () => void {
        return this.callbacks.subscribe(event, callback);
    }

    protected verifyState(acceptable: DeviceAdapterState[] | DeviceAdapterState) {
        if (acceptable instanceof Array) {
            for(let state of acceptable) {
                if (this.state === state)
                    return;
            }

            throw new DeviceAdapterInInvalidStateError(`DeviceAdapter ${this.name} was in state ${this.state} and needed to be in one of ${JSON.stringify(acceptable)}`);
        } else if (this.state !== acceptable) {
            throw new DeviceAdapterInInvalidStateError(`DeviceAdapter ${this.name} was in state ${this.state} and needed to be in ${acceptable}`);
        }
    }

    protected onDeviceSeen(advertisement: IOTileAdvertisement) {
        if (this.state === DeviceAdapterState.Stopped)
            return;

        this.callbacks.notify(DeviceAdapterEvent.DeviceSeen, advertisement);
    }

    protected onReportChunkReceived(data: ArrayBuffer) {
        if (this.state === DeviceAdapterState.Stopped)
            return;

        this.callbacks.notify(DeviceAdapterEvent.ReportChunkReceived, data);
    }

    protected onTraceChunkReceived(data: ArrayBuffer) {
        if (this.state === DeviceAdapterState.Stopped)
            return;

        this.callbacks.notify(DeviceAdapterEvent.TraceChunkReceived, data);
    }

    protected onAdapterError(userMessage: string, details: any) {
        if (this.state === DeviceAdapterState.Stopped)
            return;

        this.callbacks.notify(DeviceAdapterEvent.AdapterError, {userMessage: userMessage, details: details});
    }

    protected onUnexpectedDisconnection(connectionID: number) {
        if (this.state === DeviceAdapterState.Stopped)
            return;

        this.callbacks.notify(DeviceAdapterEvent.DeviceDisconnected, {connectionID: connectionID});
    }

    /* 
     * Generic IOTile DeviceAdapter Interface
     * 
     * These are all of the methods that need to be implemented by a subclass in order to
     * become a DeviceAdapter.  It is required that a DeviceAdapter implement both the 
     * connect and disconnect methods, but it does not need to implement all of the different
     * interfaces.  Any interface that is not implemented will default to raising a
     * NotImplemented exception.
     */

    public abstract connect(connectionID: number, connectionString: string): Promise<void>;
    public abstract disconnect(connectionID: number): Promise<void>;

    public async start() {
        this.verifyState(DeviceAdapterState.Stopped);
        this.state = DeviceAdapterState.Started;
    }

    public async stop() {
        this.verifyState(DeviceAdapterState.Started);
        this.state = DeviceAdapterState.Stopped;
    }

    public probe(): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the probe method`));
    }

    /*
     * Management Functions
     * 
     * It is the job of whoever is wiring up this DeviceAdapter into an application
     * to call suspend and resume appropriately if they are on a mobile platform
     * where bluetooth will fail if the app goes into the background.
     * 
     * Note that suspend() may not block, whereas resume can be asynchronous.
     */

    public suspend() {

    }

    public resume(): Promise<void> {
        return Promise.resolve();
    }
    
    /*
     * RPC Interface
     * 
     * There is a single thing you can do with an RPC interface:
     * use it to send an rpc using the rpc() method.
     */
    public openRPCInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the RPC interface`));
    };

    public closeRPCInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the RPC interface`));
    };

    public rpc(connectionID: number, address: number, rpcID: number, payload: ArrayBuffer, timeout: number): Promise<ArrayBuffer> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the RPC interface`));
    };

    /*
     * Script Interface
     * 
     * The script interface is for sending high speed scripts to a device.  A script is a file that contains
     * a series of commands that the device should process together as an atomic unit.
     */
    public openScriptInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Script interface`));
    };

    public closeScriptInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Script interface`));
    };

    public sendScript(connectionID: number, script: ArrayBuffer, progress?: ProgressCallback): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Script interface`));
    }

    /*
     * Trace Interface
     * 
     * The trace interface has no user callable methods.  The only way a user can interact with the trace interface
     * is by registering an onTrace callback that will be called when tracing data is received.  The primary use
     * of the trace interface is to send highspeed binary data from a devie to the client.  There is no imposed constraint
     * on what data can be sent on the trace interface. 
     */

    public openTraceInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Trace interface`));
    };

    public closeTraceInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Trace interface`));
    };

    /*
     * Stream Interface
     * 
     * The stream interface has no user callable methods.  The only way a use can interact with the stream interface
     * is by registering an onReport callback that will be called whenever a new Streamer Report is received.  The only
     * kind of data that can be sent over the stream interface is a subclass of IOTileReport, which contains structured
     * timeseries data.
     */

    public openStreamInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Stream interface`));
    };

    public closeStreamInterface(connectionID: number): Promise<void> {
        return Promise.reject(new InterfaceNotImplementedError(`DeviceAdapter ${this.name} of class ${this.type} does not implement the Stream interface`));
    };
}


export abstract class ConnectionTrackingDeviceAdapter<ConnectionData> extends DeviceAdapter {
    protected   connections: {[key: number]: ConnectionData};

    constructor(type: string, name: string, platform: Platform, logger: Category) {
        super(type, name, platform, logger);
        this.connections = {};
    }

    protected getConnectionData(connID: number) {
        if (!(connID in this.connections))
            throw new DeviceInInvalidStateError(`getConnectionData called for connection ID ${connID} which does not exist.`);
        
        return this.connections[connID];
    }

    protected setConnectionData(connID: number, data: ConnectionData, force?: boolean) {
        if (connID in this.connections && force !== true)
            throw new DeviceInInvalidStateError(`setConnectionData called multiple times for connection ID ${connID} and force not specified`);
        
        this.connections[connID] = data;
    }

    protected deleteConnectionData(connID: number, force?:boolean) {
        if (!(connID in this.connections) && force !== true)
            throw new DeviceInInvalidStateError(`deleteConnectionDta called and connection ID ${connID} did not exist (force not specified)`);
        
        if (connID in this.connections)
            delete this.connections[connID];
    }
}