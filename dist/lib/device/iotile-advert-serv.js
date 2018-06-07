"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="../../typings/cordova_plugins.d.ts"/>
var error_space_1 = require("../common/error-space");
var iotile_common_1 = require("iotile-common");
var iotile_types_1 = require("../common/iotile-types");
var IOTileAdvertisementService = /** @class */ (function () {
    function IOTileAdvertisementService(companyId, platform) {
        this.companyId = companyId;
        this._platform = platform;
    }
    IOTileAdvertisementService.prototype.processAdvertisement = function (connectionID, rssi, advert) {
        if (this._platform === iotile_types_1.Platform.IOS) {
            return this.processIOSAdvertisement(connectionID, rssi, advert);
        }
        else if (this._platform === iotile_types_1.Platform.Android) {
            return this.processAndroidAdvertisement(connectionID, rssi, advert);
        }
        else {
            //FIXME: Currently the only web advertisements we process come from mock
            //devices that are returned in android format.
            return this.processAndroidAdvertisement(connectionID, rssi, advert);
        }
    };
    IOTileAdvertisementService.prototype.platform = function () {
        return this._platform;
    };
    //FIXME: Process scan response information
    IOTileAdvertisementService.prototype.processAndroidAdvertisement = function (connectionID, rssi, advert) {
        if (advert.byteLength != 31 && advert.byteLength != 62) {
            throw new error_space_1.InvalidAdvertisingData("Advertisement has the wrong length: " + advert.byteLength + " bytes");
        }
        //FIXME: We should check for the actual service id here
        var advertData = new DataView(advert, 0, 31);
        var manuID = advertData.getUint16(23, true);
        if (manuID != this.companyId) {
            throw new error_space_1.InvalidAdvertisingData("Advertisement has an invalid company ID: " + manuID);
        }
        var deviceID = advertData.getUint32(25, true);
        var flags = advertData.getUint16(29, true);
        return {
            batteryVoltage: 0,
            deviceID: deviceID,
            flags: this.parseFlags(flags),
            connectionID: connectionID,
            rssi: rssi,
            slug: iotile_common_1.deviceIDToSlug(deviceID)
        };
    };
    //FIXME: Process scan response information
    IOTileAdvertisementService.prototype.processIOSAdvertisement = function (connectionID, rssi, advert) {
        if (!(advert && advert.kCBAdvDataManufacturerData)) {
            throw new error_space_1.InvalidAdvertisingData("No manufacturing data in IOS device advertisement");
        }
        var manuData = new DataView(advert.kCBAdvDataManufacturerData);
        if (manuData.byteLength != 8 && manuData.byteLength != (8 + 16)) {
            throw new error_space_1.InvalidAdvertisingData("IOS advertising data had the wrong manufacturing data length: " + manuData.byteLength);
        }
        var manuID = manuData.getUint16(0, true);
        if (manuID != this.companyId) {
            throw new error_space_1.InvalidAdvertisingData("Advertisement has an invalid company ID: " + manuID);
        }
        var deviceID = manuData.getUint32(2, true);
        var flags = manuData.getUint16(6, true);
        return {
            batteryVoltage: 0,
            deviceID: deviceID,
            flags: this.parseFlags(flags),
            connectionID: connectionID,
            rssi: rssi,
            slug: iotile_common_1.deviceIDToSlug(deviceID)
        };
    };
    /**
     * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlags object
     */
    IOTileAdvertisementService.prototype.parseFlags = function (flags) {
        return {
            hasData: ((flags & (1 << 0)) !== 0),
            lowVoltage: ((flags & (1 << 1)) !== 0),
            otherConnected: ((flags & (1 << 2)) !== 0),
            robustReports: ((flags & (1 << 3)) !== 0),
            fastWrites: ((flags & (1 << 4)) !== 0)
        };
    };
    return IOTileAdvertisementService;
}());
exports.IOTileAdvertisementService = IOTileAdvertisementService;
//# sourceMappingURL=iotile-advert-serv.js.map