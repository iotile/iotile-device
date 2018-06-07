"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Devices = require("./devices");
var config_1 = require("../config");
var MockBleService = /** @class */ (function () {
    function MockBleService(Config) {
        /* Implementation */
        this.devices = [];
        this.Config = Config;
        config_1.catMockBLE.info(Config.BLE.MOCK_BLE_DEVICES);
        for (var devID in Config.BLE.MOCK_BLE_DEVICES) {
            var knownDevices = {
                'nfc300': Devices.NFC300,
                'soilmoisture': Devices.SoilMoisturePOD,
                'temperature': Devices.TemperaturePOD,
                'stream_test': Devices.StreamTestDevice
            };
            var constructor = knownDevices[Config.BLE.MOCK_BLE_DEVICES[devID].type];
            var device = new constructor(devID, Config.BLE.MOCK_BLE_DEVICES[devID].args);
            this.devices.push(device);
        }
        config_1.catMockBLE.info('Created ' + this.devices.length + ' fake devices');
        this.scanInfo = { 'inProgress': false, 'discoveryTimer': null };
        this.connectionInfo = { 'inProgress': false, 'connected': false, 'device': null };
    }
    // eslint-disable-next-line no-unused-vars
    MockBleService.prototype.isEnabled = function (yesCallback, noCallback) {
        setTimeout(yesCallback, 0);
    };
    /* Call the success function every 500 ms with a device from the devices list */
    MockBleService.prototype.startScan = function (services, success, failure) {
        var i = 0;
        if (this.scanInfo.inProgress) {
            config_1.catMockBLE.error('startScan called twice without stopScan being called in between', Error);
            setTimeout(failure, 10);
            return;
        }
        this.scanInfo.inProgress = true;
        var that = this;
        function discoverFunction() {
            that.scanInfo.discoveryTimer = null;
            if (!that.scanInfo.inProgress) {
                config_1.catMockBLE.error('discover callback triggered outside of scanning period.  This is probably a race condition.', Error);
                return;
            }
            for (i = 0; i < that.devices.length; ++i) {
                success(that.devices[i]);
            }
        }
        this.scanInfo.discoveryTimer = setTimeout(discoverFunction, this.Config.BLE.MOCK_BLE_SCAN_DELAY);
    };
    // eslint-disable-next-line no-unused-vars
    MockBleService.prototype.stopScan = function (success, failure) {
        if (!this.scanInfo.inProgress) {
            config_1.catMockBLE.error('stopScan called without startScan first being called.', Error);
            return;
        }
        if (this.scanInfo.discoveryTimer !== null) {
            clearTimeout(this.scanInfo.discoveryTimer);
            this.scanInfo.discoveryTimer = null;
        }
        this.scanInfo.inProgress = false;
        if (success) {
            setTimeout(success, 0);
        }
    };
    MockBleService.prototype.connect = function (deviceID, success, failure) {
        if (this.connectionInfo.connected || this.connectionInfo.inProgress) {
            config_1.catMockBLE.error('Connect called twice', Error);
            setTimeout(function () {
                failure('Connect called twice to id: ' + deviceID);
            }, 20);
            return;
        }
        for (var i = 0; i < this.devices.length; ++i) {
            if (this.devices[i].device.iotileID === deviceID) {
                if (this.devices[i].connected) {
                    setTimeout(function () { failure('Connect called on device with other connected: ' + deviceID); }, 20);
                }
                else {
                    var that = this;
                    setTimeout(function () { that.finishConnection(success); }, that.Config.BLE.MOCK_BLE_SCAN_DELAY);
                    this.connectionInfo.inProgress = true;
                    this.connectionInfo.device = this.devices[i];
                    this.connectionInfo.disconnected = failure;
                }
                break;
            }
        }
        //If none of our devices matched, notify that we couldn't find the device
        if (!this.connectionInfo.inProgress) {
            setTimeout(function () {
                failure('Could not find device by id: ' + deviceID);
            }, 20);
        }
    };
    MockBleService.prototype.finishConnection = function (callback) {
        if (!this.connectionInfo.inProgress) {
            config_1.catMockBLE.error('finishConnection called in invalid state.', Error);
        }
        this.connectionInfo.inProgress = false;
        this.connectionInfo.connected = true;
        callback(this.connectionInfo.device);
    };
    MockBleService.prototype.isConnected = function (deviceID, success, failure) {
        if (this.connectionInfo.connected && this.connectionInfo.device.id === deviceID) {
            setTimeout(success, 0);
        }
        else {
            setTimeout(failure, 0);
        }
    };
    MockBleService.prototype.disconnect = function (deviceID, success, failure) {
        if (this.connectionInfo.connected && this.connectionInfo.device.id === deviceID) {
            this.connectionInfo.device.disconnect(success);
            this.connectionInfo.connected = false;
            this.connectionInfo.device = null;
        }
        else {
            setTimeout(failure, 0);
        }
    };
    MockBleService.prototype.force_disconnect = function () {
        if (this.connectionInfo.connected) {
            this.connectionInfo.disconnected("Unexpected disconnection");
            this.disconnect(this.connectionInfo.device.id, function () { }, function () { });
        }
    };
    MockBleService.prototype.write = function (deviceID, serviceID, charID, value, success, failure) {
        if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
            setTimeout(failure, 10);
            return;
        }
        this.connectionInfo.device.write(serviceID, charID, value, success, failure);
    };
    MockBleService.prototype.writeWithoutResponse = function (deviceID, serviceID, charID, value, success, failure) {
        if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
            setTimeout(failure, 10);
            return;
        }
        this.connectionInfo.device.write(serviceID, charID, value, success, failure);
    };
    MockBleService.prototype.startNotification = function (deviceID, serviceID, charID, success, failure) {
        if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
            setTimeout(failure, 10);
            return;
        }
        this.connectionInfo.device.subscribe(serviceID, charID, success, failure);
    };
    MockBleService.prototype.stopNotification = function (deviceID, serviceID, charID, success, failure) {
        if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
            setTimeout(failure, 10);
            return;
        }
        this.connectionInfo.device.unsubscribe(serviceID, charID, success, failure);
    };
    return MockBleService;
}());
exports.MockBleService = MockBleService;
//# sourceMappingURL=mock-ble-serv.js.map