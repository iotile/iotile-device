/// <reference path="../../../typings/cordova_plugins.d.ts" />
/// <reference path="../../../typings/iotile-common.d.ts" />
export declare class RawReading {
    private _raw_timestamp;
    private _value;
    private _time;
    private _stream;
    private _id;
    constructor(stream: number, value: number, timestamp: number, timebase: Date, id?: number);
    readonly timestamp: number;
    readonly value: number;
    readonly stream: number;
    readonly id: number;
    readonly time: Date;
    readonly variable: string;
}
export declare class IOTileReport {
}
export declare class IndividualReport extends IOTileReport {
    private _uuid;
    private _reading;
    private _sentTimestamp;
    constructor(uuid: number, sentTime: number, reading: RawReading);
    /**
     * Update the IndividualReport using formatting data from the cloud to be able to show
     * accurate realtime data about the device stream.
     *
     * @param fmt: a raw_value_format code from the cloud that indicates what format
     * the binary device data should be interpreted as.
     */
    decodeUsingFormat(fmt: string): void;
    readonly deviceID: number;
    readonly reading: RawReading;
    readonly sentTimestamp: number;
}
export declare const USER_REPORT_STREAMER: number;
export declare const SYSTEM_REPORT_STREAMER: number;
export declare const COMBINED_REPORT_STREAMER: number;
export interface SignedReportHeader {
    format: number;
    lengthLow: number;
    lengthHigh: number;
    uuid: number;
    reportID: number;
    sentTime: number;
    signatureFlags: number;
    streamer: number;
    selector: number;
}
export interface SignedReportFooter {
    lowestID: number;
    highestID: number;
    signature: ArrayBuffer;
}
export declare enum SignedReportSelectors {
    UserOutputs = 22527,
    SystemOutputs = 24575,
    CombinedOutputs = 55295,
}
export declare enum SignatureFlags {
    HashOnly = 0,
    SignedUserKey = 1,
    SignedDeviceKey = 2,
}
export declare enum SignatureStatus {
    Valid = 0,
    Invalid = 1,
    Unknown = 2,
}
export declare class SignedListReport extends IOTileReport {
    private _uuid;
    private _readings;
    private _rawData;
    private _receivedTime;
    private _lowestID;
    private _highestID;
    private _streamer;
    private _header;
    private _valid;
    constructor(uuid: number, streamer: number, readings: Array<RawReading>, rawData: ArrayBuffer, receivedTime: Date);
    readonly deviceID: number;
    readonly readings: RawReading[];
    readonly validity: SignatureStatus;
    readonly rawData: ArrayBuffer;
    readonly streamer: number;
    readonly receivedTime: Date;
    readonly readingIDRange: number[];
    readonly header: SignedReportHeader;
    private extractHeader();
    private validateSignature();
}
