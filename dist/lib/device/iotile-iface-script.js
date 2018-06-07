"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var Errors = require("../common/error-space");
var IOTileTypes = require("../common/iotile-types");
var iotile_device_1 = require("./iotile-device");
var iotile_common_1 = require("iotile-common");
var IOTileScriptInterface = /** @class */ (function () {
    function IOTileScriptInterface() {
    }
    IOTileScriptInterface.prototype.open = function (device, channel) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.channel = channel;
                this.device = device;
                return [2 /*return*/];
            });
        });
    };
    IOTileScriptInterface.prototype.send = function (script, notifier) {
        return __awaiter(this, void 0, void 0, function () {
            var bridge, status_1, status_2, speedCalculator, i, slice;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.channel && this.device)) return [3 /*break*/, 13];
                        notifier.setTotal(Math.ceil(script.byteLength / 20) + 1);
                        notifier.startOne("Preparing for firmware update", 1);
                        bridge = this.device.remoteBridge();
                        return [4 /*yield*/, bridge.queryStatus()];
                    case 1:
                        status_1 = _a.sent();
                        if (!(status_1.state == iotile_device_1.RemoteBridgeState.ReceivedCompleteScript)) return [3 /*break*/, 4];
                        return [4 /*yield*/, iotile_common_1.delay(2000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, bridge.queryStatus()];
                    case 3:
                        status_2 = _a.sent();
                        _a.label = 4;
                    case 4:
                        if (status_1.state == iotile_device_1.RemoteBridgeState.ValidatedScript || status_1.state == iotile_device_1.RemoteBridgeState.ExecutingScript)
                            throw new Errors.ScriptSentAtInvalidTime("Script sent while remote bridge was processing another script");
                        if (!(status_1.state == iotile_device_1.RemoteBridgeState.ReceivedCompleteScript)) return [3 /*break*/, 6];
                        notifier.updateDescription("Clearing previous script");
                        return [4 /*yield*/, bridge.resetScript()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: 
                    //Start our script
                    return [4 /*yield*/, bridge.beginScript()];
                    case 7:
                        //Start our script
                        _a.sent();
                        notifier.finishOne();
                        speedCalculator = new SpeedCalculator(script.byteLength);
                        i = 0;
                        _a.label = 8;
                    case 8:
                        if (!(i < script.byteLength)) return [3 /*break*/, 11];
                        slice = script.slice(i, i + 20);
                        speedCalculator.update(i);
                        notifier.startOne(speedCalculator.estimateRemaining() + " remaining", 1);
                        return [4 /*yield*/, this.channel.write(IOTileTypes.IOTileCharacteristic.HighspeedData, slice)];
                    case 9:
                        _a.sent();
                        notifier.finishOne();
                        _a.label = 10;
                    case 10:
                        i += 20;
                        return [3 /*break*/, 8];
                    case 11: return [4 /*yield*/, bridge.endScript()];
                    case 12:
                        _a.sent();
                        _a.label = 13;
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    IOTileScriptInterface.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    return IOTileScriptInterface;
}());
exports.IOTileScriptInterface = IOTileScriptInterface;
var SpeedCalculator = /** @class */ (function () {
    function SpeedCalculator(totalSize) {
        this.totalSize = totalSize;
        this.start = new Date().getTime();
        this.updateCount = 0;
        this.finished = 0;
        this.invSpeed = 0;
    }
    SpeedCalculator.prototype.update = function (finished) {
        if (finished === 0)
            return;
        var now = new Date().getTime();
        this.invSpeed = (now - this.start) / finished;
        this.updateCount += 1;
        this.finished = finished;
    };
    SpeedCalculator.prototype.estimateRemaining = function () {
        if (this.updateCount < SpeedCalculator.SETTLING_UPDATES)
            return "Estimating time";
        var remaining = this.invSpeed * (this.totalSize - this.finished) / 1000.0;
        var remMinutes = Math.floor(remaining / 60.0);
        var remSeconds = remaining - (remMinutes * 60.0);
        var minString = remMinutes.toFixed(0);
        var secString = remSeconds.toFixed(0);
        return minString + " min " + secString + " sec";
    };
    SpeedCalculator.SETTLING_UPDATES = 100;
    return SpeedCalculator;
}());
//# sourceMappingURL=iotile-iface-script.js.map