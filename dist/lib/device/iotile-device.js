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
var iotile_reports_1 = require("../common/iotile-reports");
;
var MatchBy;
(function (MatchBy) {
    MatchBy[MatchBy["MatchBySlot"] = 1] = "MatchBySlot";
    MatchBy[MatchBy["MatchController"] = 2] = "MatchController";
    MatchBy[MatchBy["MatchByName"] = 3] = "MatchByName";
})(MatchBy = exports.MatchBy || (exports.MatchBy = {}));
var RemoteBridgeState;
(function (RemoteBridgeState) {
    RemoteBridgeState[RemoteBridgeState["Idle"] = 0] = "Idle";
    RemoteBridgeState[RemoteBridgeState["WaitingForScript"] = 1] = "WaitingForScript";
    RemoteBridgeState[RemoteBridgeState["ReceivingScript"] = 2] = "ReceivingScript";
    RemoteBridgeState[RemoteBridgeState["ReceivedCompleteScript"] = 3] = "ReceivedCompleteScript";
    RemoteBridgeState[RemoteBridgeState["ValidatedScript"] = 4] = "ValidatedScript";
    RemoteBridgeState[RemoteBridgeState["ExecutingScript"] = 5] = "ExecutingScript";
})(RemoteBridgeState = exports.RemoteBridgeState || (exports.RemoteBridgeState = {}));
/**
 * Proxy class for calling functionality on the script processing and firmware update engine on an IOTile Device
 */
var RemoteBridge = /** @class */ (function () {
    function RemoteBridge(adapter) {
        this.adapter = adapter;
    }
    RemoteBridge.prototype.beginScript = function () {
        return this.adapter.errorHandlingRPC(8, 0x2100, "", "L", [], 10.0);
    };
    RemoteBridge.prototype.endScript = function () {
        return this.adapter.errorHandlingRPC(8, 0x2102, "", "L", [], 2.0);
    };
    RemoteBridge.prototype.triggerScript = function () {
        return this.adapter.errorHandlingRPC(8, 0x2103, "", "L", [], 2.0);
    };
    RemoteBridge.prototype.resetScript = function () {
        return this.adapter.errorHandlingRPC(8, 0x2105, "", "L", [], 20.0);
    };
    RemoteBridge.prototype.queryStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, state, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.adapter.typedRPC(8, 0x2104, "", "LL", [], 2.0)];
                    case 1:
                        _a = _b.sent(), state = _a[0], error = _a[1];
                        return [2 /*return*/, {
                                state: state,
                                lastError: error
                            }];
                }
            });
        });
    };
    return RemoteBridge;
}());
exports.RemoteBridge = RemoteBridge;
/**
 * Proxy class for calling functionality on the configuration variables of an IOTile Device
 */
var Config = /** @class */ (function () {
    function Config(adapter) {
        this.adapter = adapter;
        this.configLock = new iotile_common_1.Mutex;
    }
    Config.prototype.setConfigVariable = function (target, id, fmt, data) {
        return __awaiter(this, void 0, void 0, function () {
            var releaseConfig, db_status, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.configLock.acquire()];
                    case 1:
                        releaseConfig = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 9, 10]);
                        return [4 /*yield*/, this.getConfigDatabaseInfo(fmt)];
                    case 3:
                        db_status = _a.sent();
                        if (!!db_status) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.compactConfigDatabase()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, this.startEntry(id, target)];
                    case 6:
                        err = _a.sent();
                        if (err) {
                            throw new Error('Failed to start Config entry');
                        }
                        return [4 /*yield*/, this.pushData(fmt, data)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.finishEntry()];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        releaseConfig();
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    // FIXME: clean up 0 B's to x's when x supported
    Config.prototype.startEntry = function (id, target) {
        return __awaiter(this, void 0, void 0, function () {
            var args, slot, resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (target == 'controller') {
                            args = iotile_common_1.packArrayBuffer("HBBBBBBBB", id, 0, 0, 0, 0, 0, 0, 0, MatchBy.MatchController);
                        }
                        else if (target.includes('slot')) {
                            slot = target.split(" ")[1];
                            if (+slot >= 0 && +slot <= 255) {
                                args = iotile_common_1.packArrayBuffer("HBBBBBBBB", id, slot, 0, 0, 0, 0, 0, 0, MatchBy.MatchBySlot);
                            }
                            else {
                                throw new iotile_common_1.ArgumentError("Slot number must be between 0 and 255");
                            }
                        }
                        else {
                            throw new iotile_common_1.ArgumentError("Only controller and numbered slot targets are supported");
                        }
                        return [4 /*yield*/, this.adapter.rpc(8, 0x2a07, args, 5.0)];
                    case 1:
                        resp = _a.sent();
                        resp = iotile_common_1.unpackArrayBuffer("L", resp)[0];
                        return [2 /*return*/, resp];
                }
            });
        });
    };
    Config.prototype.pushData = function (type, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2a08, type, 'L', [data], 5.0)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Config.prototype.finishEntry = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2a09, "", "L", [], 5.0)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // FIXME
    // public async getConfigVariable(target: string, id: number){
    //   // TODO: how to find index [call count; rpc(8, 0x2a0a, ...) [ignore 0 index]]
    //   let index: number;
    //   let meta = this.adapter.errorHandlingRPC(8, 0x2a0a, "H", "L16s", [index]);
    //   let name; // = this.getIdentifier(index, meta);
    //   let value; // = this.getData(index);
    //   let variable = {
    //       'metadata': meta,
    //       'name': name,
    //       'data': value
    //   };
    //   return variable;
    // }
    Config.prototype.compactConfigDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2a0f, "", "L", [], 5.0)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Config.prototype.getConfigDatabaseInfo = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, max_data, data_size, invalid_data, entry_count, invalid_count, max_entries, typeSize;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.typedRPC(8, 0x2a10, "", "LHHHHHBB", [], 5.0)];
                    case 1:
                        resp = _a.sent();
                        max_data = resp[0], data_size = resp[1], invalid_data = resp[2], entry_count = resp[3], invalid_count = resp[4], max_entries = resp[5];
                        typeSize = {
                            'B': 1,
                            'b': 1,
                            'H': 2,
                            'h': 2,
                            'L': 4,
                            'l': 4
                        };
                        // make sure there's enough room to store config variable
                        return [2 /*return*/, (data_size + typeSize[type] < max_data)];
                }
            });
        });
    };
    return Config;
}());
exports.Config = Config;
var IOTileDevice = /** @class */ (function () {
    function IOTileDevice(adapter, advData) {
        this.advertisement = advData;
        this.deviceID = advData.deviceID;
        this.adapter = adapter;
        this.slug = iotile_common_1.deviceIDToSlug(this.deviceID);
        this.connectionID = advData.connectionID;
        this.downloadLock = new iotile_common_1.Mutex;
    }
    IOTileDevice.prototype.acknowledgeStreamerRPC = function (streamer, highestID, force) {
        return __awaiter(this, void 0, void 0, function () {
            var args, resp, decoded, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        args = iotile_common_1.packArrayBuffer("HHL", streamer, force ? 1 : 0, highestID);
                        return [4 /*yield*/, this.adapter.rpc(8, 0x200f, args, 2.0)];
                    case 1:
                        resp = _a.sent();
                        decoded = iotile_common_1.unpackArrayBuffer("L", resp);
                        err = decoded[0];
                        //If we're not forcing the update then the device can return
                        //that the update is older than what is currently has stored
                        //which is not an error.
                        if (!force && err === 0x8003801e) {
                            return [2 /*return*/];
                        }
                        else if (err != 0) {
                            throw new Errors.RPCError(8, 0x200f, err);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileDevice.prototype.queryStreamerRPC = function (streamer) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, info;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.typedRPC(8, 0x200a, "H", "LLLLBBBB", [streamer], 2.0)];
                    case 1:
                        resp = _a.sent();
                        info = {
                            lastAttemptTime: resp[0],
                            lastSuccessTime: resp[1],
                            lastError: resp[2],
                            highestAck: resp[3],
                            lastStatus: resp[4],
                            backoffNumber: resp[5],
                            commStatus: resp[6]
                        };
                        return [2 /*return*/, info];
                }
            });
        });
    };
    IOTileDevice.prototype.tileVersionRPC = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, major, minor, patch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.typedRPC(address, 0x4, "", "H6sBBBB", [], 2.0)];
                    case 1:
                        resp = _a.sent();
                        major = resp[2];
                        minor = resp[3];
                        patch = resp[4];
                        return [2 /*return*/, major + "." + minor + "." + patch];
                }
            });
        });
    };
    IOTileDevice.prototype.controllerVersionRPC = function () {
        return this.tileVersionRPC(8);
    };
    /**
     * IOTile controllers have an embedded 10 character long hardware id tag that uniquely
     * determines what hardware type they are.  This is important information to know when
     * seeing what kind of script or firmware update to apply since different hardware
     * versions may require different scripts or different firmware.
     *
     * The value is padded out with null characters to exactly 10 bytes so make sure to
     * strip those out.
     */
    IOTileDevice.prototype.controllerHWVersionRPC = function () {
        return __awaiter(this, void 0, void 0, function () {
            var version, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.adapter.typedRPC(8, 0x2, "", "10s", [], 2.0)];
                    case 1:
                        version = (_a.sent())[0];
                        return [2 /*return*/, version.replace(/[\0]+$/g, '')];
                    case 2:
                        err_1 = _a.sent();
                        //Very old firmware versions don't support the controller hw version rpc, so return null in that case
                        //any other error code is an error that should be propagated to the caller.
                        if (err_1 instanceof Errors.RPCError && err_1.errorCode == Errors.RPCProtocolError.CommandNotFound)
                            return [2 /*return*/, ""];
                        throw err_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    IOTileDevice.prototype.highestUniqueIDRPC = function () {
        return __awaiter(this, void 0, void 0, function () {
            var highestID;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2011, "", "LL", [], 2.0)];
                    case 1:
                        highestID = (_a.sent())[0];
                        return [2 /*return*/, highestID];
                }
            });
        });
    };
    IOTileDevice.prototype.graphInput = function (stream, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof stream == 'string') {
                            stream = iotile_common_1.mapStreamName(stream);
                        }
                        return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2004, "LH", "L", [value, stream], 1.0)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clear all stored readings in the device.
     *
     * This removes all buffered and output stream data stored in the device.
     */
    IOTileDevice.prototype.clearAllReadings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x200c, "", "L", [], 2.0)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileDevice.prototype.triggerStreamer = function (streamer) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.adapter.typedRPC(8, 0x2010, "H", "L", [streamer], 1.0)];
                    case 1:
                        error = (_a.sent())[0];
                        return [2 /*return*/, error];
                }
            });
        });
    };
    IOTileDevice.prototype.remoteBridge = function () {
        return new RemoteBridge(this.adapter);
    };
    IOTileDevice.prototype.config = function () {
        return new Config(this.adapter);
    };
    IOTileDevice.prototype.downloadStream = function (streamName, progress) {
        return __awaiter(this, void 0, void 0, function () {
            var releaseStream, streamId, _a, err, count, device_time, now, readings, subNotifier, i, _b, timestamp, raw_reading, timebase, reading;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.downloadLock.acquire()];
                    case 1:
                        releaseStream = _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, , 8, 9]);
                        streamId = iotile_common_1.mapStreamName(streamName);
                        return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2008, "H", "LLLL", [streamId], 3.0)];
                    case 3:
                        _a = _c.sent(), err = _a[0], count = _a[1], device_time = _a[2];
                        now = new Date();
                        readings = [];
                        subNotifier = undefined;
                        if (err) {
                            throw new iotile_common_1.ArgumentError("Error starting stream download: " + err);
                        }
                        if (progress) {
                            subNotifier = progress.startOne("Downloading " + count + " readings", count);
                        }
                        i = 0;
                        _c.label = 4;
                    case 4:
                        if (!(i < count)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x2009, "", "LLL", [], 1.0)];
                    case 5:
                        _b = _c.sent(), timestamp = _b[0], raw_reading = _b[1];
                        timebase = new Date(now.valueOf() - (device_time * 1000));
                        reading = new iotile_reports_1.RawReading(streamId, raw_reading, timestamp, timebase);
                        readings.push(reading);
                        if (subNotifier) {
                            subNotifier.finishOne();
                        }
                        _c.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/, readings];
                    case 8:
                        releaseStream();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    IOTileDevice.prototype.inspectVirtualStream = function (stream) {
        return __awaiter(this, void 0, void 0, function () {
            var val;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof stream == 'string') {
                            stream = iotile_common_1.mapStreamName(stream);
                        }
                        return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x200b, "H", "LL", [stream])];
                    case 1:
                        val = (_a.sent())[0];
                        return [2 /*return*/, val];
                }
            });
        });
    };
    IOTileDevice.prototype.queryBLEConnectionInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, interval, timeout, prefMin, prefMax, prefTimeout;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x8000, "", "LHHHHHH", [], 1.0)];
                    case 1:
                        _a = _b.sent(), interval = _a[0], timeout = _a[1], prefMin = _a[2], prefMax = _a[3], prefTimeout = _a[4];
                        return [2 /*return*/, {
                                intervalMS: interval * 1.25,
                                preferredMinMS: prefMin * 1.25,
                                preferredMaxMS: prefMax * 1.25,
                                timeoutMS: timeout * 10
                            }];
                }
            });
        });
    };
    IOTileDevice.prototype.updateBLEParams = function (minIntervalMS, maxIntervalMS, timeoutMS) {
        return __awaiter(this, void 0, void 0, function () {
            var minInterval, maxInterval, timeout, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        minInterval = Math.floor(minIntervalMS / 1.25);
                        maxInterval = Math.floor(maxIntervalMS / 1.25);
                        timeout = Math.floor(timeoutMS / 10);
                        if (minIntervalMS < 7.5 || maxIntervalMS < minIntervalMS) {
                            throw new iotile_common_1.ArgumentError("Invalid interval given [" + minIntervalMS + ", " + maxIntervalMS + "], must be min >= 7.5 ms, max >= min");
                        }
                        if (timeoutMS < 100) {
                            throw new iotile_common_1.ArgumentError("Invalid connection timeout given (" + timeoutMS + " ms), must be >= 100 ms.");
                        }
                        return [4 /*yield*/, this.adapter.errorHandlingRPC(8, 0x8001, "HHHH", "L", [minInterval, maxInterval, timeout, 0], 1.0)];
                    case 1:
                        err = (_a.sent())[0];
                        return [2 /*return*/, err];
                }
            });
        });
    };
    return IOTileDevice;
}());
exports.IOTileDevice = IOTileDevice;
//# sourceMappingURL=iotile-device.js.map