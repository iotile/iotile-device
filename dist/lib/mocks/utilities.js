"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_common_1 = require("iotile-common");
var iotile_reports_1 = require("../common/iotile-reports");
var CryptoJS = require("crypto-js");
function buildIndividualReport(uuid, streamID, value) {
    var reportData = new ArrayBuffer(20);
    var report = new DataView(reportData);
    //Report format
    report.setUint8(0, 0);
    report.setUint16(2, streamID, true);
    report.setUint32(4, uuid, true);
    report.setUint32(8, 0, true);
    report.setUint32(12, 0, true);
    report.setUint32(16, value, true);
    return reportData;
}
exports.buildIndividualReport = buildIndividualReport;
function createHashListReport(uuid, reportID, streamer, sentTime, readings) {
    var length = 20 + 24 + readings.length * 16;
    var selector;
    var report = new Uint8Array(length);
    var lowestID = 0xFFFFFFFF;
    var highestID = 0;
    if (streamer == 0) {
        selector = iotile_reports_1.SignedReportSelectors.UserOutputs;
    }
    else if (streamer == 1) {
        selector = iotile_reports_1.SignedReportSelectors.SystemOutputs;
    }
    else {
        selector = 0xFFFF;
    }
    var header = new Uint8Array(iotile_common_1.packArrayBuffer('BBHLLLBBH', 1, length & 0xFF, length >> 8, uuid, reportID, sentTime, 0, streamer, selector));
    report.set(header, 0);
    for (var i = 0; i < readings.length; ++i) {
        var data = readings[i];
        var reading = new Uint8Array(iotile_common_1.packArrayBuffer('HHLLL', data.stream, 0, data.id, data.timestamp, data.value));
        report.set(reading, 20 + i * 16);
        if (data.id < lowestID) {
            lowestID = data.id;
        }
        if (data.id > highestID) {
            highestID = data.id;
        }
    }
    var footer = new Uint8Array(iotile_common_1.packArrayBuffer('LL', lowestID, highestID));
    report.set(footer, 20 + (readings.length * 16));
    //Now append a correct hash signature
    var signedLength = 20 + (16 * readings.length) + 8;
    var signedData = CryptoJS.lib.WordArray.create(report.slice(0, signedLength));
    var signatureData = CryptoJS.SHA256(signedData).toString(CryptoJS.enc.Base64);
    var signature = iotile_common_1.base64ToArrayBuffer(signatureData);
    report.set(new Uint8Array(signature.slice(0, 16)), signedLength);
    return report.buffer;
}
exports.createHashListReport = createHashListReport;
//# sourceMappingURL=utilities.js.map