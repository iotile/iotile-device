///<reference path="../../typings/cordova_plugins.d.ts"/>
import {SHA256Calculator, unpackArrayBuffer, packArrayBuffer, ArgumentError, numberToHexString} from "iotile-common";

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
    selector: number
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

    constructor (uuid: number, streamer: number, readings: Array<RawReading>, rawData: ArrayBuffer, receivedTime: Date) {
        super();

        this._uuid = uuid;
        this._readings = readings;
        this._rawData = rawData;
        this._streamer = streamer;
        this._receivedTime = receivedTime;

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

        this._header = this.extractHeader();
        this._valid = this.validateSignature();
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

    private extractHeader(): SignedReportHeader {
        let data = this._rawData;

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
            selector: header[8]
        }
    }

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

        return SignatureStatus.Invalid;
    }
}
