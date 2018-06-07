"use strict";
/**
 * An automated connection plugin that searches for the best BLE connection
 * interval to use for each phone model.  It runs on connection with all
 * ble devices and tries to find the fastest connection interval that the
 * phone will support.
 *
 * This will only work on devices with firmware that support the ble_query
 * and ble_update
 */
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
var iotile_types_1 = require("../common/iotile-types");
var config_1 = require("../config");
;
var IOS_STRATEGY = {
    steps: [
        {
            preupdateWait: 180,
            update: {
                minInterval: 15,
                maxInterval: 15,
                timeout: 1000
            }
        }
    ]
};
var ANDROID_STRATEGY = {
    steps: [
        {
            preupdateWait: 300,
            update: {
                minInterval: 7.5,
                maxInterval: 10,
                timeout: 1000
            }
        },
        {
            preupdateWait: 0,
            update: {
                minInterval: 7.5,
                maxInterval: 15,
                timeout: 1000
            }
        },
        {
            preupdateWait: 0,
            update: {
                minInterval: 7.5,
                maxInterval: 30,
                timeout: 1000
            }
        }
    ]
};
var UPDATE_STRATEGIES = (_a = {},
    _a[iotile_types_1.Platform.IOS] = IOS_STRATEGY,
    _a[iotile_types_1.Platform.Android] = ANDROID_STRATEGY,
    _a);
/**
 * Attempt to find the fastest BLE connection interval.
 *
 * See https://github.com/iotile/iotile-mobile-ionic/issues/804 for significant discussion
 * but basically, phones default to rather slow connection intervals and the peripheral needs
 * to request faster ones if it wants.  However, the rules for each platform are slightly
 * different in terms of what they will accept so we use a platform dependent strategy to
 * hopefully narrow in on the best interval.
 *
 * In particular, android appears to always pick the highest value in your range and iOS only
 * really allows you pick 15 ms or 30 ms and then sometimes still just gives you 30 ms.
 *
 * Test Results:
 * - Moto X 2nd Gen (Android 5): Rejects [7.5, 10], accepts [7.5, 15] at 15 ms.
 *   Requires a delay between updating the parameter and querying it for the change to take effect.
 */
var BLEConnectionOptimizer = /** @class */ (function () {
    function BLEConnectionOptimizer(platform) {
        this.platform = platform;
        this.attempt = 0;
    }
    BLEConnectionOptimizer.prototype.optimizeConnection = function (device, adapter, maxAttempts) {
        if (maxAttempts === void 0) { maxAttempts = 4; }
        return __awaiter(this, void 0, void 0, function () {
            var info, err_1, strategy, _i, _a, step, updateErr, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.attempt = 0;
                        if (!(this.platform in UPDATE_STRATEGIES)) {
                            config_1.catBLEOptimizer.warn("Unknown platform '" + this.platform + "' in optimizeConnection, not optimizing");
                            return [2 /*return*/, null];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, device.queryBLEConnectionInfo()];
                    case 2:
                        info = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _b.sent();
                        config_1.catBLEOptimizer.info("Not optimizing BLE connection on old device that does not support the required RPCs.");
                        return [2 /*return*/, null];
                    case 4:
                        strategy = UPDATE_STRATEGIES[this.platform];
                        if (strategy.steps.length > 0 && info.intervalMS <= strategy.steps[0].update.maxInterval) {
                            config_1.catBLEOptimizer.info("No optimization required, default interval: " + info.intervalMS + " ms");
                            return [2 /*return*/, null];
                        }
                        config_1.catBLEOptimizer.info("Running " + this.platform + " strategy, starting interval: " + info.intervalMS + " ms");
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 18, , 19]);
                        _i = 0, _a = strategy.steps;
                        _b.label = 6;
                    case 6:
                        if (!(_i < _a.length)) return [3 /*break*/, 17];
                        step = _a[_i];
                        if (!(step.preupdateWait > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, iotile_common_1.delay(step.preupdateWait)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        config_1.catBLEOptimizer.debug("Attempting to set interval [" + step.update.minInterval + ", " + step.update.maxInterval + "], attempt: " + this.attempt);
                        return [4 /*yield*/, device.updateBLEParams(step.update.minInterval, step.update.maxInterval, step.update.timeout)];
                    case 9:
                        updateErr = _b.sent();
                        this.attempt += 1;
                        return [4 /*yield*/, iotile_common_1.delay(300)];
                    case 10:
                        _b.sent(); //Make sure we have time for the update take effect
                        if (!(updateErr && updateErr.errorCode == 17)) return [3 /*break*/, 13];
                        config_1.catBLEOptimizer.error("BLE stack busy, trying step again. Interval [" + step.update.minInterval + ", " + step.update.maxInterval + "], attempt: " + this.attempt, Error);
                        return [4 /*yield*/, iotile_common_1.delay(300)];
                    case 11:
                        _b.sent();
                        return [4 /*yield*/, device.updateBLEParams(step.update.minInterval, step.update.maxInterval, step.update.timeout)];
                    case 12:
                        _b.sent();
                        this.attempt += 1;
                        return [3 /*break*/, 14];
                    case 13:
                        if (updateErr) {
                            config_1.catBLEOptimizer.error("Unexpected error optimizing BLE connection", updateErr);
                            return [2 /*return*/, null];
                        }
                        _b.label = 14;
                    case 14: return [4 /*yield*/, device.queryBLEConnectionInfo()];
                    case 15:
                        info = _b.sent();
                        if (info.intervalMS <= step.update.maxInterval) {
                            config_1.catBLEOptimizer.info("Successfully optimized BLE connection interval to " + info.intervalMS + " ms");
                            return [2 /*return*/, null];
                        }
                        _b.label = 16;
                    case 16:
                        _i++;
                        return [3 /*break*/, 6];
                    case 17: return [3 /*break*/, 19];
                    case 18:
                        err_2 = _b.sent();
                        config_1.catBLEOptimizer.error("Unexpected error optimizing BLE connection " + err_2, Error);
                        return [2 /*return*/, null];
                    case 19:
                        // If we got here we exhausted all of our ble update strategy steps
                        // This is not necessarily unexpected on some devices.  In particular on some iphones,
                        // they will not allow BLE connection intervals < 30 ms no matter what unless you are
                        // a HID device.
                        config_1.catBLEOptimizer.warn("Unable to achieve target BLE interval range, final interval: " + info.intervalMS + " ms");
                        return [2 /*return*/, null];
                }
            });
        });
    };
    return BLEConnectionOptimizer;
}());
exports.BLEConnectionOptimizer = BLEConnectionOptimizer;
var _a;
//# sourceMappingURL=iotile-ble-optimizer.js.map