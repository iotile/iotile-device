import { IOTileAdvertisement } from "./iotile-advert-serv";
import { AbstractIOTileAdapter } from "./iotile-base-types";
import { ProgressNotifier } from "iotile-common";
import { RawReading } from "../common/iotile-reports";
export interface BLEConnectionInfo {
    intervalMS: number;
    timeoutMS: number;
    preferredMinMS: number;
    preferredMaxMS: number;
}
export interface StreamerInfo {
    lastAttemptTime: number;
    lastSuccessTime: number;
    lastError: number;
    highestAck: number;
    lastStatus: number;
    backoffNumber: number;
    commStatus: number;
}
export declare enum MatchBy {
    MatchBySlot = 1,
    MatchController = 2,
    MatchByName = 3,
}
export declare enum RemoteBridgeState {
    Idle = 0,
    WaitingForScript = 1,
    ReceivingScript = 2,
    ReceivedCompleteScript = 3,
    ValidatedScript = 4,
    ExecutingScript = 5,
}
export interface RemoteBridgeStatus {
    state: RemoteBridgeState;
    lastError: number;
}
/**
 * Proxy class for calling functionality on the script processing and firmware update engine on an IOTile Device
 */
export declare class RemoteBridge {
    private adapter;
    constructor(adapter: AbstractIOTileAdapter);
    beginScript(): Promise<void>;
    endScript(): Promise<any>;
    triggerScript(): Promise<any>;
    resetScript(): Promise<any>;
    queryStatus(): Promise<RemoteBridgeStatus>;
}
/**
 * Proxy class for calling functionality on the configuration variables of an IOTile Device
 */
export declare class Config {
    private adapter;
    private configLock;
    constructor(adapter: AbstractIOTileAdapter);
    setConfigVariable(target: string, id: number, fmt: string, data: number): Promise<void>;
    private startEntry(id, target);
    private pushData(type, data);
    private finishEntry();
    compactConfigDatabase(): Promise<void>;
    getConfigDatabaseInfo(type: string): Promise<boolean>;
}
export declare class IOTileDevice {
    advertisement: IOTileAdvertisement;
    deviceID: number;
    slug: string;
    connectionID: any;
    private adapter;
    private downloadLock;
    constructor(adapter: AbstractIOTileAdapter, advData: IOTileAdvertisement);
    acknowledgeStreamerRPC(streamer: number, highestID: number, force: boolean): Promise<void>;
    queryStreamerRPC(streamer: number): Promise<StreamerInfo>;
    tileVersionRPC(address: number): Promise<string>;
    controllerVersionRPC(): Promise<string>;
    /**
     * IOTile controllers have an embedded 10 character long hardware id tag that uniquely
     * determines what hardware type they are.  This is important information to know when
     * seeing what kind of script or firmware update to apply since different hardware
     * versions may require different scripts or different firmware.
     *
     * The value is padded out with null characters to exactly 10 bytes so make sure to
     * strip those out.
     */
    controllerHWVersionRPC(): Promise<string>;
    highestUniqueIDRPC(): Promise<any>;
    graphInput(stream: string | number, value: number): Promise<void>;
    /**
     * Clear all stored readings in the device.
     *
     * This removes all buffered and output stream data stored in the device.
     */
    clearAllReadings(): Promise<void>;
    triggerStreamer(streamer: number): Promise<any>;
    remoteBridge(): RemoteBridge;
    config(): Config;
    downloadStream(streamName: string, progress?: ProgressNotifier): Promise<RawReading[]>;
    inspectVirtualStream(stream: string | number): Promise<number>;
    queryBLEConnectionInfo(): Promise<BLEConnectionInfo>;
    updateBLEParams(minIntervalMS: number, maxIntervalMS: number, timeoutMS: number): Promise<any>;
}
