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
var SoilMoisturePOD = /** @class */ (function (_super) {
    __extends(SoilMoisturePOD, _super);
    function SoilMoisturePOD(iotileID, args) {
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
        controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 15'), 1000);
        controller.pushReading(2048, iotile_common_1.mapStreamName('unbuffered node 15'));
        if (args.double) {
            controller.addRealtimeStreamer(iotile_common_1.mapStreamName('unbuffered node 16'), 1000);
            controller.pushReading(1024, iotile_common_1.mapStreamName('unbuffered node 16'));
        }
        return _this;
    }
    return SoilMoisturePOD;
}(mock_ble_device_1.MockBLEDevice));
exports.SoilMoisturePOD = SoilMoisturePOD;
//# sourceMappingURL=soil-moisture.js.map