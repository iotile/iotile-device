"use strict";
///<reference path="../../typings/cordova_plugins.d.ts"/>
Object.defineProperty(exports, "__esModule", { value: true });
var IOTileCharacteristic;
(function (IOTileCharacteristic) {
    IOTileCharacteristic[IOTileCharacteristic["SendHeader"] = 0] = "SendHeader";
    IOTileCharacteristic[IOTileCharacteristic["ReceiveHeader"] = 1] = "ReceiveHeader";
    IOTileCharacteristic[IOTileCharacteristic["SendPayload"] = 2] = "SendPayload";
    IOTileCharacteristic[IOTileCharacteristic["ReceivePayload"] = 3] = "ReceivePayload";
    IOTileCharacteristic[IOTileCharacteristic["Streaming"] = 4] = "Streaming";
    IOTileCharacteristic[IOTileCharacteristic["HighspeedData"] = 5] = "HighspeedData";
    IOTileCharacteristic[IOTileCharacteristic["Tracing"] = 6] = "Tracing";
})(IOTileCharacteristic = exports.IOTileCharacteristic || (exports.IOTileCharacteristic = {}));
var AdapterEvent;
(function (AdapterEvent) {
    AdapterEvent[AdapterEvent["ScanStarted"] = 0] = "ScanStarted";
    AdapterEvent[AdapterEvent["ScanFinished"] = 1] = "ScanFinished";
    AdapterEvent[AdapterEvent["Connected"] = 2] = "Connected";
    AdapterEvent[AdapterEvent["ConnectionStarted"] = 3] = "ConnectionStarted";
    AdapterEvent[AdapterEvent["ConnectionFinished"] = 4] = "ConnectionFinished";
    AdapterEvent[AdapterEvent["Disconnected"] = 5] = "Disconnected";
    AdapterEvent[AdapterEvent["UnrecoverableRPCError"] = 6] = "UnrecoverableRPCError";
    AdapterEvent[AdapterEvent["RawRealtimeReading"] = 7] = "RawRealtimeReading";
    AdapterEvent[AdapterEvent["RawRobustReport"] = 8] = "RawRobustReport";
    AdapterEvent[AdapterEvent["RobustReportStarted"] = 9] = "RobustReportStarted";
    AdapterEvent[AdapterEvent["RobustReportStalled"] = 10] = "RobustReportStalled";
    AdapterEvent[AdapterEvent["RobustReportProgress"] = 11] = "RobustReportProgress";
    AdapterEvent[AdapterEvent["RobustReportFinished"] = 12] = "RobustReportFinished";
    AdapterEvent[AdapterEvent["UnrecoverableStreamingError"] = 13] = "UnrecoverableStreamingError";
    AdapterEvent[AdapterEvent["StreamingInterrupted"] = 14] = "StreamingInterrupted"; //If the user puts the app into the background, it won't get streaming notifications so we need to notify anyone that is expecting them
})(AdapterEvent = exports.AdapterEvent || (exports.AdapterEvent = {}));
var RPCErrorCode;
(function (RPCErrorCode) {
    RPCErrorCode[RPCErrorCode["TileBusy"] = 0] = "TileBusy";
    RPCErrorCode[RPCErrorCode["TileNotFound"] = 1] = "TileNotFound";
    RPCErrorCode[RPCErrorCode["CommandNotFound"] = 2] = "CommandNotFound";
    RPCErrorCode[RPCErrorCode["UnknownError"] = 3] = "UnknownError";
})(RPCErrorCode = exports.RPCErrorCode || (exports.RPCErrorCode = {}));
var AdapterState;
(function (AdapterState) {
    AdapterState[AdapterState["Idle"] = 0] = "Idle";
    AdapterState[AdapterState["Scanning"] = 1] = "Scanning";
    AdapterState[AdapterState["Connecting"] = 2] = "Connecting";
    AdapterState[AdapterState["Connected"] = 3] = "Connected";
    AdapterState[AdapterState["Disconnecting"] = 4] = "Disconnecting";
})(AdapterState = exports.AdapterState || (exports.AdapterState = {}));
var Platform;
(function (Platform) {
    Platform[Platform["IOS"] = 0] = "IOS";
    Platform[Platform["Android"] = 1] = "Android";
    Platform[Platform["Web"] = 2] = "Web";
})(Platform = exports.Platform || (exports.Platform = {}));
//# sourceMappingURL=iotile-types.js.map