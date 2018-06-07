import { VirtualTile, RPCResponse, VersionInfo } from "../virtual-device";
export interface StreamValue {
    timestamp: number;
    uniqueID: number;
    value: number;
}
export interface DownloadStreamState {
    stream: number;
    currIndex: number;
}
export interface RealtimeStreamerState {
    stream: number;
    intervalMS: number;
    timeoutHandle: number | null;
}
export declare type NotificationCallback = (ArrayBuffer: ArrayBuffer) => void;
export declare type PrestreamingHook = (controller: BasicControllerTile) => ArrayBuffer[];
export declare class BasicControllerTile extends VirtualTile {
    protected hwTag: string;
    protected appInfo: number;
    protected osInfo: number;
    protected iotileID: number;
    protected downloadStreamState: DownloadStreamState | null;
    streamerAcks: {
        [key: number]: number;
    };
    streams: {
        [key: number]: StreamValue[];
    };
    realtimeStreamers: RealtimeStreamerState[];
    queuedReports: ArrayBuffer[] | SharedArrayBuffer[] | any[];
    highestUniqueID: number;
    notificationCallback: NotificationCallback | null;
    prestreamingHook: PrestreamingHook | null;
    constructor(iotileID: number, versionInfo: VersionInfo, firmwareVersion?: string, hwTag?: string);
    private combineVersion(tag, version);
    private isBufferedStream(stream);
    addRealtimeStreamer(stream: number, intervalMS: number): void;
    protected handleRealtimeStreamer(state: RealtimeStreamerState): void;
    isStreamingEnabled(): boolean;
    enableStreaming(callback: NotificationCallback): void;
    disableStreaming(): void;
    getHardwareTag(): RPCResponse;
    getDeviceInfo(): RPCResponse;
    acknowledgeStreamer(streamer: number, force: boolean, value: number): RPCResponse;
    inspectVirtualStream(stream: number): number[];
    pushReading(value: number, stream: number): number[];
    beginDownloadStream(stream: number): number[];
    downloadReading(stream: number): number[];
}
