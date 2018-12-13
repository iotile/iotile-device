/**
 * A dictionary based report that can either be saved as JSON or msgpack.
 * 
 * This is suitable for uploading complex event data on behalf of an IOTile device.
 */

import { IOTileReport, RawReading } from "./iotile-reports";
import { encode } from "msgpack-lite";
import { ArgumentError } from "@iotile/iotile-common";

export interface SerializedIOTileEvent {
    stream: number,
    device_timestamp: number,
    streamer_local_id: number,
    timestamp: string | null,
    data: object,
    extra_data: object
};

export class IOTileEvent {
    private _stream: number;
    private _deviceTimestamp: number;
    private _summaryData: {};
    private _rawData: {};
    private _readingID: number;

    constructor(stream: number, deviceTimestamp: number, summaryData: {}, rawData: {}, readingID?: number) {
        this._stream = stream;
        this._deviceTimestamp = deviceTimestamp;
        this._summaryData = summaryData;
        this._rawData = rawData;
        
        if (readingID == null) {
            readingID = 0;
        }

        this._readingID = readingID;
    }

    public toObject(): SerializedIOTileEvent {
        return {
            stream: this._stream,
            device_timestamp: this._deviceTimestamp,
            streamer_local_id: this._readingID,
            timestamp: null,
            data: this._rawData,
            extra_data: this._summaryData
        };
    }

    public get readingID(): number {
        return this._readingID;
    }
}

export interface FlexibleDictionaryOptions {
    streamer: number,
    selector: number,
    sentTimestamp: number,
    reportID: number,
    receivedTime?: Date,
}

export interface SerializedFlexibleDictionary {
    format: "v100",
    device: number,
    streamer_index: number,
    streamer_selector: number,
    incremental_id: number,
    lowest_id: number,
    highest_id: number,
    device_sent_timestamp: number,
    events: SerializedIOTileEvent[],
    data: object[]
};

export class FlexibleDictionaryReport extends IOTileReport {
    static DEFAULT_OPTIONS: FlexibleDictionaryOptions = {
        streamer: 0x100,
        selector: 0xFFFF,
        reportID: 0,
        sentTimestamp: 0xFFFFFFFF
    };

    private _receivedTime: Date;
    private _uuid: number;
    private _reportID: number;
    private _streamerIndex: number;
    private _streamerSelector: number;
    private _sentTimestamp: number;

    private _lowestID: number;
    private _highestID: number;

    private _readings: RawReading[];
    private _events: IOTileEvent[];

    constructor(uuid: number, readings: RawReading[], events: IOTileEvent[], options?: FlexibleDictionaryOptions) {
        super();

        if (options == null) {
            options = FlexibleDictionaryReport.DEFAULT_OPTIONS;
        }

        this._lowestID = 0;
        this._highestID = 0;

        let receivedTime = options.receivedTime;
        if (receivedTime == null ) {
            receivedTime = new Date();
        }

        this._receivedTime = receivedTime;

        this._uuid = uuid;
        this._reportID = options.reportID;
        this._streamerIndex = options.streamer;
        this._streamerSelector = options.selector;
        this._sentTimestamp = options.sentTimestamp;

        if (readings.length > 0) {
            throw new ArgumentError("Passing readings to a FlexibleDictionaryReport is not yet supported");
        }

        this._readings = readings;
        this._events = events;

        /**
         * The cloud expects that all of our events will be sorted by readingID so make sure
         * they are properly sorted and keep track of lowest and highest.
         */
        this.sortAndCalculateIDRange();
    }

    private sortAndCalculateIDRange() {
        this._events.sort((a, b) => a.readingID - b.readingID);

        this._lowestID = 0;
        this._highestID = 0;

        for (let event of this._events) {
            if (this._lowestID == 0 || event.readingID < this._lowestID) {
                this._lowestID = event.readingID;
            }

            if (this._highestID == 0 || event.readingID > this._highestID) {
                this._highestID = event.readingID;
            }
        }
    }

    public toObject(): SerializedFlexibleDictionary {
        return {
            format: "v100",
            device: this._uuid,
            streamer_index: this._streamerIndex,
            streamer_selector: this._streamerSelector,
            incremental_id: this._reportID,
            device_sent_timestamp: this._sentTimestamp,
            events: this._events.map(event => event.toObject()),
            data: [],

            lowest_id: this._lowestID,
            highest_id: this._highestID
        }
    }

    public toMsgpack(): ArrayBuffer {
        let obj = this.toObject();

        let encoded = encode(obj);
        return <ArrayBuffer>encoded.buffer;
    }

    public get receivedTime(): Date {
        return this._receivedTime;
    }
}
