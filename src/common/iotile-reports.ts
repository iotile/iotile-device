///<reference path="../../typings/cordova_plugins.d.ts"/>
import {SHA256Calculator, unpackArrayBuffer, packArrayBuffer, ArgumentError, numberToHexString} from "@iotile/iotile-common";
import { ReportReassembler } from "./report-reassembler";
import { catReports } from "../config";

export class RawReading {
    private _raw_timestamp: number;
    private _value: number;
    private _time: Date;
    private _stream: number;
    private _id: number;

    constructor(stream: number, value: number, timestamp: number, timebase: Date, id?: number) {
            this._stream = stream;
            this._value = value;
            this._raw_timestamp = timestamp;
            this._time = new Date(timebase.valueOf() + timestamp*1000);

            if (id !== undefined) {
                this._id = id;
            } else {
                this._id = 0;
            }
    }

    public get timestamp() {
        return this._raw_timestamp;
    }

    public get value() {
        return this._value;
    }

    public get stream() {
        return this._stream;
    }

    public get id() {
        return this._id;
    }

    public get time() {
        return this._time;
    }

    public get variable(): string {
        return numberToHexString(this.stream, 4);
    }
}

export class IOTileReport {

}

export class IndividualReport extends IOTileReport {
    private _uuid: number;
    private _reading: RawReading;
    private _sentTimestamp: number;

    constructor (uuid: number, sentTime: number, reading: RawReading) {
        super();

        this._uuid = uuid;
        this._reading = reading;
        this._sentTimestamp = sentTime;
    }

    /**
     * Update the IndividualReport using formatting data from the cloud to be able to show
     * accurate realtime data about the device stream. 
     * 
     * @param fmt: a raw_value_format code from the cloud that indicates what format 
     * the binary device data should be interpreted as. 
     */
    public decodeUsingFormat(fmt: string) {
        if (fmt == '<l'){
            let signedValue: number;
            let rawData = packArrayBuffer('L', this._reading.value);
            [signedValue] = unpackArrayBuffer('l', rawData);

            this._reading = new RawReading(this._reading.stream, signedValue, this._reading.timestamp, this._reading.time, this._reading.id);
        }
    }

    public get deviceID() {
        return this._uuid;
    }

    public get reading() {
        return this._reading;
    }

    public get sentTimestamp() {
        return this._sentTimestamp;
    }
}

const REPORT_HEADER_SIZE: number = 20;

export const USER_REPORT_STREAMER: number = 0;
export const SYSTEM_REPORT_STREAMER: number = 1;
export const COMBINED_REPORT_STREAMER: number = 0xFF;

export interface SignedReportHeader {
    format: number,
    lengthLow: number,
    lengthHigh: number,
    uuid: number,
    reportID: number,
    sentTime: number,
    signatureFlags: number,
    streamer: number,
    selector: number,
    decodedSelector: StreamSelector
}

export interface SignedReportFooter {
    lowestID: number,
    highestID: number,
    signature: ArrayBuffer
}

export enum SignedReportSelectors {
    UserOutputs = (5 << 12) | ((1 << 11) - 1),
    SystemOutputs = (5 << 12) | ((1 << 11) - 1) | (1 << 11),
    CombinedOutputs = (5 << 12) | ((1 << 11) - 1) | (1 << 15)
}

export enum SignatureFlags {
    HashOnly = 0,
    SignedUserKey = 1,
    SignedDeviceKey = 2
}

export enum SignatureStatus {
    Valid = 0,
    Invalid = 1,
    Unknown = 2
}

export enum StreamMatchOperator {
    UserOnly = 0,
    SystemOnly = 1,
    UserAndBreaks = 2,
    UserAndSystem = 3
}

export enum StreamType {
    Storage = 0,
    Unbuffered = 1,
    Constant = 2,
    Input = 3,
    Count = 4,
    Output = 5,
    Realtime = 6
}

export class StreamSelector {
    public static readonly WILDCARD: number = (1 << 11) - 1;
    public static readonly REBOOT_STREAM: number = 0x5C00;

    public readonly type: StreamType;
    public readonly code: number;
    public readonly match_op: StreamMatchOperator;
    public readonly isWildcard: boolean;

    constructor(encodedSelector: number) {
        [this.type, this.code, this.match_op] = StreamSelector.decode(encodedSelector);
        this.isWildcard = (this.code === StreamSelector.WILDCARD);
    }

    public matches(streamID: number): boolean {
        let [type, code, op] = StreamSelector.decode(streamID);

        //Stream IDs must be either system or user, not any of the combined selectors
        if (op === StreamMatchOperator.UserAndSystem || op === StreamMatchOperator.UserAndBreaks)
            return false;

        if (!this.isWildcard && this.code !== code)
            return false;
        
        if (this.type !== type)
            return false;
        
        if (this.match_op === StreamMatchOperator.SystemOnly && op == StreamMatchOperator.UserOnly)
            return false;
        
        if (this.match_op === StreamMatchOperator.UserOnly && op == StreamMatchOperator.SystemOnly)
            return false;
        
        /*
         * The UserAndBreaks selector matches all user streams + the global reboot stream but no other system streams.
         */
        if (this.match_op === StreamMatchOperator.UserAndBreaks && op == StreamMatchOperator.SystemOnly && streamID !== StreamSelector.REBOOT_STREAM)
            return false;

        return true;
    }

    public static decode(encodedSelector: number): [StreamType, number, StreamMatchOperator] {
        if (encodedSelector < 0 || encodedSelector > 0xFFFF)
            throw new ArgumentError(`invalid number in StreamSelector that is not in [0, 65535]: ${encodedSelector}`);

        if (encodedSelector !== Math.floor(encodedSelector))
            throw new ArgumentError(`You must create a StreamSelector with a whole number: ${encodedSelector}`);

        let isSystem = !!(encodedSelector & (1 << 11));
        let includeBreaks = !!(encodedSelector & (1 << 15));
        let match_op = StreamSelector.getOperator(isSystem, includeBreaks);
        let code = encodedSelector & ((1 << 11) - 1);
        let type = (encodedSelector >> 12) & 0b111;
        
        return [type, code, match_op];
    }

    private static getOperator(isSystem: boolean, includeBreaks: boolean) {
        if (isSystem && !includeBreaks)
            return StreamMatchOperator.SystemOnly;
        
        if (!isSystem && !includeBreaks)
            return StreamMatchOperator.UserOnly;
        
        if (isSystem && includeBreaks)
            return StreamMatchOperator.UserAndSystem;
        
        //!isSystem && includeBreaks
        return StreamMatchOperator.UserAndBreaks;
    }
}

export class SignedListReport extends IOTileReport {
    private _uuid: number;
    private _readings: Array<RawReading>;
    private _rawData: ArrayBuffer;
    private _receivedTime: Date;
    private _lowestID: number;
    private _highestID: number;
    private _streamer: number;
    private _header: SignedReportHeader;
    private _valid: SignatureStatus;

    public static extractHeader(data: ArrayBuffer): SignedReportHeader {
        if (data.byteLength < REPORT_HEADER_SIZE) {
            throw new ArgumentError("Invalid report that was not long enough to contain a valid header");
        }

        let header = unpackArrayBuffer('BBHLLLBBH', data.slice(0, REPORT_HEADER_SIZE));

        return {
            format: header[0],
            lengthLow: header[1],
            lengthHigh: header[2],
            uuid: header[3],
            reportID: header[4],
            sentTime: header[5],
            signatureFlags: header[6],
            streamer: header[7],
            selector: header[8],
            decodedSelector: new StreamSelector(header[8])
        }
    }

    constructor (uuid: number, streamer: number, rawData: ArrayBuffer, receivedTime: Date) {
        super();

        this._highestID = 0;
        this._lowestID = 0;

        this._uuid = uuid;
        this._readings = [];
        this._rawData = rawData;
        this._streamer = streamer;
        this._receivedTime = receivedTime;

        this._header = SignedListReport.extractHeader(rawData);
        this._valid = this.validateSignature();

        if (this._valid === SignatureStatus.Valid) {
            this.updateReadings(this._rawData);
            this.updateReadingRange(this._readings);
        }
    }

    public get deviceID() {
        return this._uuid;
    }

    public get readings() {
        return this._readings;
    }

    public get validity(): SignatureStatus {
        return this._valid;
    }

    public get rawData() {
        return this._rawData;
    }

    public get streamer() {
        return this._streamer;
    }

    public get receivedTime() {
        return this._receivedTime;
    }

    public get readingIDRange() {
        return [this._lowestID, this._highestID];
    }

    public get header(): SignedReportHeader {
        return this._header;
    }

    private updateReadingRange(readings: RawReading[]) {
        //Calculate lowest and highest ids based on decoded readings
        if (readings.length == 0) {
            this._lowestID = 0;
            this._highestID = 0;
        } else {
            //Initialize with the first reading to avoid needing to use sentinal values
            this._lowestID = readings[0].id;
            this._highestID = readings[0].id;

            for (let i = 1; i < readings.length; ++i) {
                let id = readings[i].id;
                if (id < this._lowestID) {
                    this._lowestID = id;
                }

                if (id > this._highestID) {
                    this._highestID = id;
                }
            }
        }
    }

    private updateReadings(rawData: ArrayBuffer) {
        let readings: Array<RawReading> = [];
        let onTime = new Date(this._receivedTime.valueOf() - (this._header.sentTime*1000));
        //Now decode and parse the actual readings in the report
        // get length of readings
        let allReadingsData = rawData.slice(20, rawData.byteLength - 24);

        for (let i = 0; i < allReadingsData.byteLength; i += 16) {
            let readingData = allReadingsData.slice(i, i+16);
            let reading = unpackArrayBuffer("HHLLL", readingData);
            let stream = reading[0]; //reading[1] is reserved
            let readingID = reading[2];
            let readingTimestamp = reading[3];
            let readingValue = reading[4];

            let parsedReading = new RawReading(stream, readingValue, readingTimestamp, onTime, readingID);
            readings.push(parsedReading);
        }

        this._readings = readings;
        this.updateReadingRange(readings);
    }

    /**
     * Note that this method is designed to be called from the constructor
     * only.  It needs to be followed by calls to updateReadings() and updateReadingRange()
     * since it may modify the raw report data.
     */
    private validateSignature(): SignatureStatus {
        let calc = new SHA256Calculator();

        if (this._header.signatureFlags != SignatureFlags.HashOnly) {
            return SignatureStatus.Unknown;
        }

        let signedData = this._rawData.slice(0, this._rawData.byteLength - 16);
        let embeddedSig = this._rawData.slice(this._rawData.byteLength - 16);

        let signature = calc.calculateSignature(signedData);

        if (calc.compareSignatures(embeddedSig, signature)) {
            return SignatureStatus.Valid;
        } 
        
        /**
         * If the signature is invalid, attempt to automatically fix it assuming that the
         * cause is due to the Android bluetooth stack sending us out-of-order report chunks.
         */
        catReports.warn("Report signature invalid, attempting to reassemble");
        let reassembler = new ReportReassembler(this.rawData);

        if (reassembler.fixOutOfOrderChunks()) {
            catReports.info("Report successfully fixed");

            let newReport = reassembler.getFixedReport();
            this._rawData = newReport;

            return SignatureStatus.Valid;
        }

        catReports.error("Unable to correct report signature", null);
        return SignatureStatus.Invalid;  
    }
}
