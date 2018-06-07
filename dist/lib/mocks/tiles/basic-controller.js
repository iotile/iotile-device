"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var virtual_device_1 = require("../virtual-device");
var iotile_common_1 = require("iotile-common");
var utilities_1 = require("../utilities");
var BasicControllerTile = /** @class */ (function (_super) {
    __extends(BasicControllerTile, _super);
    function BasicControllerTile(iotileID, versionInfo, firmwareVersion, hwTag) {
        if (firmwareVersion === void 0) { firmwareVersion = "2.11.4"; }
        if (hwTag === void 0) { hwTag = "btc1_v3"; }
        var _this = _super.call(this, 8, 'NRF52 ', firmwareVersion) || this;
        _this.hwTag = hwTag;
        _this.appInfo = _this.combineVersion(versionInfo.appTag, versionInfo.appVersion);
        _this.osInfo = _this.combineVersion(versionInfo.osTag, versionInfo.osVersion);
        _this.iotileID = iotileID;
        _this.streamerAcks = {};
        _this.streams = {};
        _this.highestUniqueID = 0;
        _this.realtimeStreamers = [];
        _this.queuedReports = [];
        _this.prestreamingHook = null;
        _this.downloadStreamState = null;
        _this.notificationCallback = null;
        return _this;
    }
    BasicControllerTile.prototype.combineVersion = function (tag, version) {
        var parts = version.split('.');
        if (parts.length != 2) {
            throw new iotile_common_1.ArgumentError("Unable to parse 2 component version string: " + version);
        }
        var major = parseInt(parts[0]);
        var minor = parseInt(parts[1]);
        return (major << 26) | (minor << 20) | tag;
    };
    BasicControllerTile.prototype.isBufferedStream = function (stream) {
        var streamType = stream >> 12;
        if (streamType === 5 || streamType === 0) {
            return true;
        }
        return false;
    };
    BasicControllerTile.prototype.addRealtimeStreamer = function (stream, intervalMS) {
        var _this = this;
        var state = {
            intervalMS: intervalMS,
            timeoutHandle: null,
            stream: stream
        };
        this.realtimeStreamers.push(state);
        if (this.isStreamingEnabled()) {
            state.timeoutHandle = window.setInterval(function () { return _this.handleRealtimeStreamer(state); }, intervalMS);
        }
    };
    BasicControllerTile.prototype.handleRealtimeStreamer = function (state) {
        if (this.notificationCallback == null)
            return;
        if (!(state.stream in this.streams))
            return;
        var streamData = this.streams[state.stream];
        if (streamData.length == 0)
            return;
        var lastValue = streamData[streamData.length - 1];
        var report = utilities_1.buildIndividualReport(this.iotileID, state.stream, lastValue.value);
        this.notificationCallback(report);
    };
    BasicControllerTile.prototype.isStreamingEnabled = function () {
        return this.notificationCallback !== null;
    };
    BasicControllerTile.prototype.enableStreaming = function (callback) {
        var _this = this;
        if (this.isStreamingEnabled()) {
            return;
        }
        this.notificationCallback = callback;
        for (var _i = 0, _a = this.queuedReports; _i < _a.length; _i++) {
            var report = _a[_i];
            callback(report);
        }
        this.queuedReports = [];
        var _loop_1 = function (streamer) {
            streamer.timeoutHandle = window.setInterval(function () { return _this.handleRealtimeStreamer(streamer); }, streamer.intervalMS);
        };
        for (var _b = 0, _c = this.realtimeStreamers; _b < _c.length; _b++) {
            var streamer = _c[_b];
            _loop_1(streamer);
        }
    };
    BasicControllerTile.prototype.disableStreaming = function () {
        if (!this.isStreamingEnabled()) {
            return;
        }
        this.notificationCallback = null;
        for (var _i = 0, _a = this.realtimeStreamers; _i < _a.length; _i++) {
            var streamer = _a[_i];
            if (streamer.timeoutHandle == null)
                continue;
            window.clearInterval(streamer.timeoutHandle);
            streamer.timeoutHandle = null;
        }
    };
    /*
     * Publicly available controller RPCs
     *
     * These RPC functions represent the emulated public behavior of an
     * iotile controller based on lib_controller.
     */
    BasicControllerTile.prototype.getHardwareTag = function () {
        return [this.hwTag];
    };
    BasicControllerTile.prototype.getDeviceInfo = function () {
        return [this.iotileID, 0, 0, 0, 0, 0, this.osInfo, this.appInfo];
    };
    BasicControllerTile.prototype.acknowledgeStreamer = function (streamer, force, value) {
        var oldHighest = this.streamerAcks[streamer];
        if (oldHighest == null) {
            oldHighest = 0;
        }
        if (streamer < 0x100 && value > this.highestUniqueID) {
            this.highestUniqueID = value;
        }
        if (value > oldHighest || force) {
            this.streamerAcks[streamer] = value;
            return [0];
        }
        return [2147713054]; //Return pack_error(kSensorGraphSubsystem, kSGOldAcknowledgeUpdate);
    };
    BasicControllerTile.prototype.inspectVirtualStream = function (stream) {
        if (!(stream in this.streams)) {
            return [virtual_device_1.packError(0x8002, 0x8001), 0];
        }
        //We only support inspected streams that are not buffered in flash memory
        if (this.isBufferedStream(stream)) {
            return [virtual_device_1.packError(0x8002, 0x8001), 0];
        }
        var streamData = this.streams[stream];
        if (streamData.length === 0) {
            return [virtual_device_1.packError(0x8002, 0x8000), 0];
        }
        return [0, streamData[streamData.length - 1].value];
    };
    BasicControllerTile.prototype.pushReading = function (value, stream) {
        if (!(stream in this.streams))
            this.streams[stream] = [];
        var streamValue = {
            timestamp: Math.floor(Date.now() / 1000.0),
            uniqueID: 0,
            value: value
        };
        if (this.isBufferedStream(stream)) {
            streamValue.uniqueID = ++this.highestUniqueID;
        }
        this.streams[stream].push(streamValue);
        return [0];
    };
    BasicControllerTile.prototype.beginDownloadStream = function (stream) {
        this.downloadStreamState = {
            stream: stream,
            currIndex: 0
        };
        var count = 0;
        if (stream in this.streams) {
            count = this.streams[stream].length;
        }
        return [0, count, Math.floor(Date.now() / 1000.0)];
    };
    BasicControllerTile.prototype.downloadReading = function (stream) {
        if (this.downloadStreamState == null) {
            return [virtual_device_1.packError(0x8002, 0x8000), 0, 0];
        }
        var streamData = this.streams[this.downloadStreamState.stream];
        if (this.downloadStreamState.currIndex >= streamData.length) {
            return [virtual_device_1.packError(0x8002, 0x8000), 0, 0];
        }
        //TODO: There is a newer enhanced version of this call but it requires
        //supporting multiple call signatures for the same RPC.
        var streamValue = streamData[this.downloadStreamState.currIndex++];
        return [0, streamValue.timestamp, streamValue.value];
    };
    __decorate([
        virtual_device_1.tileRPC(0x0002, "", "10s"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Object)
    ], BasicControllerTile.prototype, "getHardwareTag", null);
    __decorate([
        virtual_device_1.tileRPC(0x1008, "", "LLBBBBLL"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Object)
    ], BasicControllerTile.prototype, "getDeviceInfo", null);
    __decorate([
        virtual_device_1.tileRPC(0x200F, "HHL", "L"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Boolean, Number]),
        __metadata("design:returntype", Object)
    ], BasicControllerTile.prototype, "acknowledgeStreamer", null);
    __decorate([
        virtual_device_1.tileRPC(0x200B, "H", "LL"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], BasicControllerTile.prototype, "inspectVirtualStream", null);
    __decorate([
        virtual_device_1.tileRPC(0x2000, "LH", "L"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", void 0)
    ], BasicControllerTile.prototype, "pushReading", null);
    __decorate([
        virtual_device_1.tileRPC(0x2008, "H", "LLL"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], BasicControllerTile.prototype, "beginDownloadStream", null);
    __decorate([
        virtual_device_1.tileRPC(0x2009, "", "LLL"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], BasicControllerTile.prototype, "downloadReading", null);
    return BasicControllerTile;
}(virtual_device_1.VirtualTile));
exports.BasicControllerTile = BasicControllerTile;
//# sourceMappingURL=basic-controller.js.map