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
var ring_buffer_1 = require("../common/ring-buffer");
var IOTileTracingInterface = /** @class */ (function () {
    function IOTileTracingInterface() {
        this.removeTracingHandler = null;
        this.receivedData = new ring_buffer_1.RingBuffer(128, true);
        this.resolveWaiter = null;
        this.rejectWaiter = null;
        this.waiterTimer = null;
        this.waitLength = 0;
        this.waiterTimeout = 1000;
        this.channel = undefined;
    }
    IOTileTracingInterface.prototype.open = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.channel = channel;
                        this.clearWaiter();
                        this.clearData();
                        _a = this;
                        return [4 /*yield*/, this.channel.subscribe(IOTileTypes.IOTileCharacteristic.Tracing, function (value) {
                                _this.receiveTracingData(value);
                            })];
                    case 1:
                        _a.removeTracingHandler = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileTracingInterface.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.removeTracingHandler !== null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.removeTracingHandler()];
                    case 1:
                        _a.sent();
                        this.removeTracingHandler = null;
                        _a.label = 2;
                    case 2:
                        if (this.rejectWaiter != null) {
                            this.rejectWaiter(new Errors.ConnectionError("Tracing interface was closed."));
                        }
                        this.clearWaiter();
                        this.clearData();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileTracingInterface.prototype.receiveTracingData = function (value) {
        this.receivedData.push(value);
        if (this.resolveWaiter != null && this.waitLength && this.receivedData.count >= this.waitLength) {
            this.resolveWaiter(this.receivedData.pop(this.waitLength));
            this.clearWaiter();
        }
        else if (this.resolveWaiter != null) {
            //We received more data, so push our watchdog timeout further down the line
            this.startWatchdogTimer();
        }
    };
    IOTileTracingInterface.prototype.startWatchdogTimer = function () {
        var _this = this;
        if (this.rejectWaiter == null) {
            return;
        }
        if (this.waiterTimer != null) {
            clearTimeout(this.waiterTimer);
        }
        this.waiterTimer = window.setTimeout(function () {
            if (_this.rejectWaiter != null) {
                _this.rejectWaiter(new Errors.StreamingTimeoutError("Timeout waiting for tracing data."));
                _this.clearWaiter();
            }
        }, this.waiterTimeout);
    };
    IOTileTracingInterface.prototype.clearWaiter = function () {
        this.rejectWaiter = null;
        this.resolveWaiter = null;
        if (this.waiterTimer != null) {
            clearTimeout(this.waiterTimer);
        }
        this.waiterTimer = null;
        this.waitLength = null;
    };
    /**
     * Wait for a given number of bytes to be received by the tracing interface.
     *
     * You can only have a single wait waiting for data at a time.  Attempting
     * to call waitForData again before the first promise resolves will result
     * in a rejected promise with OperationAtInvalidTimeError.
     */
    IOTileTracingInterface.prototype.waitForData = function (numBytes, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 1000; }
        if (this.resolveWaiter != null) {
            throw new Errors.OperationAtInvalidTimeError("You can only have one waiter waiting for tracing data at a time.", IOTileTypes.AdapterState.Connected, "Internal Tracing Error.");
        }
        return new Promise(function (resolve, reject) {
            if (numBytes <= _this.receivedData.count) {
                resolve(_this.receivedData.pop(numBytes));
                return;
            }
            _this.waitLength = numBytes;
            _this.resolveWaiter = resolve;
            _this.rejectWaiter = reject;
            _this.waiterTimeout = timeout;
            _this.startWatchdogTimer();
        });
    };
    IOTileTracingInterface.prototype.clearData = function () {
        this.receivedData.reset();
    };
    return IOTileTracingInterface;
}());
exports.IOTileTracingInterface = IOTileTracingInterface;
//# sourceMappingURL=iotile-iface-tracing.js.map