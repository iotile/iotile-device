import { IOTileDevice, convertToSecondsSince2000, ReceiveReportsResult, ReceiveReportsOptions } from "../iotile-device";
import { IOTileAdapter } from "../iotile-serv";
import { catPOD1M } from "../../config";
import { ConnectionError } from "../../common/error-space";
import { UTCAssigner, UTCAssignerOptions } from "../../common/utc-assigner";
import { ProgressNotifier, delay, LoggingBase, BaseError, InvalidDataError, unpackArrayBuffer, ArgumentError } from "@iotile/iotile-common";
import { ShockInfo, RawWaveformInfo } from "./types";
import { WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH, SAMPLING_RATE } from "./constants";
import { IOTileEvent, FlexibleDictionaryReport } from "../../common/flexible-dict-report"
import { HeatshrinkDecoder } from "heatshrink-ts";
import { SignedListReport } from "../../common/iotile-reports";
import { decompressWaveforms, createWaveformEvents } from "./utilities";
import { ensureUTCTimestamps } from "./utc-reconstruction";


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
            let [last_err, shock_counter, tile_state, _unused, state, flags, x, y, z, _unused2, _unused3] = await this.adapter.typedRPC(12, 0x8006, "", "LLBBBBHHHBB", [], 3.0);

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

    /**
     * Download all trip data from a POD-1M.
     * 
     * This method will download waveforms, trip details and environmental data from a POD-1M.
     * If the method returns then all trip information was downloaded successfully.  Any error
     * downloading data from the device will cause an exception to be thrown indicating what
     * went wrong.
     * 
     * The download process proceeds as follows:
     * 
     * 1. Sort and then receive up to 100 waveforms from the device.  If we are given a 
     *    highestReceivedWaveform ID, then all waveforms older than this will be dropped.
     *    On newer device firmware, the dropping will happen inside the device itself.
     *    On older device firmware (Pre POD-1Mv2), we will drop the waveforms after receiving
     *    them.
     * 2. Check if any of the waveforms need their UTC timestamps fixed up
     * 3. If UTC fixup is needed, roll back the environmental streamer to the beginning
     *    to make sure that the device sends us all potential waveform timestamp markers
     *    to allow us to assign utc timestamps.
     * 4. Download environmental, system and trip data from the device.
     * 5. If UTC fixup is needed, assign utc timestamps to all waveforms stamped in uptime.
     * 6. Create IOTileEvent objects for each waveform
     * 7. Return the list of received reports and the IOTileEvent objects which are guaranteed
     *    to have their timestamps in UTC.
     * 
     * Since many of these steps are fast, not all of them are included in the progress bar.
     * This routine will call ProgressNotifier.startOne()/finishOne() a total of 6 times so
     * that is the amount of space in the progress bar that should be allocated for this routine.
     * 
     * If this routine is called with the possibility of a sub-progress bar, then it will show
     * progress separately for each report received and for all waveforms as a single progress
     * bar.  
     * 
     * @param progress A progress notifier that can be used to update a ProgressModal as we go.
     */
    public async downloadData(progress: ProgressNotifier, highestReceivedWaveform?: number): Promise<[SignedListReport[], IOTileEvent[]]> {
        let missingUTCCount: number = 0;
        let rawWaveforms = await this.getCompressedWaveforms(progress, highestReceivedWaveform);
        let decodedWaveforms = decompressWaveforms(rawWaveforms);

        for (let key in decodedWaveforms) {
            if (decodedWaveforms[key].utcTimestamp == null)
                missingUTCCount += 1;
        }

        /**
         * If we have waveforms without UTC, roll back the environmental streamer
         * to make sure that we receive the data point that contains the waveform's
         * unique id so we can use UTCAssigner to assign it a correct timestamp.
         */
        if (missingUTCCount > 0) {
            this.logWarning(`Found ${missingUTCCount} waveforms without UTC timestamps, will need to reconstruct timestamps`);
            await this.device.acknowledgeStreamerRPC(0, 0, true);
        } else {
            this.logInfo("All waveforms had UTC timestamps, no reconstruction necessary");
        }
        
        let reports = await this.downloadReports(progress);
        
        if (missingUTCCount > 0) {
            ensureUTCTimestamps(decodedWaveforms, reports);

            //FIXME: Discard any waveforms whose UTC timestamps could not be assigned.
        }

        let waveformEvents = createWaveformEvents(decodedWaveforms);
        return [reports, waveformEvents];
    }

    private async sortReadings(skipID?: number): Promise<number> {
        if (skipID == null) {
            skipID = 0;
        }
        let highestN = 100; // max number of events to keep

        let [count] = await this.adapter.errorHandlingRPC(12, 0x803a, "LHB", "LL", [skipID, highestN, 0]);
        return count;
    }

    /**
     * Download the top 100 waveforms from the POD-1M device.  
     * 
     * This routine will consume 3 progress steps.
     * 
     */
    private async getCompressedWaveforms(notifier: ProgressNotifier, skipID?: number): Promise<RawWaveformInfo> {
        // Put accelerometer into streaming mode
        notifier.startOne("Entering Streaming Mode", 1);
        await this.adapter.errorHandlingRPC(12, 0x8038, "", "L", []);
        notifier.finishOne();

        let expected: number = 100;
        let received: number = 0;
        let dropped: number = 0;

        try {
            notifier.startOne('Sorting Waveform Readings', 1);
            expected = await this.sortReadings(skipID);
            notifier.finishOne();
            
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
            if (subNotifier == null)
                subNotifier = new ProgressNotifier();

            this.logInfo(`Receiving ${count} waveform(s) from device.`);
            if (skipID != null)
                this.logInfo(`Dropping waveforms older than ${skipID}`);

            let waveforms: RawWaveformInfo = {};
            for (received; received < count; received++){
                let header = await this.adapter.waitForTracingData(20);

                let [fmtCode, _unused, compressedSize, uniqueId, timestamp, crcCode, _unused2, _unused3, _unused4, _unused5] = unpackArrayBuffer("BBHLLLBBBB", header);
                this.logDebug(`Received header ${received}: uniqueId: ${uniqueId}, compressedSize: ${compressedSize}, fmtCode: ${fmtCode}`);
                
                    
                let waveform = await this.adapter.waitForTracingData(compressedSize);
                this.logDebug(`Received ${compressedSize} bytes of waveform data`);

                /**
                 * If we have received old waveforms, don't forward them on
                 */
                if (skipID != null && uniqueId <= skipID) {
                    dropped += 1;
                    continue;
                }

                waveforms[uniqueId] = {"timestamp": timestamp,
                                       "crcCode": crcCode,
                                       "rawWaveform": waveform}

                subNotifier.finishOne();
            }

            notifier.finishOne();

            this.logInfo(`Dropped ${dropped} waveforms that were older than our skipID`);
            
            return waveforms;
        } catch (err) {
            notifier.addError(`Error receiving waveforms, successfully received ${received} of an expected ${expected}`);
            this.logError('Error getting compressed waveforms: ', err);

            throw err;
        } finally {

            // wait until the tile is done actively streaming so we know when we can leave streaming mode
            let status = await this.getAccelerometerStatus();

            while (status.streaming) {
                await delay(500);
                status = await this.getAccelerometerStatus();
            }
            // Put accelerometer tile back in sleep mode
            await this.adapter.errorHandlingRPC(12, 0x8039, "", "L", []);
        }
    }

    public async downloadReports(notifier: ProgressNotifier): Promise<SignedListReport[]> {
        let options: ReceiveReportsOptions;
        options = {expectedStreamers: {0:'Environmental Report', 1:'System Report', 2:'Trip Report'},
                   requireAll: false};

        let result = await this.device.receiveReports(options, notifier);
        return result.reports;
    }
}