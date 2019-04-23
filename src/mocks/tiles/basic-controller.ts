import {tileRPC, VirtualTile, RPCResponse, VersionInfo, packError} from "../virtual-device";
import { ArgumentError } from "@iotile/iotile-common";
import { buildIndividualReport } from "../utilities";
import { convertToSecondsSince2000 } from "../../device/iotile-device";

export interface StreamValue {
    timestamp: number,
    uniqueID: number,
    value: number
}

export interface DownloadStreamState {
    stream: number,
    currIndex: number
}

export interface RealtimeStreamerState {
    stream: number,
    intervalMS: number,
    timeoutHandle: number | null
}

export type NotificationCallback = (ArrayBuffer: ArrayBuffer) => void;
export type PrestreamingHook = (controller: BasicControllerTile) => ArrayBuffer[];

export class BasicControllerTile extends VirtualTile {
    protected appInfo: number;
    protected osInfo: number;
    protected iotileID: number;

    //State information for some multi-RPC calls
    protected downloadStreamState: DownloadStreamState |  null;

    //Sensorgraph information
    public streamerAcks: {[key: number]: number};
    public streams: {[key: number]: StreamValue[]};
    
    public realtimeStreamers: RealtimeStreamerState[]; 
    
    //Queued reports that will be sent immediately upon someone connecting.
    public queuedReports: ArrayBuffer[] | SharedArrayBuffer[] | any[];

    //The next unique ID that will be given to a reading;
    public highestUniqueID: number;

    public notificationCallback: NotificationCallback | null;
    public prestreamingHook: PrestreamingHook | null;

    constructor(iotileID: number, versionInfo: VersionInfo, firmwareVersion: string = "2.11.4", protected hwTag: string = "btc1_v3") {
        super(8, 'NRF52 ', firmwareVersion);

        this.appInfo = this.combineVersion(versionInfo.appTag, versionInfo.appVersion);
        this.osInfo = this.combineVersion(versionInfo.osTag, versionInfo.osVersion);
        this.iotileID = iotileID;

        this.streamerAcks = {};
        this.streams = {};
        this.highestUniqueID = 0;

        this.realtimeStreamers = [];
        this.queuedReports = [];

        this.prestreamingHook = null;
        this.downloadStreamState = null;
        this.notificationCallback = null;
    }

    private combineVersion(tag: number, version: string) {
        let parts = version.split('.');
        if (parts.length != 2) {
            throw new ArgumentError(`Unable to parse 2 component version string: ${version}`);
        }

        let major = parseInt(parts[0]);
        let minor = parseInt(parts[1]);

        return (major << 26) | (minor << 20) | tag;
    }

    private isBufferedStream(stream: number): boolean {
        let streamType = stream >> 12;
        if (streamType === 5 || streamType === 0) {
            return true;
        }

        return false;
    }

    public addRealtimeStreamer(stream: number, intervalMS: number) {
        let state: RealtimeStreamerState = {
            intervalMS: intervalMS,
            timeoutHandle: null,
            stream: stream
        }

        this.realtimeStreamers.push(state);

        if (this.isStreamingEnabled()) {
            state.timeoutHandle = window.setInterval(() => this.handleRealtimeStreamer(state), intervalMS);
        }
    }

    protected handleRealtimeStreamer(state: RealtimeStreamerState) {
        if (this.notificationCallback == null)
            return;
        
        if (!(state.stream in this.streams))
            return;
        
        let streamData = this.streams[state.stream];
        if (streamData.length == 0)
            return;

        let lastValue = streamData[streamData.length - 1];
        let report = buildIndividualReport(this.iotileID, state.stream, lastValue.value);

        this.notificationCallback(report);
    }

    public isStreamingEnabled(): boolean {
        return this.notificationCallback !== null;
    }

    public enableStreaming(callback: NotificationCallback) {
        if (this.isStreamingEnabled()) {
            return;
        }

        this.notificationCallback = callback;

        for (let report of this.queuedReports) {
            callback(report);
        }

        this.queuedReports = [];

        for (let streamer of this.realtimeStreamers) {
            streamer.timeoutHandle = window.setInterval(() => this.handleRealtimeStreamer(streamer), streamer.intervalMS);
        }
    }

    public disableStreaming() {
        if (!this.isStreamingEnabled()) {
            return;
        }

        this.notificationCallback = null;

        for (let streamer of this.realtimeStreamers) {
            if (streamer.timeoutHandle == null)
                continue;

            window.clearInterval(streamer.timeoutHandle);
            streamer.timeoutHandle = null;
        }
    }

    /*
     * Publicly available controller RPCs
     * 
     * These RPC functions represent the emulated public behavior of an
     * iotile controller based on lib_controller.
     */
    @tileRPC(0x0002, "", "10s")
    public getHardwareTag(): RPCResponse {
        return [this.hwTag];
    }

    @tileRPC(0x1001, "", "L")
    public getCurrentDeviceTime(): RPCResponse {
        let secondsSince2000 = convertToSecondsSince2000(new Date())
        return [secondsSince2000];
    }

    @tileRPC(0x1008, "", "LLBBBBLL")
    public getDeviceInfo(): RPCResponse {
        return [this.iotileID, 0, 0, 0, 0, 0, this.osInfo, this.appInfo];
    }

    @tileRPC(0x2000, "LH", "L")
    public pushReading(value: number, stream: number) {
        if (!(stream in this.streams))
            this.streams[stream] = [];
        
        let streamValue: StreamValue = {
            timestamp: Math.floor(Date.now() / 1000.0),
            uniqueID: 0,
            value:value
        };

        if (this.isBufferedStream(stream)) {
            streamValue.uniqueID = ++this.highestUniqueID;
        }

        this.streams[stream].push(streamValue);
        return [0];
    }

    @tileRPC(0x2008, "H", "LLLL")
    public beginDownloadStream(stream: number) {
        this.downloadStreamState = {
            stream: stream,
            currIndex: 0
        };

        let count = 0;
        if (stream in this.streams) {
            count = this.streams[stream].length;
        }

        return [0, 0, count, Math.floor(Date.now() / 1000.0)];
    }

    @tileRPC(0x2009, "", "LLL")
    public downloadReading(stream: number) {
        if (this.downloadStreamState == null) {
            return [packError(0x8002, 0x8000), 0, 0];
        }

        let streamData = this.streams[this.downloadStreamState.stream];
        if (this.downloadStreamState.currIndex >= streamData.length) {
            return [packError(0x8002, 0x8000), 0, 0];
        }

        //TODO: There is a newer enhanced version of this call but it requires
        //supporting multiple call signatures for the same RPC.
        let streamValue = streamData[this.downloadStreamState.currIndex++];
        return [0, streamValue.timestamp, streamValue.value];
    }

    @tileRPC(0x2010, "H", "L")
    public triggerStreamer(streamer: number): RPCResponse {
        // TODO: implement

        return [0];
    }

    @tileRPC(0x200A, "H", "LLLLBBBB")
    public queryStreamer(streamer: number): RPCResponse {
        console.log("Querying Streamer:", streamer)

        // TODO: implement
        const streamerStatus = {
            lastAttemptTime: 0,
            lastSuccessTime: 0,
            lastError: 0,
            highestAck: 0,
            lastStatus: 0,
            backoffNumber: 0,
            commStatus: 0,
        };

        const {
            lastAttemptTime,
            lastSuccessTime,
            lastError,
            highestAck,
            lastStatus,
            backoffNumber,
            commStatus,
        } = streamerStatus;
        
        return [
            lastAttemptTime,
            lastSuccessTime,
            lastError,
            highestAck,
            lastStatus,
            backoffNumber,
            commStatus,
            0,
        ];
    }

    @tileRPC(0x200B, "H", "LL")
    public inspectVirtualStream(stream: number) {
        if (!(stream in this.streams)) {
            return [packError(0x8002, 0x8001), 0]
        }

        //We only support inspected streams that are not buffered in flash memory
        if (this.isBufferedStream(stream)) {
            return [packError(0x8002, 0x8001), 0]
        }

        let streamData = this.streams[stream];

        if (streamData.length === 0) {
            return [packError(0x8002, 0x8000), 0];
        }

        return [0, streamData[streamData.length - 1].value];
    }

    @tileRPC(0x200F, "HHL", "L")
    public acknowledgeStreamer(streamer: number, force: boolean, value: number): RPCResponse {
        let oldHighest = this.streamerAcks[streamer]
        if (oldHighest == null) {
            oldHighest = 0;
        }

        if (streamer < 0x100 && value > this.highestUniqueID) {
            this.highestUniqueID = value;
        }

        if (value > oldHighest || force) {
            this.streamerAcks[streamer] = value;
            return [0];
        }

        return [2147713054]; //Return pack_error(kSensorGraphSubsystem, kSGOldAcknowledgeUpdate);
    }
}
