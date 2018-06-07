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
var iotile_common_1 = require("iotile-common");
var Errors = require("../common/error-space");
var IOTileTypes = require("../common/iotile-types");
var config_1 = require("../config");
var RPCError;
(function (RPCError) {
    RPCError[RPCError["OK"] = 0] = "OK";
    RPCError[RPCError["UnexpectedRPCTimeout"] = 1] = "UnexpectedRPCTimeout";
    RPCError[RPCError["ErrorWritingRPC"] = 2] = "ErrorWritingRPC";
    RPCError[RPCError["IncorrectReceivedLength"] = 3] = "IncorrectReceivedLength";
    RPCError[RPCError["ResponseReceivedAtInvalidTime"] = 4] = "ResponseReceivedAtInvalidTime";
    RPCError[RPCError["BluetoothErrorWritingRPC"] = 5] = "BluetoothErrorWritingRPC";
    RPCError[RPCError["StoppedFromPreviousErrors"] = 6] = "StoppedFromPreviousErrors";
})(RPCError = exports.RPCError || (exports.RPCError = {}));
var IOTileRPCInterface = /** @class */ (function () {
    function IOTileRPCInterface() {
        this.removeReceiveHeaderHandler = null;
        this.removeReceivePayloadHandler = null;
        this.channel = null;
        this.rpcQueue = [];
        this.processing = false;
        this.currentRPC = undefined;
        this.stoppedFromErrors = false;
        this.lastError = null;
    }
    IOTileRPCInterface.prototype.open = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var that, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.channel = channel;
                        this.rpcQueue = [];
                        this.processing = false;
                        this.stoppedFromErrors = false;
                        this.lastError = RPCError.OK;
                        that = this;
                        _a = this;
                        return [4 /*yield*/, this.channel.subscribe(IOTileTypes.IOTileCharacteristic.ReceiveHeader, function (value) {
                                that.receiveHeader(value);
                            })];
                    case 1:
                        _a.removeReceiveHeaderHandler = _c.sent();
                        _b = this;
                        return [4 /*yield*/, this.channel.subscribe(IOTileTypes.IOTileCharacteristic.ReceivePayload, function (value) {
                                that.receivePayload(value);
                            })];
                    case 2:
                        _b.removeReceivePayloadHandler = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileRPCInterface.prototype.rpc = function (address, rpcID, payload, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var queueItem, promise;
            return __generator(this, function (_a) {
                queueItem = {
                    rpcID: rpcID,
                    address: address,
                    payload: payload,
                    timeoutHandler: null,
                    timeout: timeout || 1.0,
                    internalTimeout: 15,
                    success: function (value) { },
                    failure: function (err) { },
                    headerReceived: false,
                    expectedPayloadLength: 0
                };
                if (this.stoppedFromErrors) {
                    throw new Errors.RPCError(address, rpcID, RPCError.StoppedFromPreviousErrors);
                }
                promise = new Promise(function (resolve, reject) {
                    queueItem.success = resolve;
                    queueItem.failure = reject;
                });
                this.rpcQueue.push(queueItem);
                if (!this.processing) {
                    this.processOne();
                }
                return [2 /*return*/, promise];
            });
        });
    };
    IOTileRPCInterface.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.removeReceiveHeaderHandler !== null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.removeReceiveHeaderHandler()];
                    case 1:
                        _a.sent();
                        this.removeReceiveHeaderHandler = null;
                        _a.label = 2;
                    case 2:
                        if (!(this.removeReceivePayloadHandler !== null)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.removeReceivePayloadHandler()];
                    case 3:
                        _a.sent();
                        this.removeReceivePayloadHandler = null;
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    IOTileRPCInterface.prototype.receiveHeader = function (value) {
        if (this.stoppedFromErrors) {
            return;
        }
        if (this.currentRPC === null || this.currentRPC === undefined) {
            this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
            return;
        }
        if (value.byteLength < 4) {
            this.fatalRPCError(RPCError.IncorrectReceivedLength);
            return;
        }
        var header = value.slice(0, 4);
        var resp = iotile_common_1.unpackArrayBuffer("BBBB", header);
        var status = resp[0];
        var statusCode = status & 63;
        var appDefined = !!(status & (1 << 6));
        var hasData = !!(status & (1 << 7));
        var payloadLength = resp[3];
        this.currentRPC.headerReceived = true;
        this.currentRPC.expectedPayloadLength = payloadLength;
        var rpcFinished = false;
        if (!appDefined || statusCode != 0) {
            //There was an error executing the RPC, reject the promise with an RPCError
            this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, status));
            rpcFinished = true;
        }
        else if (!hasData) {
            //If there is no data, we're done
            this.currentRPC.success(new ArrayBuffer(0));
            rpcFinished = true;
        }
        else {
            //We receive a valid header, now we need to wait for the payload
        }
        if (rpcFinished) {
            this.finishRPC();
        }
    };
    /**
     * Cleanup after an RPC is finished, removing its timeout handler and restarting the command queue
    */
    IOTileRPCInterface.prototype.finishRPC = function () {
        //We have received the response for this RPC, stop the timeout for it
        if (this.currentRPC && this.currentRPC.timeoutHandler !== null) {
            clearTimeout(this.currentRPC.timeoutHandler);
            this.currentRPC.timeoutHandler = null;
        }
        this.currentRPC = undefined;
        this.processing = false;
        var that = this;
        setTimeout(function () { that.processOne(); }, 0);
    };
    IOTileRPCInterface.prototype.receivePayload = function (value) {
        if (this.stoppedFromErrors) {
            return;
        }
        if (this.currentRPC === undefined || !this.currentRPC.headerReceived) {
            this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
            return;
        }
        if (value.byteLength < this.currentRPC.expectedPayloadLength) {
            this.fatalRPCError(RPCError.IncorrectReceivedLength);
            return;
        }
        var truncatedValue = value.slice(0, this.currentRPC.expectedPayloadLength);
        this.currentRPC.success(truncatedValue);
        this.finishRPC();
    };
    IOTileRPCInterface.prototype.fatalRPCError = function (code) {
        this.stoppedFromErrors = true;
        this.lastError = code;
        this.processing = false;
        //If there was an RPC in flight, stop processing it and fail
        if (this.currentRPC !== undefined) {
            this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, code));
            if (this.currentRPC.timeoutHandler !== null) {
                clearTimeout(this.currentRPC.timeoutHandler);
            }
            this.currentRPC = undefined;
        }
        //If there were other RPCs queued, fail them all
        while (this.rpcQueue.length > 0) {
            var curr = this.rpcQueue.shift();
            if (curr) {
                curr.failure(new Errors.RPCError(curr.address, curr.rpcID, RPCError.StoppedFromPreviousErrors));
            }
        }
        //Notify anyone who is listening that we are no longer able to process RPCs.
        if (this.channel) {
            this.channel.notify(IOTileTypes.AdapterEvent.UnrecoverableRPCError, new Errors.RPCError(0, 0, code));
        }
    };
    IOTileRPCInterface.prototype.processOne = function () {
        return __awaiter(this, void 0, void 0, function () {
            var header, that_1, rpc, start, end, actual, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.stoppedFromErrors) {
                            return [2 /*return*/];
                        }
                        if (this.processing === true) {
                            return [2 /*return*/];
                        }
                        if (this.rpcQueue.length === 0) {
                            return [2 /*return*/];
                        }
                        this.processing = true;
                        this.currentRPC = this.rpcQueue.shift();
                        if (!(this.currentRPC && this.channel)) return [3 /*break*/, 6];
                        header = iotile_common_1.packArrayBuffer("BBHB", this.currentRPC.payload.byteLength, 0, this.currentRPC.rpcID, this.currentRPC.address);
                        that_1 = this;
                        //Schedule the timeout for this RPC in case it does not ever return
                        this.currentRPC.timeoutHandler = setTimeout(function () {
                            that_1.fatalRPCError(RPCError.UnexpectedRPCTimeout);
                        }, this.currentRPC.internalTimeout * 1000);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        rpc = this.currentRPC;
                        start = Date.now();
                        if (!(this.currentRPC.payload.byteLength > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.channel.write(IOTileTypes.IOTileCharacteristic.SendPayload, this.currentRPC.payload)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.channel.write(IOTileTypes.IOTileCharacteristic.SendHeader, header)];
                    case 4:
                        _a.sent();
                        end = Date.now();
                        actual = (end - start) / 1000;
                        if (actual > rpc.timeout) {
                            config_1.catService.error("Timeout in RPC " + rpc.rpcID + " on tile " + rpc.address + ". Expected to take " + rpc.timeout + " s; took " + actual + " s", Error);
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _a.sent();
                        this.fatalRPCError(RPCError.BluetoothErrorWritingRPC);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return IOTileRPCInterface;
}());
exports.IOTileRPCInterface = IOTileRPCInterface;
//# sourceMappingURL=iotile-iface-rpc.js.map