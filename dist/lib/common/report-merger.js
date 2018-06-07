"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_reports_1 = require("./iotile-reports");
var iotile_common_1 = require("iotile-common");
/**
 * A class that can merge two signed list reports into one.  This
 * is used to create a combined report from a separate user and system
 * report before uploading to iotile.cloud.  This class attempts to
 * check as best it can that the reports are valid and both a user
 * and system report before merging them.
 */
var SignedListReportMerger = /** @class */ (function () {
    function SignedListReportMerger() {
    }
    SignedListReportMerger.prototype.mergeReports = function (user, system) {
        this.checkReportsForMerging(user, system);
        var mergedLength = 20 + (16 * (user.readings.length + system.readings.length)) + 24;
        var merged = new ArrayBuffer(mergedLength);
        this.insertMergedHeader(merged, user, system);
        var readings = this.mergeReadings(merged, user, system);
        this.insertMergedFooter(merged, readings.lowestID, readings.highestID);
        return new iotile_reports_1.SignedListReport(system.header.uuid, iotile_reports_1.COMBINED_REPORT_STREAMER, readings.readings, merged, system.receivedTime);
    };
    SignedListReportMerger.prototype.checkReportsForMerging = function (user, system) {
        var userHeader = user.header;
        var systemHeader = system.header;
        if (user.validity != iotile_reports_1.SignatureStatus.Valid || system.validity != iotile_reports_1.SignatureStatus.Valid) {
            throw new iotile_common_1.ArgumentError("You can only merge reports that have valid signatures");
        }
        if (userHeader.uuid != systemHeader.uuid) {
            throw new iotile_common_1.ArgumentError("Reports did not come from the same device");
        }
        if (userHeader.selector != iotile_reports_1.SignedReportSelectors.UserOutputs) {
            throw new iotile_common_1.ArgumentError("User report did not select user readings");
        }
        if (systemHeader.selector != iotile_reports_1.SignedReportSelectors.SystemOutputs) {
            throw new iotile_common_1.ArgumentError("System report did not select system readings");
        }
        if (systemHeader.sentTime < userHeader.sentTime) {
            throw new iotile_common_1.ArgumentError("System report was sent before user report");
        }
        if (systemHeader.reportID < userHeader.reportID) {
            throw new iotile_common_1.ArgumentError("System report ID was lower than user report");
        }
    };
    SignedListReportMerger.prototype.insertMergedHeader = function (merged, user, system) {
        var userHeader = user.header;
        var systemHeader = system.header;
        /**
         * Generating this header is a bit of delecate operation since we want to ensure the same
         * invariants that are guaranteed by the devices themselves when they generate reports.
         *
         * 1. The report ID is higher than all readings IDs (so use the system id)
         * 2. The report sent time is higher than all of the reading sent times
         * 3. The selector accurately describes the contents of the report
         * 4. The streamer must be a special virtual streamer number (255 in this case) that we handle when
         *    we acknowledge back to the device and ack both system and user streamers.
         */
        var header = iotile_common_1.packArrayBuffer('BBHLLLBBH', 1, merged.byteLength & 0xFF, merged.byteLength >> 8, userHeader.uuid, systemHeader.reportID, systemHeader.sentTime, 0, iotile_reports_1.COMBINED_REPORT_STREAMER, iotile_reports_1.SignedReportSelectors.CombinedOutputs);
        iotile_common_1.copyArrayBuffer(merged, header, 0, 0, header.byteLength);
    };
    /**
     * Merge two reports together, keeping all of their readings in order.
     */
    SignedListReportMerger.prototype.mergeReadings = function (merged, user, system) {
        var userI = 0;
        var systemI = 0;
        var totalReadings = user.readings.length + system.readings.length;
        var insertI = 0;
        var lowest = 0xFFFFFFFF;
        var highest = 0;
        var readings = [];
        var now = new Date();
        var onTime = new Date(now.valueOf() - (system.header.sentTime * 1000));
        while (insertI < totalReadings) {
            var pickSystem = this.pickNextReading(user, userI, system, systemI);
            var reading = void 0;
            if (pickSystem) {
                reading = system.readings[systemI++];
            }
            else {
                reading = user.readings[userI++];
            }
            if (reading.id != 0 && reading.id < lowest) {
                lowest = reading.id;
            }
            if (reading.id != 0 && reading.id > highest) {
                highest = reading.id;
            }
            readings.push(new iotile_reports_1.RawReading(reading.stream, reading.value, reading.timestamp, onTime, reading.id));
            this.insertReading(merged, (20 + 16 * insertI), reading.timestamp, reading.stream, reading.value, reading.id);
            insertI += 1;
        }
        return {
            lowestID: lowest,
            highestID: highest,
            readings: readings
        };
    };
    SignedListReportMerger.prototype.pickNextReading = function (user, userI, system, systemI) {
        if (userI == user.readings.length && systemI == system.readings.length) {
            throw new iotile_common_1.ArgumentError("Both reports have been exhausted, no more readings to pick");
        }
        if (userI == user.readings.length) {
            return true;
        }
        else if (systemI == system.readings.length) {
            return false;
        }
        var userReading = user.readings[userI];
        var systemReading = system.readings[systemI];
        if (userReading.id < systemReading.id) {
            return false;
        }
        else {
            return true;
        }
    };
    SignedListReportMerger.prototype.insertReading = function (merged, offset, timestamp, stream, value, readingID) {
        var reading = iotile_common_1.packArrayBuffer('HHLLL', stream, 0, readingID, timestamp, value);
        iotile_common_1.copyArrayBuffer(merged, reading, 0, offset, reading.byteLength);
    };
    SignedListReportMerger.prototype.insertMergedFooter = function (merged, lowest, highest) {
        var footerStart = merged.byteLength - 24;
        var idRange = iotile_common_1.packArrayBuffer("LL", lowest, highest);
        iotile_common_1.copyArrayBuffer(merged, idRange, 0, footerStart, idRange.byteLength);
        //Now insert a proper checksum for the merged report
        var calc = new iotile_common_1.SHA256Calculator();
        var signedData = merged.slice(0, merged.byteLength - 16);
        var signature = calc.calculateSignature(signedData);
        iotile_common_1.copyArrayBuffer(merged, signature, 0, merged.byteLength - 16, 16);
    };
    return SignedListReportMerger;
}());
exports.SignedListReportMerger = SignedListReportMerger;
//# sourceMappingURL=report-merger.js.map