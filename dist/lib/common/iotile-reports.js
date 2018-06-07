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
///<reference path="../../typings/cordova_plugins.d.ts"/>
///<reference path="../../typings/iotile-common.d.ts"/>
var iotile_common_1 = require("iotile-common");
var RawReading = /** @class */ (function () {
    function RawReading(stream, value, timestamp, timebase, id) {
        this._stream = stream;
        this._value = value;
        this._raw_timestamp = timestamp;
        this._time = new Date(timebase.valueOf() + timestamp * 1000);
        if (id !== undefined) {
            this._id = id;
        }
        else {
            this._id = 0;
        }
    }
    Object.defineProperty(RawReading.prototype, "timestamp", {
        get: function () {
            return this._raw_timestamp;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RawReading.prototype, "value", {
        get: function () {
            return this._value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RawReading.prototype, "stream", {
        get: function () {
            return this._stream;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RawReading.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RawReading.prototype, "time", {
        get: function () {
            return this._time;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RawReading.prototype, "variable", {
        get: function () {
            return iotile_common_1.numberToHexString(this.stream, 4);
        },
        enumerable: true,
        configurable: true
    });
    return RawReading;
}());
exports.RawReading = RawReading;
var IOTileReport = /** @class */ (function () {
    function IOTileReport() {
    }
    return IOTileReport;
}());
exports.IOTileReport = IOTileReport;
var IndividualReport = /** @class */ (function (_super) {
    __extends(IndividualReport, _super);
    function IndividualReport(uuid, sentTime, reading) {
        var _this = _super.call(this) || this;
        _this._uuid = uuid;
        _this._reading = reading;
        _this._sentTimestamp = sentTime;
        return _this;
    }
    /**
     * Update the IndividualReport using formatting data from the cloud to be able to show
     * accurate realtime data about the device stream.
     *
     * @param fmt: a raw_value_format code from the cloud that indicates what format
     * the binary device data should be interpreted as.
     */
    IndividualReport.prototype.decodeUsingFormat = function (fmt) {
        if (fmt == '<l') {
            var signedValue = void 0;
            var rawData = iotile_common_1.packArrayBuffer('L', this._reading.value);
            signedValue = iotile_common_1.unpackArrayBuffer('l', rawData)[0];
            this._reading = new RawReading(this._reading.stream, signedValue, this._reading.timestamp, this._reading.time, this._reading.id);
        }
    };
    Object.defineProperty(IndividualReport.prototype, "deviceID", {
        get: function () {
            return this._uuid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IndividualReport.prototype, "reading", {
        get: function () {
            return this._reading;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IndividualReport.prototype, "sentTimestamp", {
        get: function () {
            return this._sentTimestamp;
        },
        enumerable: true,
        configurable: true
    });
    return IndividualReport;
}(IOTileReport));
exports.IndividualReport = IndividualReport;
var REPORT_HEADER_SIZE = 20;
exports.USER_REPORT_STREAMER = 0;
exports.SYSTEM_REPORT_STREAMER = 1;
exports.COMBINED_REPORT_STREAMER = 0xFF;
var SignedReportSelectors;
(function (SignedReportSelectors) {
    SignedReportSelectors[SignedReportSelectors["UserOutputs"] = 22527] = "UserOutputs";
    SignedReportSelectors[SignedReportSelectors["SystemOutputs"] = 24575] = "SystemOutputs";
    SignedReportSelectors[SignedReportSelectors["CombinedOutputs"] = 55295] = "CombinedOutputs";
})(SignedReportSelectors = exports.SignedReportSelectors || (exports.SignedReportSelectors = {}));
var SignatureFlags;
(function (SignatureFlags) {
    SignatureFlags[SignatureFlags["HashOnly"] = 0] = "HashOnly";
    SignatureFlags[SignatureFlags["SignedUserKey"] = 1] = "SignedUserKey";
    SignatureFlags[SignatureFlags["SignedDeviceKey"] = 2] = "SignedDeviceKey";
})(SignatureFlags = exports.SignatureFlags || (exports.SignatureFlags = {}));
var SignatureStatus;
(function (SignatureStatus) {
    SignatureStatus[SignatureStatus["Valid"] = 0] = "Valid";
    SignatureStatus[SignatureStatus["Invalid"] = 1] = "Invalid";
    SignatureStatus[SignatureStatus["Unknown"] = 2] = "Unknown";
})(SignatureStatus = exports.SignatureStatus || (exports.SignatureStatus = {}));
var SignedListReport = /** @class */ (function (_super) {
    __extends(SignedListReport, _super);
    function SignedListReport(uuid, streamer, readings, rawData, receivedTime) {
        var _this = _super.call(this) || this;
        _this._uuid = uuid;
        _this._readings = readings;
        _this._rawData = rawData;
        _this._streamer = streamer;
        _this._receivedTime = receivedTime;
        //Calculate lowest and highest ids based on decoded readings
        if (readings.length == 0) {
            _this._lowestID = 0;
            _this._highestID = 0;
        }
        else {
            //Initialize with the first reading to avoid needing to use sentinal values
            _this._lowestID = readings[0].id;
            _this._highestID = readings[0].id;
            for (var i = 1; i < readings.length; ++i) {
                var id = readings[i].id;
                if (id < _this._lowestID) {
                    _this._lowestID = id;
                }
                if (id > _this._highestID) {
                    _this._highestID = id;
                }
            }
        }
        _this._header = _this.extractHeader();
        _this._valid = _this.validateSignature();
        return _this;
    }
    Object.defineProperty(SignedListReport.prototype, "deviceID", {
        get: function () {
            return this._uuid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "readings", {
        get: function () {
            return this._readings;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "validity", {
        get: function () {
            return this._valid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "rawData", {
        get: function () {
            return this._rawData;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "streamer", {
        get: function () {
            return this._streamer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "receivedTime", {
        get: function () {
            return this._receivedTime;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "readingIDRange", {
        get: function () {
            return [this._lowestID, this._highestID];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SignedListReport.prototype, "header", {
        get: function () {
            return this._header;
        },
        enumerable: true,
        configurable: true
    });
    SignedListReport.prototype.extractHeader = function () {
        var data = this._rawData;
        if (data.byteLength < REPORT_HEADER_SIZE) {
            throw new iotile_common_1.ArgumentError("Invalid report that was not long enough to contain a valid header");
        }
        var header = iotile_common_1.unpackArrayBuffer('BBHLLLBBH', data.slice(0, REPORT_HEADER_SIZE));
        return {
            format: header[0],
            lengthLow: header[1],
            lengthHigh: header[2],
            uuid: header[3],
            reportID: header[4],
            sentTime: header[5],
            signatureFlags: header[6],
            streamer: header[7],
            selector: header[8]
        };
    };
    SignedListReport.prototype.validateSignature = function () {
        var calc = new iotile_common_1.SHA256Calculator();
        if (this._header.signatureFlags != SignatureFlags.HashOnly) {
            return SignatureStatus.Unknown;
        }
        var signedData = this._rawData.slice(0, this._rawData.byteLength - 16);
        var embeddedSig = this._rawData.slice(this._rawData.byteLength - 16);
        var signature = calc.calculateSignature(signedData);
        if (calc.compareSignatures(embeddedSig, signature)) {
            return SignatureStatus.Valid;
        }
        return SignatureStatus.Invalid;
    };
    return SignedListReport;
}(IOTileReport));
exports.SignedListReport = SignedListReport;
//# sourceMappingURL=iotile-reports.js.map