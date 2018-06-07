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
var ring_buffer_1 = require("../common/ring-buffer");
var Errors = require("../common/error-space");
var iotile_reports_1 = require("../common/iotile-reports");
var iotile_common_1 = require("iotile-common");
var ReceiveStatus;
(function (ReceiveStatus) {
    ReceiveStatus[ReceiveStatus["Idle"] = 0] = "Idle";
    ReceiveStatus[ReceiveStatus["InProgress"] = 1] = "InProgress";
})(ReceiveStatus = exports.ReceiveStatus || (exports.ReceiveStatus = {}));
/**
 * When receiving long reports these events can be queried from the report parser
 * in order to update the user on progress.
 */
var ReportParserEvent = /** @class */ (function () {
    function ReportParserEvent(name, finishedPercentage, reportIndex) {
        this.name = name;
        this.finishedPercentage = finishedPercentage;
        this.reportIndex = reportIndex;
    }
    return ReportParserEvent;
}());
exports.ReportParserEvent = ReportParserEvent;
var ReportStartedEvent = /** @class */ (function (_super) {
    __extends(ReportStartedEvent, _super);
    function ReportStartedEvent(totalSize, reportIndex) {
        var _this = _super.call(this, 'ReportStartedEvent', 0, reportIndex) || this;
        _this.totalSize = totalSize;
        return _this;
    }
    return ReportStartedEvent;
}(ReportParserEvent));
exports.ReportStartedEvent = ReportStartedEvent;
var ReportStalledEvent = /** @class */ (function (_super) {
    __extends(ReportStalledEvent, _super);
    function ReportStalledEvent(finishedPercentage, reportIndex) {
        return _super.call(this, 'ReportStalledEvent', finishedPercentage, reportIndex) || this;
    }
    return ReportStalledEvent;
}(ReportParserEvent));
exports.ReportStalledEvent = ReportStalledEvent;
var ReportProgressEvent = /** @class */ (function (_super) {
    __extends(ReportProgressEvent, _super);
    function ReportProgressEvent(finishedPercentage, reportIndex) {
        return _super.call(this, 'ReportProgressEvent', finishedPercentage, reportIndex) || this;
    }
    return ReportProgressEvent;
}(ReportParserEvent));
exports.ReportProgressEvent = ReportProgressEvent;
var ReportFinishedEvent = /** @class */ (function (_super) {
    __extends(ReportFinishedEvent, _super);
    function ReportFinishedEvent(reportIndex) {
        return _super.call(this, 'ReportFinishedEvent', 100, reportIndex) || this;
    }
    return ReportFinishedEvent;
}(ReportParserEvent));
exports.ReportFinishedEvent = ReportFinishedEvent;
/**
 * @ngdoc object
 * @name iotile.device.object:ReportParser
 *
 * @description
 *
 * A stream based report parser that knows how to construct IOTileReport
 * objects from data streamed from an IOTile Device.  The ReportParser
 * has only 2 public methods (and several getters).  You can call pushData
 * to send additional data received from an IOTileDevice to the ReportParser.
 *
 * The ReportParser will automatically try to see how many reports it can build
 * using all of the data it currently has and return a list of those reports to
 * you.
 *
 * If any error occurs during parsing, the ReportParser enters a broken state
 * and will not process any further data until you call the reset() function.
 *
 * ReportParser is built on top of a fixed size RingBuffer that it uses for
 * efficiently handling report data.
 *
 * See {@link Utilities.type:RingBuffer Utilities.RingBuffer}
 */
var ReportParser = /** @class */ (function () {
    function ReportParser(ringBufferSize, expand) {
        if (expand === void 0) { expand = false; }
        this.ringBuffer = new ring_buffer_1.RingBuffer(ringBufferSize, expand);
        this.broken = false;
        this._receiveState = ReceiveStatus.Idle;
        this._inProgressReceived = 0;
        this._inProgressTotal = 0;
        this._lastProgressReport = 0;
        this._lastEvent = null;
        this._lastUpdateTime = null;
        this._reportsReceived = 0;
        this._receivedTime = null;
        this._lastUpdateTime = null;
        this._progressReportInterval = 5;
    }
    Object.defineProperty(ReportParser.prototype, "state", {
        get: function () {
            return this._receiveState;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ReportParser.prototype, "inProgressReceived", {
        get: function () {
            return this._inProgressReceived;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ReportParser.prototype, "inProgressTotal", {
        get: function () {
            return this._inProgressTotal;
        },
        enumerable: true,
        configurable: true
    });
    ReportParser.prototype.stop = function () {
        this.broken = true;
        //Maintain the contract that when we send a start report event, we always send
        //a stop report event after it.
        if (this._receiveState == ReceiveStatus.InProgress) {
            this.updateStatus(false, 0, 0);
        }
    };
    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#pushData
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * Add new data received from a device to the RingBuffer and try to parse reports out of it
     *
     * @returns {Array<IOTileReport>} A list of all of the reports that could be parsed out
     *                                of the currently received data.  If no reports could
     *                                be parsed, returns an empty list.
     * @throws {Errors.ReportParsingError} If there is an unrecoverable error processing reports.
     * @throws {Errors.ReportParsingStoppedError} If there was a previous report parsing error and
     *                                            processing is therefore stopped.
     * @throws {Errors.InsufficientSpaceError} If there is not enough space in the internal ring buffer
     *                                         to hold the data for processing.
     */
    ReportParser.prototype.pushData = function (chunk) {
        if (this.broken) {
            throw new Errors.ReportParsingStoppedError('attempting to push data to a stopped report parser');
        }
        this.ringBuffer.push(chunk);
        return this.tryParseReports();
    };
    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#reset
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * Reset the internal state of the report parser back to a clean slate.
     * Should be called every time we connect to a new device.
     */
    ReportParser.prototype.reset = function () {
        this.ringBuffer.reset();
        this.broken = false;
        this._receiveState = ReceiveStatus.Idle;
        this._inProgressReceived = 0;
        this._inProgressTotal = 0;
        this._lastProgressReport = 0;
        this._lastEvent = null;
        this._lastUpdateTime = null;
        this._reportsReceived = 0;
    };
    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#popLastEvent
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * If there has been a change in reportParser's progress getting a report
     * since the last time we called popLastEvent(), return that event, otherwise
     * return null;
     *
     * This function can be used to get progress information while receiving
     * long reports.  There are three kinds of events you can get:
     * - ReportStartedEvent: when a new report header has been received;
     * - ReportProgressEvent: sent every time X percent (currently 5%) of the report
     *   has been received.
     * - ReportFinishedEvent: sent whenever a long report is fully receiving.
     * @returns {ReportParserEvent} The last event that happened or null if nothing has
     *                              happened since the last call to this function.
     */
    ReportParser.prototype.popLastEvent = function () {
        var event = this._lastEvent;
        // if we're mid-report and it's been more than a second since the last event was logged, we've stalled
        if (this._receivedTime && this._lastUpdateTime && this._lastEvent
            && (this._lastUpdateTime.getSeconds() + 1 < (new Date()).getSeconds())) {
            this._lastEvent = new ReportStalledEvent(this._lastEvent.finishedPercentage, this._lastEvent.reportIndex);
        }
        else {
            this._lastEvent = null;
        }
        return event;
    };
    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#tryParseReports
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * Attempt to process as many reports as possible from the current ring buffer contents
     *
     * @returns {Array<IOTileReport>} A list of all of the reports that could be parsed out
     *                                of the currently received data.  If no reports could
     *                                be parsed, returns an empty list.
     * @throws {Errors.ReportParsingError} If there is an unrecoverable error processing reports.
     * @throws {Errors.ReportParsingStoppedError} If there was a previous report parsing error and
     *                                            processing is therefore stopped.
     */
    ReportParser.prototype.tryParseReports = function () {
        if (this.broken) {
            throw new Errors.ReportParsingStoppedError('attempting to parse reports with a stopped parser');
        }
        var reports = [];
        try {
            while (true) {
                var report = this.tryParseReport();
                reports.push(report);
            }
        }
        catch (err) {
            if (err.name == 'RingBufferEmptyError') {
                //This is okay, it just means we have no more reports to parse
            }
            else {
                this.broken = true;
                throw new Errors.ReportParsingError(err.message);
            }
        }
        return reports;
    };
    /**
     * Try to parse a single report from the report ring buffer.
     * We get one single byte to figure out the type and then, optionally
     * read the header and finally read the entire report.
     */
    ReportParser.prototype.tryParseReport = function () {
        var val = this.ringBuffer.peekAs('B');
        var reportType = val[0];
        switch (reportType) {
            case 0:
                return this.tryParseIndividualReport();
                break;
            case 1:
                return this.tryParseListReport();
                break;
            default:
                throw new Errors.ReportParsingError('Unknown report format received: ' + reportType);
        }
    };
    /**
     * Individual reports have a fixed size format of 20 bytes
     * with a fixed, known structure.
     */
    ReportParser.prototype.tryParseIndividualReport = function () {
        var report = this.ringBuffer.popAs("BBHLLLL");
        var format = report[0];
        var stream = report[2];
        var uuid = report[3];
        var sentTimestamp = report[4];
        var readingTimestamp = report[5];
        var readingValue = report[6];
        var now = new Date();
        var onTime = new Date(now.valueOf() - (sentTimestamp * 1000));
        var reading = new iotile_reports_1.RawReading(stream, readingValue, readingTimestamp, onTime);
        return new iotile_reports_1.IndividualReport(uuid, sentTimestamp, reading);
    };
    /**
     * List reports have a variable size with a fixed size
     * header that contains the size of the total report.
     *
     * This function will also update the reportParser object's current
     * report progress status so that people who care can be informed
     * about progress receiving this report.
     *
     * NB
     * We need to keep track of the time when we first start receiving information
     * from a report because that the time the report was sent.  So we keep an
     * internal state variable _receivedTime that we set to the current time when
     * we start receiving a report and to null when we're done processing a report.
     */
    ReportParser.prototype.tryParseListReport = function () {
        var header = this.ringBuffer.peekAs("BBHLLLBBH");
        var format = header[0];
        var totalLength = (header[1] | (header[2] << 8));
        var uuid = header[3];
        var reportID = header[4];
        var sentTimestamp = header[5];
        var signatureFlags = header[6];
        var originStreamer = header[7];
        var streamerSelector = header[8];
        //If we got this far, then we're in the process of receiving a signed report
        //Only update our status if we did not receive the entire report in one shot
        if (totalLength > this.ringBuffer.count) {
            this.updateStatus(true, totalLength, this.ringBuffer.count);
        }
        //If this is the first bit of the report, we need to save off the timestamp for
        //later so we know when it started being sent
        if (this._receivedTime == null) {
            this._receivedTime = new Date();
        }
        var totalReport = this.ringBuffer.pop(totalLength);
        var onTime = new Date(this._receivedTime.valueOf() - (sentTimestamp * 1000));
        this.updateStatus(false, 0, 0);
        //Now decode and parse the actual readings in the report
        var allReadingsData = totalReport.slice(20, totalLength - 24);
        var readings = [];
        for (var i = 0; i < allReadingsData.byteLength; i += 16) {
            var readingData = allReadingsData.slice(i, i + 16);
            var reading = iotile_common_1.unpackArrayBuffer("HHLLL", readingData);
            var stream = reading[0]; //reading[1] is reserved
            var readingID = reading[2];
            var readingTimestamp = reading[3];
            var readingValue = reading[4];
            var parsedReading = new iotile_reports_1.RawReading(stream, readingValue, readingTimestamp, onTime, readingID);
            readings.push(parsedReading);
        }
        var rep = new iotile_reports_1.SignedListReport(uuid, originStreamer, readings, totalReport, this._receivedTime);
        this._reportsReceived += 1;
        //Clear the received time so that when the next report comes in we trigger ourselves to stamp it again
        //see the lines at the beginning of this function.
        this._receivedTime = null;
        return rep;
    };
    /**
     * Update our internal status information so that we can inform the user about progress
     * receiving long reports.  We only send events when a report is not received in a single
     * shot.  So if we are just dumped a complete report in a single pushData() call, then
     * no progress will be reported.
     */
    ReportParser.prototype.updateStatus = function (inProgress, totalSize, receivedSize) {
        if (inProgress && this._receiveState != ReceiveStatus.InProgress && receivedSize < totalSize) {
            //If we are just starting a report (and have not received the entire thing)
            this._lastEvent = new ReportStartedEvent(totalSize, this._reportsReceived);
        }
        else if (!inProgress && this._receiveState == ReceiveStatus.InProgress) {
            //If we finished a report, send a finished event
            this._lastEvent = new ReportFinishedEvent(this._reportsReceived);
        }
        else if (inProgress && this._inProgressReceived != receivedSize) {
            //See if we have received enough data to qualify for producing another progress event
            var lastPercentage = this._lastProgressReport / this._inProgressTotal * 100;
            var currentPercentage = receivedSize / this._inProgressTotal * 100;
            var lastProgress = Math.floor(lastPercentage / this._progressReportInterval);
            var currentProgress = Math.floor(currentPercentage / this._progressReportInterval);
            if (currentProgress != lastProgress) {
                this._lastEvent = new ReportProgressEvent(currentProgress * this._progressReportInterval, this._reportsReceived);
                this._lastProgressReport = receivedSize;
            }
        }
        else if (inProgress && this._receiveState != ReceiveStatus.InProgress && receivedSize == totalSize) {
            //If we received the entire report in one shot, don't broadcast progress updates
        }
        this._lastUpdateTime = new Date();
        if (inProgress) {
            this._receiveState = ReceiveStatus.InProgress;
            this._inProgressTotal = totalSize;
            this._inProgressReceived = receivedSize;
        }
        else {
            this._receiveState = ReceiveStatus.Idle;
            this._inProgressTotal = 0;
            this._inProgressReceived = 0;
            this._lastProgressReport = 0;
        }
    };
    return ReportParser;
}());
exports.ReportParser = ReportParser;
//# sourceMappingURL=iotile-report-parser.js.map