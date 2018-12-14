import {RingBuffer} from "../common/ring-buffer";
import * as Errors from "../common/error-space";
import {RawReading, IndividualReport, SignedListReport, SignatureStatus, IOTileReport} from "../common/iotile-reports";
import {unpackArrayBuffer} from "@iotile/iotile-common";
import { throws } from "assert";

export enum ReceiveStatus {
    Idle = 0,
    InProgress = 1
}

/**
 * When receiving long reports these events can be queried from the report parser
 * in order to update the user on progress.
 */

export class ReportParserEvent {
    readonly name: string;
    readonly finishedPercentage: number;
    readonly reportIndex: number;

    constructor (name: string, finishedPercentage: number, reportIndex: number) {
        this.name = name;
        this.finishedPercentage = finishedPercentage;
        this.reportIndex = reportIndex;
    }
}

export class ReportStartedEvent extends ReportParserEvent {
    readonly totalSize: number;

    constructor(totalSize: number, reportIndex: number) {
        super('ReportStartedEvent', 0, reportIndex);

        this.totalSize = totalSize;
    }
}

export class ReportStalledEvent extends ReportParserEvent {
    constructor(finishedPercentage: number, reportIndex: number) {
        super('ReportStalledEvent', finishedPercentage, reportIndex);
    }
}

export class ReportProgressEvent extends ReportParserEvent {
    constructor(finishedPercentage: number, reportIndex: number) {
        super('ReportProgressEvent', finishedPercentage, reportIndex);
    }
}

export class ReportFinishedEvent extends ReportParserEvent {
    constructor(reportIndex: number) {
        super('ReportFinishedEvent', 100, reportIndex);
    }
}

export class ReportInvalidEvent extends ReportParserEvent {
    readonly rawData: ArrayBuffer;

    constructor(reportIndex: number, rawData: ArrayBuffer) {
        super('ReportInvalidEvent', 100, reportIndex);

        this.rawData = rawData;
    }
}

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
export class ReportParser {
    private ringBuffer: RingBuffer;
    private broken: boolean;

    private _receivedTime: Date | null;
    private _lastUpdateTime: Date | null;

    private _receiveState: ReceiveStatus;
    private _inProgressTotal: number;
    private _inProgressReceived: number;
    private _lastProgressReport: number;
    private _lastEvent: ReportParserEvent | null;
    private _reportsReceived: number;

    private _progressReportInterval: number;

    constructor(ringBufferSize: number, expand:boolean = false) {
        this.ringBuffer = new RingBuffer(ringBufferSize, expand);
        this.broken = false;
        this._receiveState = ReceiveStatus.Idle;
        this._inProgressReceived = 0;
        this._inProgressTotal = 0;
        this._lastProgressReport = 0;
        this._reportsReceived = 0;
        this._lastEvent = null;
        this._lastUpdateTime = null;
        this._receivedTime = null;
        this._lastUpdateTime = null;
        this._progressReportInterval = 5;
    }

    public get state() {
        return this._receiveState;
    }

    public get inProgressReceived() {
        return this._inProgressReceived;
    }

    public get inProgressTotal() {
        return this._inProgressTotal;
    }

    public stop() {
        this.broken = true;

        //Maintain the contract that when we send a start report event, we always send
        //a stop report event after it.
        if (this._receiveState == ReceiveStatus.InProgress) {
            this.updateStatus(false, 0, 0);
        }
    }

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

    public pushData(chunk: ArrayBuffer | SharedArrayBuffer) {
        if (this.broken) {
            throw new Errors.ReportParsingStoppedError('attempting to push data to a stopped report parser');
        }

        this.ringBuffer.push(chunk);
        return this.tryParseReports();
    }

    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#reset
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * Reset the internal state of the report parser back to a clean slate.
     * Should be called every time we connect to a new device.
     */
    public reset() {
        this.ringBuffer.reset();
        this.broken = false;
        this._receiveState = ReceiveStatus.Idle;
        this._inProgressReceived = 0;
        this._inProgressTotal = 0;
        this._lastProgressReport = 0;
        this._reportsReceived = 0;
        this._lastEvent = null;
        this._lastUpdateTime = null;
    }

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
    public popLastEvent() {
        let event = this._lastEvent;

        // if we're mid-report and it's been more than a second since the last event was logged, we've stalled
        if (this._receivedTime && this._lastUpdateTime && this._lastEvent
            && (this._lastUpdateTime.getSeconds() + 1 < (new Date()).getSeconds())){
            this._lastEvent = new ReportStalledEvent(this._lastEvent.finishedPercentage, this._lastEvent.reportIndex);
        } else {
            this._lastEvent = null;
        } 

        return event;
    }

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
    private tryParseReports() {
        if (this.broken) {
            throw new Errors.ReportParsingStoppedError('attempting to parse reports with a stopped parser');
        }

        let reports: any[] = [];

        try {
            while (true) {
                let report = this.tryParseReport();

                if (report != null) {
                    reports.push(report);
                }
            }
        } catch (err) {
            if (err.name == 'RingBufferEmptyError') {
                //This is okay, it just means we have no more reports to parse
            } else {
                this.broken = true;
                throw new Errors.ReportParsingError(err.message);
            }
        }

        return reports;
    }

    /**
     * Try to parse a single report from the report ring buffer.
     * We get one single byte to figure out the type and then, optionally
     * read the header and finally read the entire report.
     */
    private tryParseReport() {
        let val = this.ringBuffer.peekAs('B');
        let reportType = val[0];

        switch(reportType) {
            case 0:
            return this.tryParseIndividualReport();

            case 1:
            return this.tryParseListReport();

            default:
            throw new Errors.ReportParsingError('Unknown report format received: ' + reportType);
        }
    }

    /**
     * Individual reports have a fixed size format of 20 bytes
     * with a fixed, known structure.
     */
    private tryParseIndividualReport() {
        let report = this.ringBuffer.popAs("BBHLLLL");
        let format = report[0];
        let stream = report[2];
        let uuid = report[3];
        let sentTimestamp = report[4];
        let readingTimestamp = report[5];
        let readingValue = report[6];
        let now = new Date();
        let onTime = new Date(now.valueOf() - (sentTimestamp*1000));

        let reading = new RawReading(stream, readingValue, readingTimestamp, onTime);
        return new IndividualReport(uuid, sentTimestamp, reading);
    }

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
    private tryParseListReport(): (IOTileReport | null) {
        let header = this.ringBuffer.peekAs("BBHLLLBBH");
        let totalLength = (header[1] | (header[2] << 8));
        let uuid = header[3];
        let originStreamer = header[7];

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

        let totalReport = this.ringBuffer.pop(totalLength);
        this.updateStatus(false, 0, 0);

        let report: SignedListReport | null = new SignedListReport(uuid, originStreamer, totalReport, this._receivedTime);
        
        /**
         * Clear the received time so that when the next report comes in we trigger ourselves to stamp it again
         * see the lines at the beginning of this function.
         */
        this._receivedTime = null;

        /**
         * If the report has a corrupt signature, do not return it since we know that it is 
         * not recoverable.  We update the lastEvent so that people calling popLastEvent
         * know that they should send an Invalid report error.
         */
        if (report.validity == SignatureStatus.Invalid) {
            this._lastEvent = new ReportInvalidEvent(report.streamer, totalReport);
            report = null;
        }

        this._reportsReceived += 1;

        return report;    
    }

    /**
     * Update our internal status information so that we can inform the user about progress
     * receiving long reports.  We only send events when a report is not received in a single 
     * shot.  So if we are just dumped a complete report in a single pushData() call, then 
     * no progress will be reported.  
     */
    private updateStatus(inProgress: boolean, totalSize: number, receivedSize: number) {
        if (inProgress && this._receiveState != ReceiveStatus.InProgress && receivedSize < totalSize) {
            //If we are just starting a report (and have not received the entire thing)
            this._lastEvent = new ReportStartedEvent(totalSize, this._reportsReceived);
        } else if (!inProgress && this._receiveState == ReceiveStatus.InProgress) {
            //If we finished a report, send a finished event
            this._lastEvent = new ReportFinishedEvent(this._reportsReceived);
        } else if (inProgress && this._inProgressReceived != receivedSize) {
            //See if we have received enough data to qualify for producing another progress event
            let lastPercentage = this._lastProgressReport / this._inProgressTotal * 100;
            let currentPercentage = receivedSize / this._inProgressTotal * 100;

            let lastProgress = Math.floor(lastPercentage / this._progressReportInterval);
            let currentProgress = Math.floor(currentPercentage / this._progressReportInterval);

            if (currentProgress != lastProgress) {
                this._lastEvent = new ReportProgressEvent(currentProgress*this._progressReportInterval, this._reportsReceived);
                this._lastProgressReport = receivedSize;
            }
        } else if (inProgress && this._receiveState != ReceiveStatus.InProgress && receivedSize == totalSize) {
            //If we received the entire report in one shot, don't broadcast progress updates
        }

        this._lastUpdateTime = new Date();

        if (inProgress) {
            this._receiveState = ReceiveStatus.InProgress;
            this._inProgressTotal = totalSize;
            this._inProgressReceived = receivedSize;
        } else {
            this._receiveState = ReceiveStatus.Idle;
            this._inProgressTotal = 0;
            this._inProgressReceived = 0;
            this._lastProgressReport = 0;
        }
    }
}
