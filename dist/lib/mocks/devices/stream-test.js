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
var mock_ble_device_1 = require("../mock-ble-device");
var virtual_device_1 = require("../virtual-device");
var basic_controller_1 = require("../tiles/basic-controller");
var utilities_1 = require("../utilities");
var StreamTestDevice = /** @class */ (function (_super) {
    __extends(StreamTestDevice, _super);
    function StreamTestDevice(iotileID, args) {
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
        var robust = utilities_1.createHashListReport(iotileID, 2, 0, 0, [{ stream: 0x5000, value: 0, id: 1, timestamp: 0 }]);
        var realtime = utilities_1.buildIndividualReport(iotileID, 0x100b, 1);
        controller.queuedReports = [robust, realtime];
        return _this;
    }
    return StreamTestDevice;
}(mock_ble_device_1.MockBLEDevice));
exports.StreamTestDevice = StreamTestDevice;
//# sourceMappingURL=stream-test.js.map