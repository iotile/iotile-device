///<reference path="../../typings/cordova_plugins.d.ts"/>

export type NotificationCallback = (value: ArrayBuffer) => void;

export interface UserRedirectionInfo {
  reason: string;
  redirectState: string;
  userNotified: boolean;
}

export enum IOTileCharacteristic {
  SendHeader = 0,
  ReceiveHeader,
  SendPayload,
  ReceivePayload,
  Streaming,
  HighspeedData,
  Tracing
}

export enum AdapterEvent {
  ScanStarted = 0,
  ScanFinished,
  Connected,
  ConnectionStarted,
  ConnectionFinished,
  Disconnected,
  UnrecoverableRPCError,
  RawRealtimeReading,
  RawRobustReport,
  RobustReportStarted,
  RobustReportStalled,
  RobustReportProgress,
  RobustReportFinished,
  UnrecoverableStreamingError,
  StreamingInterrupted,        //If the user puts the app into the background, it won't get streaming notifications so we need to notify anyone that is expecting them
  RobustReportInvalid
}

export interface BLEChannel {
  write: (char: IOTileCharacteristic, value: ArrayBuffer) => Promise<void>,
  subscribe: (char: IOTileCharacteristic, callback: NotificationCallback) => Promise<() => Promise<void>>,
  notify: (event: AdapterEvent, value: any) => void
}

export enum RPCErrorCode {
  TileBusy,
  TileNotFound,
  CommandNotFound,
  UnknownError
}

export enum AdapterState {
  Idle = 0,
  Scanning,
  Connecting,
  Connected,
  Disconnecting
}

export enum Platform {
  IOS = 0,
  Android = 1,
  Web
}