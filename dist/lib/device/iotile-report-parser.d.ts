export declare enum ReceiveStatus {
    Idle = 0,
    InProgress = 1,
}
/**
 * When receiving long reports these events can be queried from the report parser
 * in order to update the user on progress.
 */
export declare class ReportParserEvent {
    readonly name: string;
    readonly finishedPercentage: number;
    readonly reportIndex: number;
    constructor(name: string, finishedPercentage: number, reportIndex: number);
}
export declare class ReportStartedEvent extends ReportParserEvent {
    readonly totalSize: number;
    constructor(totalSize: number, reportIndex: number);
}
export declare class ReportStalledEvent extends ReportParserEvent {
    constructor(finishedPercentage: number, reportIndex: number);
}
export declare class ReportProgressEvent extends ReportParserEvent {
    constructor(finishedPercentage: number, reportIndex: number);
}
export declare class ReportFinishedEvent extends ReportParserEvent {
    constructor(reportIndex: number);
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
export declare class ReportParser {
    private ringBuffer;
    private broken;
    private _receivedTime;
    private _lastUpdateTime;
    private _receiveState;
    private _inProgressTotal;
    private _inProgressReceived;
    private _lastProgressReport;
    private _lastEvent;
    private _reportsReceived;
    private _progressReportInterval;
    constructor(ringBufferSize: number, expand?: boolean);
    readonly state: ReceiveStatus;
    readonly inProgressReceived: number;
    readonly inProgressTotal: number;
    stop(): void;
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
    pushData(chunk: ArrayBuffer): any[];
    /**
     * @ngdoc method
     * @name iotile.device.object:ReportParser#reset
     * @methodOf iotile.device.object:ReportParser
     *
     * @description
     * Reset the internal state of the report parser back to a clean slate.
     * Should be called every time we connect to a new device.
     */
    reset(): void;
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
    popLastEvent(): ReportParserEvent;
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
    private tryParseReports();
    /**
     * Try to parse a single report from the report ring buffer.
     * We get one single byte to figure out the type and then, optionally
     * read the header and finally read the entire report.
     */
    private tryParseReport();
    /**
     * Individual reports have a fixed size format of 20 bytes
     * with a fixed, known structure.
     */
    private tryParseIndividualReport();
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
    private tryParseListReport();
    /**
     * Update our internal status information so that we can inform the user about progress
     * receiving long reports.  We only send events when a report is not received in a single
     * shot.  So if we are just dumped a complete report in a single pushData() call, then
     * no progress will be reported.
     */
    private updateStatus(inProgress, totalSize, receivedSize);
}
