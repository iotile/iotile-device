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
///<reference path="../../typings/cordova_plugins.d.ts"/>
var Errors = require("../common/error-space");
var iotile_types_1 = require("../common/iotile-types");
var iotile_advert_serv_1 = require("./iotile-advert-serv");
var iotile_iface_rpc_1 = require("./iotile-iface-rpc");
var iotile_iface_script_1 = require("./iotile-iface-script");
var iotile_iface_streaming_1 = require("./iotile-iface-streaming");
var iotile_iface_tracing_1 = require("./iotile-iface-tracing");
var iotile_common_1 = require("iotile-common");
var iotile_common_2 = require("iotile-common");
var iotile_ble_optimizer_1 = require("./iotile-ble-optimizer");
var iotile_base_types_1 = require("./iotile-base-types");
var iotile_device_1 = require("./iotile-device");
var config_1 = require("../config");
var mock_ble_serv_1 = require("../mocks/mock-ble-serv");
var ReceiveHeaderCharacteristic = '2001';
var ReceivePayloadCharacteristic = '2002';
var SendHeaderCharacteristic = '2003';
var SendPayloadCharacteristic = '2004';
var StreamingCharacteristic = '2005';
var HighspeedDataCharacteristic = '2006';
var TracingCharacteristic = '2007';
var Interface;
(function (Interface) {
    Interface[Interface["RPC"] = 0] = "RPC";
    Interface[Interface["Streaming"] = 1] = "Streaming";
    Interface[Interface["Script"] = 2] = "Script";
    Interface[Interface["Tracing"] = 3] = "Tracing";
})(Interface = exports.Interface || (exports.Interface = {}));
var IOTileServiceName = '00002000-3FF7-53BA-E611-132C0FF60F63';
var IOTileAdapter = /** @class */ (function (_super) {
    __extends(IOTileAdapter, _super);
    function IOTileAdapter(Config, notificationService, platform) {
        var _this = _super.call(this) || this;
        _this.charManagers = {};
        _this.characteristicNames = {};
        _this.adapterEventNames = {};
        _this.adParser = new iotile_advert_serv_1.IOTileAdvertisementService(Config.BLE.ARCH_BLE_COMPANY_ID, platform);
        _this.notification = notificationService;
        _this.state = iotile_types_1.AdapterState.Idle;
        _this.connectionHooks = [];
        _this.preconnectionHooks = [];
        _this.lastScanResults = [];
        _this.connectedDevice = null;
        _this.tracingOpen = false;
        _this.interactive = false;
        _this.supportsFastWrites = false;
        _this.connectionMessages = [];
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.ReceiveHeader] = '2001';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.ReceivePayload] = '2002';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.SendHeader] = '2003';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.SendPayload] = '2004';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.Streaming] = '2005';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.HighspeedData] = '2006';
        _this.characteristicNames[iotile_types_1.IOTileCharacteristic.Tracing] = '2007';
        //Names of all of our adapter events for broadcasting using angular's emit      
        _this.adapterEventNames[iotile_types_1.AdapterEvent.ScanStarted] = "adapter_scanstarted";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.ScanFinished] = "adapter_scanfinished";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.Connected] = "adapter_connected";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.ConnectionStarted] = "adapter_connectionstarted";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.ConnectionFinished] = "adapter_connectionfinished";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.Disconnected] = "adapter_disconnected";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.UnrecoverableRPCError] = "adapter_unrecoverablerpcerror";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.UnrecoverableStreamingError] = "adapter_streamingerror";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RawRealtimeReading] = "adapter_rawrealtimereading";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RawRobustReport] = "adapter_rawrobustreport";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RobustReportStarted] = "adapter_robustreportstarted";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RobustReportStalled] = "adapter_robustreportstalled";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RobustReportProgress] = "adapter_robustreportprogress";
        _this.adapterEventNames[iotile_types_1.AdapterEvent.RobustReportFinished] = "adapter_robustreportfinished";
        /*
          * We internally manage all notifications on characteristics using a pub/sub
          * listener scheme to allow multiple people to act on the data coming in
          */
        _this.charManagers[iotile_types_1.IOTileCharacteristic.Streaming] = new CharacteristicManager();
        _this.charManagers[iotile_types_1.IOTileCharacteristic.Tracing] = new CharacteristicManager();
        _this.charManagers[iotile_types_1.IOTileCharacteristic.ReceiveHeader] = new CharacteristicManager();
        _this.charManagers[iotile_types_1.IOTileCharacteristic.ReceivePayload] = new CharacteristicManager();
        _this.rpcInterface = new iotile_iface_rpc_1.IOTileRPCInterface();
        _this.streamingInterface = new iotile_iface_streaming_1.IOTileStreamingInterface(Config.BLE.STREAMING_BUFFER_SIZE, true);
        _this.scriptInterface = new iotile_iface_script_1.IOTileScriptInterface();
        _this.tracingInterface = new iotile_iface_tracing_1.IOTileTracingInterface();
        /*
          * Check if we should install a mock ble plugin for development
          * purposes.  This replaces the cordova ble plugin and provides
          * access to a fixed set of (virtual) testing devices defined in
          * mock-ble-serv.js.
          */
        if (Config.BLE && Config.BLE.MOCK_BLE) {
            config_1.catAdapter.info('Using Mock BLE implementation.');
            _this.mockBLEService = new mock_ble_serv_1.MockBleService(Config);
            window.ble = _this.mockBLEService;
            window.device = { 'platform': Config.BLE.MOCK_BLE_DEVICE };
        }
        //Register our own connection hook that optimizes BLE connection speed on connect
        var optimizer = new iotile_ble_optimizer_1.BLEConnectionOptimizer(platform);
        _this.registerConnectionHook(function (device, adapter) { return optimizer.optimizeConnection(device, adapter); });
        //Register our connection hook to support larger stream reports on newer devices
        _this.registerConnectionHook(function (device, adapter) {
            return _this.setReportSize(device, adapter);
        });
        return _this;
    }
    IOTileAdapter.prototype.setReportSize = function (device, adapter) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, maxPacket, _comp1, _comp2, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, adapter.errorHandlingRPC(8, 0x0A05, "LB", "L", [1024 * 1024, 0], 5.0)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, adapter.typedRPC(8, 0x0A06, "", "LBB", [], 5.0)];
                    case 2:
                        _a = _b.sent(), maxPacket = _a[0], _comp1 = _a[1], _comp2 = _a[2];
                        if (maxPacket != 1024 * 1024) {
                            config_1.catAdapter.error("Device report size failed to update", Error);
                        }
                        else {
                            config_1.catAdapter.info("Large device report size successfully configured");
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _b.sent();
                        config_1.catAdapter.debug("Couldn't configure sending larger reports on this device: ", err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#getConnectedDevice
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Get the currently connected device.  If there is no device
     * currently connected, returns null.
     *
     * @returns
     * {IOTileDevice} The currently connected device or null
     *     if no device is connected currently.
     */
    IOTileAdapter.prototype.getConnectedDevice = function () {
        return this.connectedDevice;
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#registerConnectionHook
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Register a function to be called everytime someone connects to a device
     *
     * The function should be asynchronous and throw an exception if there is an error
     * inside the hook that means the device should not be connected to.  If any hook throws
     * an exception, the device is disconnected from and that error is thrown to whomever
     * tried to connect to the device.
     *
     * The signature of the method should be (IOTileDevice, IOTileAdapter) => Promise<void>
     *
     * @param {ConnectionHookCallback} hook The function that should be called every time we
     *    connect to a device.
     */
    IOTileAdapter.prototype.registerConnectionHook = function (hook) {
        this.connectionHooks.push(hook);
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#registerPreconnectionHook
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Register a function to be called before someone connects to a device
     *
     * The function should be asynchronous and return a boolean.  If the function returns
     * true, we can proceed with the connection.  If the function returns false, the connection
     * attempt will be stopped.
     *
     * The signature of the method should be (IOTileDevice, IOTileAdapter) => Promise<boolean>
     *
     * @param {ConnectionHookCallback} hook The function that should be called every time we
     *    connect to a device.
     */
    IOTileAdapter.prototype.registerPreconnectionHook = function (hook) {
        this.preconnectionHooks.push(hook);
    };
    /*
    * If the app gets suspended, we don't receive bluetooth notifications so we need to
    * stop the streaming service so that we don't get corrupted reports that have missing
    * chunks when the user had the app closed.
    *
    * Device pages can hook into the StreamingInterrupted event to boot the user out of a
    * connection to the device page when the app resumes operation after a suspend.
    */
    IOTileAdapter.prototype.pause = function () {
        this.streamingInterface.stop();
    };
    IOTileAdapter.prototype.resume = function () {
        this.notify(iotile_types_1.AdapterEvent.StreamingInterrupted, null);
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#enabled
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Return is BLE is enabled on the device.
     *
     * **This is an async method!**
     *
     * @returns {boolean} Whether or not BLE is enabled on the device
     */
    IOTileAdapter.prototype.enabled = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        window.ble.isEnabled(function () { return resolve(true); }, function () { return resolve(false); });
                    })];
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#scan
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Scan for devices for a fixed period of time.
     *
     * **This is an async method!**
     *
     * Returns a list of IOTileAdvertisement objects for the IOTile devices that
     * were found.
     *
     * ## Side Effects:
     * - Notifies on AdapterEvent.ScanStarted when scanning has been started
     * - Notifies on AdapterEvent.ScanFinished when scanning has finished.
     *
     * AdapterEvent.ScanFinished has one argument with a count property that
     * contains the number of IOTile devices that were found.  See the
     * ScanFinishedArgs interface.
     *
     * @example
     * <pre>
     * //Scan for 1 second and return the devices seen
     * var foundDevices = await IOTileAdapter.scan(1.0);
     * console.log("Found " + foundDevices.length + " IOTile devices!");
     * </pre>
     *
     * @param {number} scanPeriod The number of seconds to scan
     * @returns {IOTileAdvertisement[]} A list of the IOTile devices seen during the scan
     */
    IOTileAdapter.prototype.scan = function (scanPeriod) {
        return __awaiter(this, void 0, void 0, function () {
            var foundDevices, uniqueDevices, that;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        foundDevices = [];
                        uniqueDevices = {};
                        this.ensureIdle('scanning');
                        this.state = iotile_types_1.AdapterState.Scanning;
                        this.notify(iotile_types_1.AdapterEvent.ScanStarted, {});
                        that = this;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 5]);
                        window.ble.startScan([], function (peripheral) {
                            try {
                                var device = that.createIOTileAdvertisement(peripheral);
                                //Make sure we only report each device once even on OSes like iOS that
                                //can return multiple scan events per device in a given scan period.
                                if (device.slug in uniqueDevices) {
                                    return;
                                }
                                uniqueDevices[device.slug] = true;
                                foundDevices.push(device);
                            }
                            catch (err) {
                                if (!(err instanceof Errors.InvalidAdvertisingData)) {
                                    throw err;
                                }
                            }
                        });
                        return [4 /*yield*/, iotile_common_2.delay(scanPeriod * 1000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.stopScan()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        this.state = iotile_types_1.AdapterState.Idle;
                        this.notify(iotile_types_1.AdapterEvent.ScanFinished, { "count": foundDevices.length });
                        return [7 /*endfinally*/];
                    case 5:
                        this.lastScanResults = foundDevices;
                        return [2 /*return*/, foundDevices];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#connectTo
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Connect to an IOTileDevice that has previously been scanned given its slug.
     *
     * **This is an async method**
     *
     * This method connects to an IOTile device over bluetooth.  If there
     * is already an IOTile device connected, it throws an error.
     *
     * Raises a ConnectionError if the device slug cannot be found in previously scanned
     * devices.
     *
     * @param {string} slug The slug of the device that we want to connect to
     * @param {ConnectionOptions} options (optional) Configure what checks and
     *  and actions are performed automatically on connection without any required interaction.
     *  By default, the RPC interface is opened and streaming is started.
     */
    IOTileAdapter.prototype.connectTo = function (slug, options) {
        return __awaiter(this, void 0, void 0, function () {
            var i, advert, device, i, advert, device;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < this.lastScanResults.length)) return [3 /*break*/, 4];
                        advert = this.lastScanResults[i];
                        if (!(advert.slug == slug)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.connect(advert, options)];
                    case 2:
                        device = _a.sent();
                        return [2 /*return*/, device];
                    case 3:
                        ++i;
                        return [3 /*break*/, 1];
                    case 4:
                        if (!(options && options.scanIfNotFound)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.scan(2.0)];
                    case 5:
                        _a.sent();
                        i = 0;
                        _a.label = 6;
                    case 6:
                        if (!(i < this.lastScanResults.length)) return [3 /*break*/, 9];
                        advert = this.lastScanResults[i];
                        if (!(advert.slug == slug)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.connect(advert, options)];
                    case 7:
                        device = _a.sent();
                        return [2 /*return*/, device];
                    case 8:
                        ++i;
                        return [3 /*break*/, 6];
                    case 9: throw new Errors.ConnectionError("Could not find device slug in scan results");
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#connect
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Connect to an IOTileDevice.
     *
     * **This is an async method**
     *
     * This method connects to an IOTile device over bluetooth.  If there
     * is already an IOTile device connected, it throws an error.
     *
     * @param {IOTileAdvertisement} advert The IOTileDevice object that we should
     *                       connect to.  This device should been returned
     *                       from a previous call to IOTileAdapter.scan.
     * @param {ConnectionOptions} options (optional) Configure what checks and
     *  and actions are performed automatically on connection without any required interaction.
     *  By default, the RPC interface is opened and streaming is started.
     *
     * @example
     * <pre>
     * var foundAdverts = await IOTileAdapter.scan(1.0);
     * if (foundAdverts.length > 0) {
     *   var device = await IOTileAdapter.connect(foundAdverts[0]);
     * }
     * </pre>
     */
    IOTileAdapter.prototype.connect = function (advert, options) {
        return __awaiter(this, void 0, void 0, function () {
            var openRPC, openStreaming, prestreamingHook, i, hook, redirect, _a, i, hook, redirect, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureIdle('connecting');
                        openRPC = true;
                        openStreaming = true;
                        prestreamingHook = null;
                        this.connectionMessages = [];
                        this.interactive = true;
                        this.supportsFastWrites = false;
                        this.tracingOpen = false;
                        if (options != null) {
                            if (options.noStreamInterface != null) {
                                openStreaming = !options.noStreamInterface;
                            }
                            if (options.noRPCInterface != null) {
                                openRPC = !options.noRPCInterface;
                            }
                            if (options.prestreamingHook != null) {
                                prestreamingHook = options.prestreamingHook;
                            }
                            if (options.noninteractive != null) {
                                this.interactive = !options.noninteractive;
                            }
                        }
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < this.preconnectionHooks.length)) return [3 /*break*/, 4];
                        hook = this.preconnectionHooks[i];
                        return [4 /*yield*/, hook(advert, this)];
                    case 2:
                        redirect = _b.sent();
                        if (redirect) {
                            throw new Errors.ConnectionCancelledError(redirect);
                        }
                        _b.label = 3;
                    case 3:
                        ++i;
                        return [3 /*break*/, 1];
                    case 4:
                        this.state = iotile_types_1.AdapterState.Connecting;
                        this.notify(iotile_types_1.AdapterEvent.ConnectionStarted, {});
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, , 22, 23]);
                        _a = this;
                        return [4 /*yield*/, this.connectInternal(advert)];
                    case 6:
                        _a.connectedDevice = _b.sent();
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 19, , 21]);
                        if (!openRPC) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.openInterface(Interface.RPC)];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9: 
                    //Always open the script interface in case we need to do a firmware update
                    return [4 /*yield*/, this.openInterface(Interface.Script)];
                    case 10:
                        //Always open the script interface in case we need to do a firmware update
                        _b.sent();
                        i = 0;
                        _b.label = 11;
                    case 11:
                        if (!(i < this.connectionHooks.length)) return [3 /*break*/, 14];
                        hook = this.connectionHooks[i];
                        return [4 /*yield*/, hook(this.connectedDevice, this)];
                    case 12:
                        redirect = _b.sent();
                        if (redirect) {
                            throw new Errors.ConnectionCancelledError(redirect);
                        }
                        _b.label = 13;
                    case 13:
                        ++i;
                        return [3 /*break*/, 11];
                    case 14:
                        if (!(prestreamingHook != null)) return [3 /*break*/, 16];
                        return [4 /*yield*/, prestreamingHook(this.connectedDevice, this)];
                    case 15:
                        _b.sent();
                        _b.label = 16;
                    case 16:
                        if (!openStreaming) return [3 /*break*/, 18];
                        return [4 /*yield*/, this.openInterface(Interface.Streaming)];
                    case 17:
                        _b.sent();
                        _b.label = 18;
                    case 18: return [3 /*break*/, 21];
                    case 19:
                        err_2 = _b.sent();
                        return [4 /*yield*/, this.disconnect()];
                    case 20:
                        _b.sent();
                        throw err_2;
                    case 21: return [3 /*break*/, 23];
                    case 22:
                        this.notify(iotile_types_1.AdapterEvent.ConnectionFinished, {});
                        return [7 /*endfinally*/];
                    case 23:
                        this.notify(iotile_types_1.AdapterEvent.Connected, { device: this.connectedDevice });
                        return [2 /*return*/, this.connectedDevice];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#rpc
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Send an RPC to a connected IOTile device
     *
     * **This is an async method!**
     *
     * This function sends a single RPC to an IOTile device and waits for it to finish
     * before returning.  Internally the RPC is queued so that multiple users calling this
     * function from different places simultaneously will properly be synchronized.
     *
     * This is provisional API that will change.
     *
     * @param {number} address The address of the tile that we want to send the RPC to
     * @param {ArrayBuffer} payload The payload that we would like to send
     * @param {number} rpcID The 16 bit id of the RPC that we would like to call
     * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
     *     to finish.
     *
     *
     */
    IOTileAdapter.prototype.rpc = function (address, rpcID, payload, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.ensureConnected('sending rpc');
                        return [4 /*yield*/, this.rpcInterface.rpc(address, rpcID, payload, timeout)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response];
                }
            });
        });
    };
    IOTileAdapter.prototype.sendScript = function (script, notifier) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.ensureConnected('sending script');
                        return [4 /*yield*/, this.scriptInterface.send(script, notifier)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileAdapter.prototype.clearTrace = function () {
        this.tracingInterface.clearData();
    };
    /**
     * Wait for a given number of bytes to be received on the tracing interface.
     *
     * If no data has been received in more than 1 second after calling this function,
     * the promise returned will be rejected by the tracing interface watchdog timer,
     * making sure that the interface cannot stall.  The recommended way to use this
     * function is to trigger some event that sends data via the tracing interface
     * (after making sure the interface is open...) and then calling:
     *
     * ```
     * let data: ArrayBuffer = await adapter.waitForTracingData(numBytes);
     * ```
     *
     * That is all that is required to synchronously receive that number of bytes
     * from the tracing interface.
     *
     * @param numBytes The number of bytes to wait for.  This exact
     *        number of bytes will be returned to you when the Promise
     *        is resolved.
     * @param timeout The number of milliseconds to wait before receiving another chunk
     *        of tracing data before we give up and abort the wait (rejecting the promise).
     *        This defaults to 1000 ms if not passed.
     */
    IOTileAdapter.prototype.waitForTracingData = function (numBytes, timeout) {
        if (timeout === void 0) { timeout = 1000; }
        return this.tracingInterface.waitForData(numBytes, timeout);
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#typedRPC
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Type converting wrapper around rpc()
     *
     * **This is an async method!**
     *
     * This function sends a single RPC to an IOTile device and waits for it to finish
     * before returning.  Internally it calls IOTileAdapter.rpc() to make the actual RPC
     * call but this function builds the payload ArrayBuffer from a list of integers and
     * a format code.  Similarly, it decodes the response into a list of numbers as well.
     *
     * If an error occurs calling the RPC, an exception is thrown indicating what went wrong.
     * If the error is unrecoverable, further RPCs to the device will not be allowed without
     * disconnecting and reconnecting.
     *
     * @param {number} address The address of the tile that we want to send the RPC to
     * @param {number} rpcID The 16 bit id of the RPC that we would like to call
     * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
     *     to finish.
     * @param {string} callFormat A format code passed to packArrayBuffer to convert a list of numbers
     *     into an ArrayBuffer.  Examples would be "LH" to pack an unsigned 32 bit integer followed by
     *     a 16 bit integer.
     * @param {string} respFormat A format code passed to unpackArrayBuffer to convert the response Callback
     *     into a list of numbers that are returned.
     * @param {number[]} args An array of arguments that should match the format of callFormat and is used to
     *     construct the payload for this RPC.
     * @returns {number[]} The decoded list of numbers that were returned from the RPC.
     */
    IOTileAdapter.prototype.typedRPC = function (address, rpcID, callFormat, respFormat, args, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var callPayload, respBuffer, resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        callPayload = iotile_common_2.packArrayBuffer.apply(void 0, [callFormat].concat(args));
                        return [4 /*yield*/, this.rpc(address, rpcID, callPayload, timeout)];
                    case 1:
                        respBuffer = _a.sent();
                        resp = iotile_common_2.unpackArrayBuffer(respFormat, respBuffer);
                        return [2 /*return*/, resp];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#errorHandlingRPC
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Type converting wrapper around rpc() that throws if the first argument of response is nonzero
     *
     * **This is an async method!**
     *
     * This function sends a single RPC to an IOTile device and waits for it to finish
     * before returning.  Internally it calls IOTileAdapter.rpc() to make the actual RPC
     * call but this function builds the payload ArrayBuffer from a list of integers and
     * a format code.  Similarly, it decodes the response into a list of numbers as well.
     *
     * If an error occurs calling the RPC, an exception is thrown indicating what went wrong.
     * If the error is unrecoverable, further RPCs to the device will not be allowed without
     * disconnecting and reconnecting.
     *
     * The RPC called must return a uint32_t as the first 4 bytes of its response and this value
     * is checked to ensure it is zero.  If it is nonzero, an exception is thrown rather saying
     * there was an error executing the RPC.
     *
     * **The list of values returned does not include the error code since it will always be zero.**
     *
     * @param {number} address The address of the tile that we want to send the RPC to
     * @param {number} rpcID The 16 bit id of the RPC that we would like to call
     * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
     *     to finish.
     * @param {string} callFormat A format code passed to packArrayBuffer to convert a list of numbers
     *     into an ArrayBuffer.  Examples would be "LH" to pack an unsigned 32 bit integer followed by
     *     a 16 bit integer.
     * @param {string} respFormat A format code passed to unpackArrayBuffer to convert the response Callback
     *     into a list of numbers that are returned.
     * @param {number[]} args An array of arguments that should match the format of callFormat and is used to
     *     construct the payload for this RPC.  The first item (the error code) is shifted off and not returned.
     * @returns {number[]} The decoded list of numbers that were returned from the RPC (excluding the error code).
     */
    IOTileAdapter.prototype.errorHandlingRPC = function (address, rpcID, callFormat, respFormat, args, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, errorCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        //The response must start with a 32 bit integer
                        if (respFormat.length === 0 || respFormat[0] != 'L') {
                            throw new iotile_common_1.ArgumentError('Invalid response format for errorHandlingRPC that did not start with an L code for the error.');
                        }
                        return [4 /*yield*/, this.typedRPC(address, rpcID, callFormat, respFormat, args, timeout)];
                    case 1:
                        resp = _a.sent();
                        errorCode = resp.shift();
                        if (errorCode != 0) {
                            config_1.catAdapter.error("Failed to execute rpc " + rpcID + " on tile " + address, Error);
                            throw new Errors.RPCError(address, rpcID, errorCode);
                        }
                        return [2 /*return*/, resp];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#disconnect
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Disconnect from any currently connected IOTile Device.
     *
     * **This is an async method!**
     *
     * This method can never fail.  After the method returns, the IOTile
     * adapter will be in an Idle state and able to scan for or connect to
     * other IOTile devices.
     */
    IOTileAdapter.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.state !== iotile_types_1.AdapterState.Connected) {
                            return [2 /*return*/];
                        }
                        this.state = iotile_types_1.AdapterState.Disconnecting;
                        if (!this.connectedDevice) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.disconnectInternal(this.connectedDevice.connectionID)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.charManagers[iotile_types_1.IOTileCharacteristic.Streaming].removeAll();
                        this.charManagers[iotile_types_1.IOTileCharacteristic.ReceiveHeader].removeAll();
                        this.charManagers[iotile_types_1.IOTileCharacteristic.ReceivePayload].removeAll();
                        this.charManagers[iotile_types_1.IOTileCharacteristic.Tracing].removeAll();
                        this.state = iotile_types_1.AdapterState.Idle;
                        this.connectedDevice = null;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#subscribe
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Subscribe to notifications on IOTileDevice related events.
     *
     * Currently supports scan started and scan finished events.  The
     * notifications proceed using the angular event system.  You may
     * pass a scope object and all notifications you register will be
     * automatically removed when your scope is destroyed.  If you are calling
     * this method from a service, you can pass null for the scope to not automatically
     * deregister the handler on scope destruction.
     *
     * @param {AdapterEvent} event The event that you want to subscribe to, must be an event
     *                       in IOTileAdapterModule.AdapterEvent.
     * @param {Callback} callback The function that will be called when the event happens.
     *                   callback must have the signature callback(object) => void.
     *
     * @returns {Handler} A function that will deregister this handler before the scope
     *                    is destroyed if necessary.
     */
    IOTileAdapter.prototype.subscribe = function (event, callback) {
        var eventName = this.adapterEventNames[event];
        var handler = this.notification.subscribe(eventName, callback);
        return handler;
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#addNotificationListener
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Listen for notifications on a specific BLE characteristic known to IOTileAdapter.
     *
     * **This is an async method!**
     *
     * If this is the first call to addNotificationListener on this characteristic,
     * the BLE stack is called to enable notifications.  However, if this is a subsequent call,
     * it will complete immediately since nofications have already been enabled.  The listener
     * will just be added to an internal table of notification listeners for that characteristic
     * @param {IOTileCharacteristic} char A numerical identifier for the characteristic that we want
     *                               notifications about.
     * @param {NotificationCallback} callback The callback with signature (ArrayBuffer) => void
     * @returns {Promise}            Asynchronously returns a function that takes no arguments and
     *                               removes this notification listener when called.  The signature
     *                               of the function returned is () => Promise<void>
     */
    IOTileAdapter.prototype.addNotificationListener = function (char, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var charManager, handlerID, that, removeHandler;
            return __generator(this, function (_a) {
                this.ensureConnected('enable notifications');
                if (!(char in this.charManagers)) {
                    throw new iotile_common_1.UnknownKeyError("Characteristic cannot be listened to: " + char);
                }
                charManager = this.charManagers[char];
                handlerID = charManager.addListener(callback);
                that = this;
                removeHandler = function () { return that.removeNotificationListener(char, handlerID); };
                if (charManager.numListeners() > 1) {
                    return [2 /*return*/, removeHandler];
                }
                //If this is the first listener registered, start notification on the characteristic.
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (that.connectedDevice) {
                            window.ble.startNotification(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], function (data) {
                                charManager.handleData(data);
                            }, function (failure) {
                                charManager.removeListener(handlerID);
                                reject(failure);
                            });
                            /**
                             * Unfortunately, there is no callback from the BLE stack when notifications are successfully enabled,
                             * but there is a failure callback, so given that multiple BLE events should have occurred
                             * within 100 ms, if we haven't heard a failure by then, assume that it worked and resolve
                             * the promise.
                             */
                            setTimeout(function () { resolve(removeHandler); }, 100);
                        }
                    })];
            });
        });
    };
    /**
     * @ngdoc method
     * @name iotile.device.service:IOTileAdapter#removeNotificationListener
     * @methodOf iotile.device.service:IOTileAdapter
     *
     * @description
     * Remove a previously installed notification listener.
     *
     * **This is an async method!**
     *
     * This will deregister a callback that was listening for notified data on a characteristic.
     * If this is the last callback registered on that characteristic, notifications will also be
     * stopped.
     * @param {IOTileCharacteristic} char A numerical identifier for the characteristic that we want
     *                               notifications about.
     * @param {number} handlerID the ID of the callback that should be removed, which is returned from the call
                       to addNotificationListener.
      * @returns {Promise} A promise that is fullfilled when the listener has been removed
      */
    IOTileAdapter.prototype.removeNotificationListener = function (char, handlerID) {
        return __awaiter(this, void 0, void 0, function () {
            var charManager, stopNotifications, that;
            return __generator(this, function (_a) {
                if (!(char in this.charManagers)) {
                    throw new iotile_common_1.UnknownKeyError("Characteristic cannot be listened to: " + char);
                }
                charManager = this.charManagers[char];
                stopNotifications = charManager.removeListener(handlerID);
                that = this;
                if (stopNotifications) {
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            if (that.connectedDevice) {
                                window.ble.stopNotification(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], function () { return resolve(); }, function (reason) { return reject(reason); });
                            }
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Create a channel object that can write and subscribe to characteristics
     * over BLE.  Channels are passed to the subinterfaces inside this IOTileAdapter
     * in order to give them the ability to actually talk to the IOTile device without
     * creating a public API for low level writes and notifications.
     *
     * The BLEChannel interface is intended to be minimalist and only all the required operations.
     */
    IOTileAdapter.prototype.createChannel = function () {
        var that = this;
        return {
            write: function (char, value) {
                return that.write(char, value);
            },
            subscribe: function (char, callback) {
                return that.addNotificationListener(char, callback);
            },
            notify: function (event, value) {
                return that.notify(event, value);
            }
        };
    };
    IOTileAdapter.prototype.openInterface = function (iface) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected('open device interface');
                        _a = iface;
                        switch (_a) {
                            case Interface.RPC: return [3 /*break*/, 1];
                            case Interface.Streaming: return [3 /*break*/, 3];
                            case Interface.Script: return [3 /*break*/, 5];
                            case Interface.Tracing: return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 10];
                    case 1: return [4 /*yield*/, this.rpcInterface.open(this.createChannel())];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 3: return [4 /*yield*/, this.streamingInterface.open(this.createChannel())];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 5:
                        if (!this.connectedDevice) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.scriptInterface.open(this.connectedDevice, this.createChannel())];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.tracingInterface.open(this.createChannel())];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Open the tracing interface so that we can receive tracing data.
     */
    IOTileAdapter.prototype.enableTracing = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.tracingOpen)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.tracingInterface.open(this.createChannel())];
                    case 1:
                        _a.sent();
                        this.tracingOpen = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileAdapter.prototype.closeInterface = function (iface) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.ensureConnected('close device interface');
                        _a = iface;
                        switch (_a) {
                            case Interface.RPC: return [3 /*break*/, 1];
                            case Interface.Streaming: return [3 /*break*/, 3];
                            case Interface.Script: return [3 /*break*/, 5];
                            case Interface.Tracing: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 1: return [4 /*yield*/, this.rpcInterface.close()];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, this.streamingInterface.close()];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 5: return [4 /*yield*/, this.scriptInterface.close()];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, this.tracingInterface.close()];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ensure the Adapter is in an idle state before proceeding
     */
    IOTileAdapter.prototype.ensureIdle = function (action) {
        if (this.state != iotile_types_1.AdapterState.Idle) {
            throw new Errors.OperationAtInvalidTimeError("action: '" + action + "'' started at invalid time, adapter was not idle.", this.state);
        }
    };
    IOTileAdapter.prototype.ensureConnected = function (action, userMessage) {
        if (this.state != iotile_types_1.AdapterState.Connected) {
            throw new Errors.OperationAtInvalidTimeError("action: '" + action + "'' started at invalid time, adapter was not connected.", this.state, userMessage);
        }
    };
    IOTileAdapter.prototype.notify = function (event, args) {
        var eventName = this.adapterEventNames[event];
        this.notification.notify(eventName, args);
    };
    IOTileAdapter.prototype.createIOTileAdvertisement = function (peripheral) {
        return this.adParser.processAdvertisement(peripheral.id, peripheral.rssi, peripheral.advertising);
    };
    /**
     * Wrapper around cordova ble plugin with a Promise based interface
     */
    IOTileAdapter.prototype.stopScan = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        window.ble.stopScan(resolve, reject);
                    })];
            });
        });
    };
    IOTileAdapter.prototype.write = function (char, value) {
        return __awaiter(this, void 0, void 0, function () {
            var that;
            return __generator(this, function (_a) {
                this.ensureConnected('writing to characteristic', "Error sending data to device");
                that = this;
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        /**
                         * In case there is ever a hang in the bluetooth stack, make sure we timeout our writes.  They should take < 50 ms each
                         * so if any single write takes longer than 2 seconds. fail it.  We need to set the timeout
                         * to 2 seconds because on old v2 controller hardware, there can be ~ .5s lag when the controller
                         * needs to erase its flash memory which backs up the writes and it can take more than 1s total
                         * for the writes to succeed, causing a spurious timeout.  Having a 2 second timeout is observed
                         * to be long enough.
                         */
                        var removeHandler = setTimeout(function () {
                            reject(new Errors.WriteError("Timeout sending data"));
                        }, 2000);
                        var resolveFunction = function () {
                            clearTimeout(removeHandler);
                            resolve();
                        };
                        /*
                         * Old POD1 devices were misconfigured and did not specify that they allowed writeWithoutResponse on their
                         * RPC characteristics, leading to a 2x reduction in RPC throughput.  So, we added an advertisement flag
                         * that states whether the device allows fast writes and if it's set we should use writeWithoutResponse
                         * to get faster throughput.
                         *
                         * However, this is only enforced on iOS devices, so don't unnecessarily slow down android devices.  Also,
                         * even though we have a nice advertisement flag for this purpose, iOS and Android cache the GATT tables
                         * for BLE devices so they won't update the gatt table when a new one is loaded upon firmware update, so we
                         * need to check in the phone's cached GATT table to see if it supports fast writes.  The check is done upon
                         * connection and the result stored in this.supportsFastWrites.
                         */
                        if (that.connectedDevice) {
                            if (that.supportsFastWrites || that.adParser.platform() === iotile_types_1.Platform.Android) {
                                window.ble.writeWithoutResponse(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], value, resolveFunction, function (err) {
                                    clearTimeout(removeHandler);
                                    reject(new Errors.WriteError(err));
                                });
                            }
                            else {
                                window.ble.write(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], value, resolveFunction, function (err) {
                                    clearTimeout(removeHandler);
                                    reject(new Errors.WriteError(err));
                                });
                            }
                        }
                    })];
            });
        });
    };
    /**
     * Connect to a device using the internal cordova BLE plugin
     *
     * This function is a bit complicated because of the plugin's
     * API.  There are two callbacks provided to the plugin:
     * onConnected and onDisconnected
     *
     * onConnected is called with no arguments after we succesfully connect
     * onDisconnected is called in two circumstances:
     *   - if we did not connect successfully, in which case we reject the promise
     *   - if we subsequently get disconnected from the BLE device, in which case
     *     the promise is gone and we instead notify that we were disconnected by
     *     calling disconnectCallback.
     */
    IOTileAdapter.prototype.connectInternal = function (advert) {
        return __awaiter(this, void 0, void 0, function () {
            var that;
            return __generator(this, function (_a) {
                that = this;
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        window.ble.connect(advert.connectionID, function (peripheral) {
                            that.supportsFastWrites = that.checkFastWriteSupport(peripheral);
                            if (that.supportsFastWrites) {
                                config_1.catAdapter.info("Device supports fast writes, increasing RPC and script speed.");
                            }
                            resolve(new iotile_device_1.IOTileDevice(that, advert));
                            that.state = iotile_types_1.AdapterState.Connected;
                        }, function (reason) {
                            if (that.state == iotile_types_1.AdapterState.Connecting) {
                                that.state = iotile_types_1.AdapterState.Idle;
                                reject(new Errors.ConnectionFailedError(reason));
                            }
                            else {
                                that.disconnectCallback(reason);
                            }
                        });
                    })];
            });
        });
    };
    IOTileAdapter.prototype.checkFastWriteSupport = function (peripheral) {
        var highspeed = this.findCharacteristic(peripheral, IOTileServiceName, HighspeedDataCharacteristic);
        var header = this.findCharacteristic(peripheral, IOTileServiceName, SendHeaderCharacteristic);
        var payload = this.findCharacteristic(peripheral, IOTileServiceName, SendPayloadCharacteristic);
        if (highspeed == null || header == null || payload == null)
            return false;
        return this.checkProperty(highspeed, "WriteWithoutResponse") && this.checkProperty(header, "WriteWithoutResponse") && this.checkProperty(payload, "WriteWithoutResponse");
    };
    IOTileAdapter.prototype.findCharacteristic = function (peripheral, service, charName) {
        if (peripheral.characteristics == null || peripheral.characteristics.length == null)
            return null;
        for (var _i = 0, _a = peripheral.characteristics; _i < _a.length; _i++) {
            var char = _a[_i];
            if (char.service.toLowerCase() !== service.toLowerCase())
                continue;
            if (char.characteristic.toLowerCase() === charName.toLowerCase())
                return char;
        }
        return null;
    };
    IOTileAdapter.prototype.checkProperty = function (char, propToFind) {
        for (var _i = 0, _a = char.properties; _i < _a.length; _i++) {
            var prop = _a[_i];
            if (prop.toLowerCase() === propToFind.toLowerCase()) {
                return true;
            }
        }
        return false;
    };
    /**
     * Internally in BLE central plugin, the possible responses are:
     * - in Android, there is no way for disconnect to fail.  The disconnect attempt
     *   is scheduled and then resolve is called.
     */
    IOTileAdapter.prototype.disconnectInternal = function (deviceID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        window.ble.disconnect(deviceID, resolve, reject);
                    })];
            });
        });
    };
    /**
     * Callback provided to ble plugin that is called whenever a device gets disconnected
     * or if the connection attempt fails.
     */
    IOTileAdapter.prototype.disconnectCallback = function (reason) {
        config_1.catAdapter.info("Disconnect callback: " + JSON.stringify(reason));
        if (this.state == iotile_types_1.AdapterState.Connected) {
            this.state = iotile_types_1.AdapterState.Idle;
            var device = this.connectedDevice;
            this.connectedDevice = null;
            this.charManagers[iotile_types_1.IOTileCharacteristic.Streaming].removeAll();
            this.charManagers[iotile_types_1.IOTileCharacteristic.ReceiveHeader].removeAll();
            this.charManagers[iotile_types_1.IOTileCharacteristic.ReceivePayload].removeAll();
            this.charManagers[iotile_types_1.IOTileCharacteristic.Tracing].removeAll();
            this.notify(iotile_types_1.AdapterEvent.Disconnected, { device: device });
        }
    };
    return IOTileAdapter;
}(iotile_base_types_1.AbstractIOTileAdapter));
exports.IOTileAdapter = IOTileAdapter;
var CharacteristicManager = /** @class */ (function () {
    function CharacteristicManager() {
        this.lastID = 0;
        this.listenerCount = 0;
        this.callbacks = {};
    }
    CharacteristicManager.prototype.addListener = function (callback) {
        var id = this.lastID;
        this.lastID += 1;
        this.listenerCount += 1;
        this.callbacks[id] = callback;
        return id;
    };
    CharacteristicManager.prototype.removeAll = function () {
        this.callbacks = {};
        this.listenerCount = 0;
    };
    CharacteristicManager.prototype.handleData = function (data) {
        for (var key in this.callbacks) {
            try {
                this.callbacks[key](data);
            }
            catch (err) {
                //FIXME: Log an error here that one of our handlers was broken
            }
        }
    };
    CharacteristicManager.prototype.numListeners = function () {
        return this.listenerCount;
    };
    /**
     * @description
     * Remove a listener and return true if there are no more listeners registered
     */
    CharacteristicManager.prototype.removeListener = function (listenerID) {
        if (!(listenerID in this.callbacks)) {
            throw new iotile_common_1.UnknownKeyError('Unknown characteristic listener key: ' + listenerID);
        }
        delete this.callbacks[listenerID];
        this.listenerCount -= 1;
        return (this.listenerCount == 0);
    };
    return CharacteristicManager;
}());
//# sourceMappingURL=iotile-serv.js.map