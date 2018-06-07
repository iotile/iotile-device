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
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_common_1 = require("iotile-common");
var mock_ble_device_1 = require("../mock-ble-device");
var virtual_device_1 = require("../virtual-device");
var basic_controller_1 = require("../tiles/basic-controller");
var NFC300 = /** @class */ (function (_super) {
    __extends(NFC300, _super);
    function NFC300(iotileID, args) {
        var _this = this;
        var connected = args.connected;
        if (connected == null) {
            connected = false;
        }
        if (typeof iotileID === "string") {
            iotileID = parseInt(iotileID, 16);
        }
        var controller = new basic_controller_1.BasicControllerTile(iotileID, { appTag: 1024, appVersion: "0.0", osTag: 1024, osVersion: "0.0" }, "2.11.4", "btc1_v3");
        var device = new virtual_device_1.VirtualDevice(iotileID, [controller]);
        _this = _super.call(this, device, connected) || this;
        controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 11'), 1000);
        controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 13'), 1000);
        controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 12'), 1000);
        controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 14'), 1000);
        controller.pushReading(1, iotile_common_1.mapStreamName('unbuffered node 11'));
        controller.pushReading(1, iotile_common_1.mapStreamName('unbuffered node 13'));
        controller.pushReading(1, iotile_common_1.mapStreamName('unbuffered node 12'));
        controller.pushReading(1, iotile_common_1.mapStreamName('unbuffered node 14'));
        return _this;
    }
    return NFC300;
}(mock_ble_device_1.MockBLEDevice));
exports.NFC300 = NFC300;
//# sourceMappingURL=nfc300.js.map