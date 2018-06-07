"use strict";
/**
 * Helper functions for creating and testing binary reports received from IOTile Devices
 */
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_common_1 = require("iotile-common");
var Utilities = require("iotile-common");
var iotile_device_1 = require("../../iotile-device");
function createIndividualReport(uuid, stream, value, sentTime, rawTime) {
    //The second byte parameter is reserved and set to zero
    return Utilities.packArrayBuffer('BBHLLLL', 0, 0, Utilities.mapStreamName(stream), uuid, sentTime, rawTime, value);
}
exports.createIndividualReport = createIndividualReport;
function expectIndividual(inReport, uuid, stream, value, sentTime, rawTime) {
    expect(inReport.constructor.name).toBe('IndividualReport');
    var report = inReport;
    expect(report.deviceID).toBe(uuid);
    if (uuid !== report.deviceID) {
        debugger;
    }
    expect(report.reading.stream).toBe(Utilities.mapStreamName(stream));
    expect(report.reading.value).toBe(value);
    expect(report.reading.timestamp).toBe(rawTime);
    expect(report.sentTimestamp).toBe(sentTime);
}
exports.expectIndividual = expectIndividual;
function expectSequential(inReport, uuid, stream, count, streamer) {
    expect(inReport.constructor.name).toBe('SignedListReport');
    var report = inReport;
    var header = report.header;
    expect(report.validity).toEqual(iotile_device_1.SignatureStatus.Valid);
    expect(header.uuid).toEqual(uuid);
    expect(header.streamer).toEqual(streamer);
    expect(report.readings.length).toEqual(count);
    for (var i = 0; i < count; ++i) {
        var reading = report.readings[i];
        expect(reading.id).toEqual(i + 1);
        expect(reading.value).toEqual(i);
        expect(reading.timestamp).toEqual(i);
        expect(reading.stream).toEqual(Utilities.mapStreamName(stream));
    }
}
exports.expectSequential = expectSequential;
function feedInPieces(report, handler, size) {
    for (var i = 0; i < report.byteLength; i += size) {
        handler(report.slice(i, i + size));
    }
}
exports.feedInPieces = feedInPieces;
function createReading(stream, timestamp, value, id) {
    return {
        'stream': Utilities.mapStreamName(stream),
        'timestamp': timestamp,
        'value': value,
        'id': id
    };
}
exports.createReading = createReading;
function createSequentialReport(uuid, stream, count, streamer, start) {
    var readings = [];
    if (start == null) {
        start = 0;
    }
    for (var i = start; i < (start + count); ++i) {
        readings.push(createReading(stream, i, i, i + 1));
    }
    return createHashListReport(uuid, count + 1, streamer, count + start, readings);
}
exports.createSequentialReport = createSequentialReport;
function createHashListReport(uuid, reportID, streamer, sentTime, readings, selector) {
    var length = 20 + 24 + readings.length * 16;
    var report = new ArrayBuffer(length);
    var lowestID = 0xFFFFFFFF;
    var highestID = 0;
    //If no explicit selector is given, choose one based on what streamer index was given
    if (selector == null) {
        if (streamer == 0) {
            selector = iotile_device_1.SignedReportSelectors.UserOutputs;
        }
        else if (streamer == 1) {
            selector = iotile_device_1.SignedReportSelectors.SystemOutputs;
        }
        else {
            throw new iotile_common_1.ArgumentError("No selector specified and a streamer was given that was not 'well-known'");
        }
    }
    var header = Utilities.packArrayBuffer('BBHLLLBBH', 1, length & 0xFF, length >> 8, uuid, reportID, sentTime, 0, streamer, selector);
    Utilities.copyArrayBuffer(report, header, 0, 0, header.byteLength);
    for (var i = 0; i < readings.length; ++i) {
        var data = readings[i];
        var reading = Utilities.packArrayBuffer('HHLLL', data.stream, 0, data.id, data.timestamp, data.value);
        Utilities.copyArrayBuffer(report, reading, 0, (20 + 16 * i), reading.byteLength);
        if (data.id < lowestID) {
            lowestID = data.id;
        }
        if (data.id > highestID) {
            highestID = data.id;
        }
    }
    var footer = Utilities.packArrayBuffer('LLLLLL', lowestID, highestID, 0, 0, 0, 0);
    Utilities.copyArrayBuffer(report, footer, 0, 20 + (readings.length * 16), footer.byteLength);
    //Calculate and paste in the correct signature
    var calc = new Utilities.SHA256Calculator();
    var sig = calc.calculateSignature(report.slice(0, report.byteLength - 16));
    Utilities.copyArrayBuffer(report, sig, 0, report.byteLength - 16, 16);
    return report;
}
exports.createHashListReport = createHashListReport;
//# sourceMappingURL=report-creation.util.js.map