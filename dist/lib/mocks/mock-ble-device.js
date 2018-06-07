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
var errors_1 = require("./errors");
var RSSI = -50;
var VOLTAGE = 3.8;
var MockBLEDevice = /** @class */ (function () {
    function MockBLEDevice(device, connected) {
        this.rssi = RSSI;
        this.device = device;
        this.subscriptions = {};
        this.rpcs = {};
        this.connected = connected;
        this.advertising = this.buildAdvertising(device.iotileID, VOLTAGE);
        this.id = device.iotileID;
        this.payload = new ArrayBuffer(0);
    }
    MockBLEDevice.prototype.buildAdvertising = function (uuid, voltage) {
        var adv = new Uint8Array(62);
        //BLE Flags
        adv[0] = 0x02;
        adv[1] = 0x01;
        adv[2] = 0x06;
        adv[3] = 0x11;
        adv[4] = 0x06;
        //16 byte service UUID
        adv[5] = 0x63;
        adv[6] = 0x0F;
        adv[7] = 0xF6;
        adv[8] = 0x0F;
        adv[9] = 0x2C;
        adv[10] = 0x13;
        adv[11] = 0x11;
        adv[12] = 0xE6;
        adv[13] = 0xBA;
        adv[14] = 0x53;
        adv[15] = 0xF7;
        adv[16] = 0x3F;
        adv[17] = 0x00;
        adv[18] = 0x20;
        adv[19] = 0x00;
        adv[20] = 0x00;
        //Company ID: 0x03C0
        adv[21] = 0x09;
        adv[22] = 0xFF;
        adv[23] = 0xC0;
        adv[24] = 0x03;
        //UUID
        adv[25] = (uuid >> 0) & 0xFF;
        adv[26] = (uuid >> 8) & 0xFF;
        adv[27] = (uuid >> 16) & 0xFF;
        adv[28] = (uuid >> 24) & 0xFF;
        //Flags
        adv[29] = 0;
        adv[30] = 0;
        if (this.connected) {
            adv[29] |= (1 << 2);
        }
        //Scan response data
        adv[31] = 0x1E;
        adv[32] = 0xFF;
        adv[33] = 0xC0;
        adv[34] = 0x03;
        adv[35] = Math.floor((voltage - Math.floor(voltage)) * 256);
        adv[36] = Math.floor(voltage);
        return adv.buffer;
    };
    MockBLEDevice.prototype.unsubscribe = function (serviceID, charID, success, failure) {
        if (!(serviceID in this.subscriptions)) {
            failure("Unknown service ID: " + serviceID);
        }
        if (!(charID in this.subscriptions[serviceID])) {
            failure("Unknown characteristic ID: " + charID);
        }
        if (charID === '2005') {
            this.device.controller.disableStreaming();
        }
        delete this.subscriptions[serviceID][charID];
        success();
    };
    MockBLEDevice.prototype.subscribe = function (serviceID, charID, success, failure) {
        if (!(serviceID in this.subscriptions)) {
            this.subscriptions[serviceID] = {};
        }
        if (!(charID in this.subscriptions[serviceID])) {
            this.subscriptions[serviceID][charID] = [];
        }
        this.subscriptions[serviceID][charID].push({ 'success': success, 'failure': failure });
        //If they subscribed to the streaming characteristic, start streaming
        if (charID === '2005') {
            this.device.controller.enableStreaming(success);
        }
    };
    // eslint-disable-next-line no-unused-vars
    MockBLEDevice.prototype.disconnect = function (success) {
        this.device.controller.disableStreaming();
        //Remove all subscriptions
        this.subscriptions = {};
        setTimeout(success, 0);
    };
    MockBLEDevice.prototype.notify = function (packet, charID) {
        if ('00002000-3FF7-53BA-E611-132C0FF60F63' in this.subscriptions) {
            var serv = this.subscriptions['00002000-3FF7-53BA-E611-132C0FF60F63'];
            if (charID in serv) {
                setTimeout(function () {
                    for (var i = 0; i < serv[charID].length; ++i) {
                        serv[charID][i].success(packet);
                    }
                }, 0);
            }
        }
    };
    MockBLEDevice.prototype.write = function (serviceID, charID, value, success, failure) {
        if ((serviceID !== '00002000-3FF7-53BA-E611-132C0FF60F63')) {
            failure('Unknown service in ble write' + serviceID);
            return;
        }
        success();
        if (charID === '2004') {
            this.payload = value;
            //Handle RPC command payload write
        }
        else if (charID === '2003') {
            this.rpc(value, this.payload);
        }
    };
    MockBLEDevice.prototype.rpc = function (headerData, payloadData) {
        return __awaiter(this, void 0, void 0, function () {
            var header, parsedHeader, payload, status, respPayload, err_1, respHeaderData, respHeader;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        header = new DataView(headerData);
                        parsedHeader = {
                            address: header.getUint8(4),
                            length: header.getUint8(0),
                            sender: header.getUint8(1),
                            command: header.getUint16(2, true)
                        };
                        payload = payloadData.slice(0, parsedHeader.length);
                        status = 0xFF;
                        respPayload = new ArrayBuffer(0);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.device.rpc(parsedHeader.address, parsedHeader.command, payloadData)];
                    case 2:
                        respPayload = _a.sent();
                        //Status is app defined so set app defined bit and set has data bit if we have data
                        status = (1 << 6);
                        if (respPayload.byteLength > 0) {
                            status |= (1 << 7);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        //FIXME: Also catch other exceptions thrown during RPC execution
                        if (err_1 instanceof errors_1.RPCNotFound) {
                            status = 1;
                        }
                        else {
                            throw err_1;
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        respHeaderData = new ArrayBuffer(4);
                        respHeader = new DataView(respHeaderData);
                        respHeader.setUint8(0, status);
                        respHeader.setUint8(3, respPayload.byteLength);
                        this.notify(respHeaderData, '2001');
                        if (respPayload.byteLength > 0) {
                            this.notify(respPayload, '2002');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return MockBLEDevice;
}());
exports.MockBLEDevice = MockBLEDevice;
//# sourceMappingURL=mock-ble-device.js.map