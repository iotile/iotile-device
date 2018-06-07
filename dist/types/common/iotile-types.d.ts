/// <reference path="../../../typings/cordova_plugins.d.ts" />
export declare type NotificationCallback = (value: ArrayBuffer) => void;
export interface UserRedirectionInfo {
    reason: string;
    redirectState: string;
    userNotified: boolean;
}
export declare enum IOTileCharacteristic {
    SendHeader = 0,
    ReceiveHeader = 1,
    SendPayload = 2,
    ReceivePayload = 3,
    Streaming = 4,
    HighspeedData = 5,
    Tracing = 6,
}
export declare enum AdapterEvent {
    ScanStarted = 0,
    ScanFinished = 1,
    Connected = 2,
    ConnectionStarted = 3,
    ConnectionFinished = 4,
    Disconnected = 5,
    UnrecoverableRPCError = 6,
    RawRealtimeReading = 7,
    RawRobustReport = 8,
    RobustReportStarted = 9,
    RobustReportStalled = 10,
    RobustReportProgress = 11,
    RobustReportFinished = 12,
    UnrecoverableStreamingError = 13,
    StreamingInterrupted = 14,
}
export interface BLEChannel {
    write: (char: IOTileCharacteristic, value: ArrayBuffer) => Promise<void>;
    subscribe: (char: IOTileCharacteristic, callback: NotificationCallback) => Promise<() => Promise<void>>;
    notify: (event: AdapterEvent, value: any) => void;
}
export declare enum RPCErrorCode {
    TileBusy = 0,
    TileNotFound = 1,
    CommandNotFound = 2,
    UnknownError = 3,
}
export declare enum AdapterState {
    Idle = 0,
    Scanning = 1,
    Connecting = 2,
    Connected = 3,
    Disconnecting = 4,
}
export declare enum Platform {
    IOS = 0,
    Android = 1,
    Web = 2,
}
