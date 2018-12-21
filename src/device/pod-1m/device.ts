import { IOTileDevice, convertToSecondsSince2000, ReceiveReportsResult, ReceiveReportsOptions } from "../iotile-device";
import { IOTileAdapter } from "../iotile-serv";
import { catPOD1M } from "../../config";
import { ConnectionError } from "../../common/error-space";
import { UTCAssigner, UTCAssignerOptions } from "../../common/utc-assigner";
import { ProgressNotifier, delay, LoggingBase, BaseError, InvalidDataError, unpackArrayBuffer, ArgumentError } from "@iotile/iotile-common";
import { ShockInfo, WaveformInfo, WaveformData, RawWaveformInfo } from "./types";
import { WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH, SAMPLING_RATE } from "./constants";
import { summarizeWaveform, unpackVLEIntegerList } from "./utilities";
import { IOTileEvent } from "../../common/flexible-dict-report"
import { HeatshrinkDecoder } from "heatshrink-ts";
import { SignedListReport } from "../../common/iotile-reports";


export class POD1M extends LoggingBase {
    public device: IOTileDevice;
    public adapter: IOTileAdapter;

    constructor(device: IOTileDevice, adapter: IOTileAdapter) {
        super(catPOD1M);

        this.device = device;
        this.adapter = adapter;
    }

    public async getShockInfo(shock: number): Promise<ShockInfo> {
        let [peak, duration, dVx, dVy, dVz] = await this.adapter.typedRPC(12, 0x8004, 'BB', 'HHlll', [1, shock]);

        let peakVal = peak >> 2;
        let peakAxis = peak & 0b11;

        return new ShockInfo(peakVal, peakAxis, duration, dVx, dVy, dVz);
    }

    public async getAccelerometerStatus() {
        try {
            // FIXME: update signature to "LLBxBB3h2x" when we update packArrayBuffer to support x, h
            console.log("Starting");
            let [last_err, shock_counter, tile_state, _unused, state, flags, x, y, z, _unused2, _unused3] = await this.adapter.typedRPC(12, 0x8006, "", "LLBBBBHHHBB", [], 3.0);

            console.log("Returned");
            let TILE_STATE_TABLE: {[key: number]: string} = {
                0: "initializing",
                1: "capturing",
                2: "streaming"
            }

            let status = {
                'tile_state': TILE_STATE_TABLE[tile_state],
                'recording': !!(flags & (1 << 0)),
                'settled': !!(flags & (1 << 2)),
                'streaming': !!(flags & (1 << 4)),
            }

            return status;
        } catch (err) {
            this.logError("Couldn't get accelerometer tile status: ", err);
            throw new ConnectionError("Lost connection to accelerometer tile");
        }
    }

    public async downloadData(progress: ProgressNotifier): Promise<[ReceiveReportsResult, IOTileEvent[]]> {

        progress.startOne('Requesting Accelerometer Waveform Data', 3);
        let waveforms = await this.getCompressedWaveforms(progress);
        progress.finishOne();

        progress.startOne('Compiling Waveform Data Reports', 1);
        let [received, decompressed] = await this.accumulateWaveforms(progress, waveforms);
        progress.finishOne();

        return [received, decompressed];
    }

    private async sortReadings(skipID?: number): Promise<number> {
        if (skipID == null) {
            skipID = 0;
        }
        let highestN = 100; // max number of events to keep

        let [count] = await this.adapter.errorHandlingRPC(12, 0x803a, "LHB", "LL", [skipID, highestN, 0]);
        return count;
    }

    private async getCompressedWaveforms(notifier: ProgressNotifier): Promise<RawWaveformInfo> {
        // Put accelerometer into streaming mode
        await this.adapter.errorHandlingRPC(12, 0x8038, "", "L", []);
        notifier.finishOne();

        let expected: number = 100;
        let received: number = 0;

        try {
            notifier.updateDescription('Sorting Waveform Readings');
            expected = await this.sortReadings();
            notifier.finishOne();

            notifier.updateDescription('Receiving Waveform Data');
            
            /*
            * Make sure that we have the tracing interface opened so that we receive traced waveforms
            * and make sure that there is no stale data in it. 
            */
            await this.adapter.enableTracing();
            this.adapter.clearTrace();

            let [err, count, filler] = await this.adapter.typedRPC(12, 0x803e, "", "HHH", [], 1.0);
            if (err) {
                this.logError(`Unable to stream sorted waveforms, error code: ${err}`);
                throw new BaseError('Unable to Stream Waveforms', 'Unable to stream sorted waveforms from device. Please disconnect and try again.');
            }
            let subNotifier = notifier.startOne(`Downloading ${count} Waveforms from Device`, count);
            if (subNotifier == null) {
                subNotifier = new ProgressNotifier();
            }

            this.logInfo(`Receiving ${count} waveform(s) from device.`);

            let waveforms: RawWaveformInfo = {};
            for (received; received < count; received++){
                let header = await this.adapter.waitForTracingData(20);

                let [fmtCode, _unused, compressedSize, uniqueId, timestamp, crcCode, _unused2, _unused3, _unused4, _unused5] = unpackArrayBuffer("BBHLLLBBBB", header);
                this.logDebug(`Received header ${received}: uniqueId: ${uniqueId}, compressedSize: ${compressedSize}, fmtCode: ${fmtCode}`);
                
                let waveform = await this.adapter.waitForTracingData(compressedSize);
                waveforms[uniqueId] = {"timestamp": timestamp,
                                        "crcCode": crcCode,
                                        "rawWaveform": waveform}

                this.logDebug(`Received ${compressedSize} bytes of waveform data`);

                subNotifier.finishOne();
            }
            
            return waveforms;
        } catch (err) {
            notifier.addError(`Error receiving waveforms, successfully received ${received} of an expected ${expected}`);
            this.logError('Error getting compressed waveforms: ', err);

            throw err;
        } finally {
            // wait until the tile is done actively streaming so we know when we can leave streaming mode
            let status = await this.getAccelerometerStatus();

            while (status.streaming){
                await delay(500);
                status = await this.getAccelerometerStatus();
            }
            // Put accelerometer tile back in sleep mode
            await this.adapter.errorHandlingRPC(12, 0x8039, "", "L", []);
        }
    }

    private async accumulateWaveforms(notifier: ProgressNotifier, waveforms: RawWaveformInfo, highestReceived?: number): Promise<[ReceiveReportsResult, IOTileEvent[]]> {
        let count = Object.keys(waveforms).length;
        let subNotifier = notifier.startOne(`Decompressing ${count} Waveforms`, count);
        let decoder = new HeatshrinkDecoder(WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH);
        let accelerationData: number[] = [];
        let rawWaveforms: {[key: string]: number[]} = {};
        let waveformEvents: IOTileEvent[];

        if (highestReceived == null) {
            highestReceived = 0;
        }

        if (subNotifier == null) {
            subNotifier = new ProgressNotifier();
        }

        for (let wave in waveforms) {
            /*
             * Un-heatshrink each waveform separately since they are encoded separately.
             * In particular, we do not want any sliding window shared between subsequent
             * waveforms.
             */
            decoder.reset();
            decoder.process(waveforms[wave].rawWaveform);
            let expanded = decoder.getOutput();

            // variable length decoding
            let vleDecoded = unpackVLEIntegerList(<ArrayBuffer>expanded.buffer);
            if (vleDecoded.length != 3072) {
                throw new InvalidDataError('Waveform Decompression Error', `Received number of data points is incorrect; parsed ${vleDecoded.length} of 3072`);
            }

            //FIXME: This check is done on the compressed data and must be done with specific parameters
            //       for the crc tha match what was used to calculate the value on the device. 
            /*if (crc32.buf(accelerationData) != waveforms[wave].crcCode){
                console.log(crc32.buf(accelerationData), waveforms[wave].crcCode);
                throw new InvalidDataError('Waveform Decompression Error', 'Received data has incorrect checksum value');
            }*/

            // convert from device internal storage to Gs
            for (let v of vleDecoded) {
                accelerationData.push(v * .049);
            }

            rawWaveforms[wave] = accelerationData;
            accelerationData = [];
            subNotifier.finishOne();
        }

        if (Object.keys(rawWaveforms).length != count){
            throw new InvalidDataError('Waveform Accumulation Error', `Received ${Object.keys(rawWaveforms).length} accumulated waveform entries for ${count} unconverted waveforms`);
        }

        let [received, waveformList] = await this.createEvents(rawWaveforms, waveforms, highestReceived, notifier);

        return [received, waveformList];
    }

    private checkWaveformsUTC(waveforms: RawWaveformInfo): boolean {
        for (let uniqueId in waveforms){
            let timestamp = waveforms[uniqueId].timestamp;

            if (!!(timestamp & (1 << 31)) === true){
                return false;
            }
        }
        return true;
    }

    // {x.value: x.reading_id for x in user_report.visible_readings if x.stream == 0x5020}
    private createWaveMap(reports: SignedListReport[]): {[key: number]: number} {
        let waveMap: {[key: number]: number} = {};

        for (let report of reports){
            if (report.streamer == 0){
                for (let reading of report.readings){
                    if (reading.stream == 0x5020){
                        waveMap[reading.value] = reading.id;
                    }
                }
            }
        } 
        return waveMap;
    }

    /*
     * Create IOTileEvent entries from the raw decoded data and the associated waveform metadata
     */
   private async createEvents(rawData: {[key: string]: number[]}, waveforms: RawWaveformInfo, highestReceived: number, notifier: ProgressNotifier): Promise<[ReceiveReportsResult, IOTileEvent[]]> {
        let events: IOTileEvent[] = [];
        let streamID = 0x5020;

        notifier.startOne('Requesting Summary Data', 2);
        let options: ReceiveReportsOptions;
        options = { expectedStreamers: {0:'Environmental', 1:'System', 2:'Trip'},
                              requireAll: false};

        if (!this.checkWaveformsUTC(waveforms)){
            await this.device.acknowledgeStreamerRPC(0, 0, true);
        }

        let received = await this.device.receiveReports(options, notifier);
        notifier.finishOne();

        // Create UTC Assigner and feed it enough points to construct a timeline
        let utcOptions: UTCAssignerOptions = {allowExtrapolation: true, allowImprecise: true}
        let assigner = new UTCAssigner(utcOptions);

        // populate utc assigner timeline based on reports
        for (let report of received.reports){
            this.logWarning(`Populating timeline from report ${report.streamer} ${JSON.stringify(report.header)}`);
            assigner.addBreaksFromReport(report);
            assigner.addAnchorsFromReport(report);
        }

        for (let uniqueId in waveforms){
            if (+uniqueId > highestReceived){
                let waveformData: WaveformData = {acceleration_data: 
                    { x: rawData[uniqueId].slice(0, 1024),
                    y: rawData[uniqueId].slice(1024, 2048),
                    z: rawData[uniqueId].slice(2048)
                    },
                    sampling_rate: SAMPLING_RATE,
                    crc_code: waveforms[uniqueId].crcCode
                };
                let summaryData = summarizeWaveform(waveformData);

                let waveMap = this.createWaveMap(received.reports);
                let readingId = waveMap[uniqueId];
                
                if (!readingId){
                    this.logError("Could not assign waveform timestamp: no matching user report");
                }

                // Make sure each waveform has a UTC timestamp
                let uptime = waveforms[uniqueId].timestamp;
                let UTCTimestamp;

                if ((!!(uptime & (1 << 31)) === true) && (uptime != 0xFFFFFFFF)){
                    UTCTimestamp = uptime;
                    this.logDebug('Received UTC timestamp from device');
                } else {
                    this.logInfo('Did not receive UTC from device; assigning UTC Timestamp');
                    
                    try {
                        let date = assigner.assignUTCTimestamp(readingId, uptime);
                        this.logInfo(`Assigned timestamp for waveform: ${date.toISOString()}`);
                        let secondsSince2000 = convertToSecondsSince2000(date);
                        UTCTimestamp = secondsSince2000;
                    } catch (err) {
                        this.logError('Unable to assign UTC timestamp from report information', err);
                    }
                }

                if (!UTCTimestamp){
                    this.logError(`Unable to assign UTC to waveform ${readingId}`);
                    throw new ArgumentError(`Unable to assign UTC to waveform ${readingId} `)
                }

                // TODO: check IOTileEvent signature (device_timestamp vs. timestamp)
                let event = new IOTileEvent(streamID, UTCTimestamp, summaryData, waveformData, +uniqueId);
                events.push(event);
            }
        }

        return [received, events];
    }
}