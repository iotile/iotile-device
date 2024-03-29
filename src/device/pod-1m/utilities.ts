import { WaveformSummary, AxisSummary, PeakAxis, WaveformData, DecodedWaveformInfo, RawWaveformInfo } from "./types";
import { InvalidDataError } from "@iotile/iotile-common";
import { HeatshrinkDecoder } from "heatshrink-ts";
import { WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH, SAMPLING_RATE } from "./constants";
import { IOTileEvent } from "../../common/flexible-dict-report";
/**
 * Calculate the maximum time that a given threshold is exceeded.
 * 
 * @param data A list of samples along a single axis in G's
 * @param threshold The threshold that we should count time above
 * @param samplingRate The sampling rate of the data in Hz
 * 
 * @returns The number of ms that data is above threshold in a single continuous
 *          event. 
 */
export function timeAboveThreshold(data: number[], threshold: number, samplingRate: number): number {
    let maxCount = 0;
    let currCount = 0;
    let above = false;
    let lastSample = 0.0

    for(let sample of data) {
        if (above === false && Math.abs(sample)>= threshold) {
            above = true;
            currCount = 0;
        } else if (above) {
            currCount += 1;

            if (Math.abs(sample) < threshold || lastSample*sample < 0.0) {
                above = false;
                if (currCount > maxCount)
                    maxCount = currCount;
            }
        }

        lastSample = sample;
    }

    if (above && currCount > maxCount)
        maxCount = currCount;

    return maxCount / samplingRate * 1000.0;
}

export function calculateDeltaV(data: number[], threshold: number, samplingRate: number): number {
    let maxDV = 0;
    let currDV = 0;
    let above = false;
    let lastSample = 0.0

    const G_CONST = 9.80665;

    for(let sample of data) {
        if (above === false && Math.abs(sample)>= threshold) {
            above = true;
            currDV = sample;
        } else if (above) {
            currDV += sample;

            if (Math.abs(sample) < threshold || lastSample*sample < 0.0) {
                above = false;
                if (Math.abs(currDV) > Math.abs(maxDV))
                    maxDV = currDV;
            }
        }

        lastSample = sample;
    }

    if (above && Math.abs(currDV) > Math.abs(maxDV))
        maxDV = currDV;

    return maxDV / samplingRate * G_CONST;
}

export function maxAbs(data: number[]) {
    let max = 0.0;

    for (let value of data) {
        if (Math.abs(value) > max) {
            max = Math.abs(value);
        }
    }

    return max;
}

export function summarizeAxis(data: number[], threshold: number, samplingRate: number): AxisSummary {
    return {
        deltaV: calculateDeltaV(data, threshold, samplingRate),
        peak: maxAbs(data),
        timeAboveThreshold: timeAboveThreshold(data, threshold, samplingRate)
    };
}

export function summarizeWaveform(wave: WaveformData): WaveformSummary {
    let xSummary = summarizeAxis(wave.acceleration_data.x, 1.0, wave.sampling_rate);
    let ySummary = summarizeAxis(wave.acceleration_data.y, 1.0, wave.sampling_rate);
    let zSummary = summarizeAxis(wave.acceleration_data.z, 1.0, wave.sampling_rate);

    let peakAxis: PeakAxis = 'x';
    let peak = xSummary.peak;
    let duration = xSummary.timeAboveThreshold;

    if (ySummary.peak > peak) {
        peakAxis = 'y';
        peak = ySummary.peak;
        duration = ySummary.timeAboveThreshold;
    }

    if (zSummary.peak > peak) {
        peakAxis = 'z';
        peak = zSummary.peak;
        duration = zSummary.timeAboveThreshold;
    }
    
    return {
        peak: peak,
        axis: peakAxis,
        duration: duration,
        delta_v_x: xSummary.deltaV,
        delta_v_y: ySummary.deltaV,
        delta_v_z: zSummary.deltaV
    }
}

/**
 * Unpack an array buffer that corresponds to a list of VLE encoded integers.
 * 
 * The function assumes that the input buffer was created from a list of integers
 * in the range of -4095 to 4095 that were processed in the following way to
 * create this binary buffer:
 * 
 * - They were delta encoded, so all entries after the first were stored as
 *   the difference between the value and the last value.
 * - They were zig-zag encoded so that all negative values became positive.
 * - They were packed as variable length integers where 7-bit values are stored
 *   as a single byte and all other values are stored as two bytes.
 * 
 * This function undoes all three of these packing steps 
 * 
 * @param input A list of integers that have been encoded in the following
 *              way: first they were delta encoded, then they were zigzag
 *              encoded and finally they were delta encoded.
 */
export function unpackVLEIntegerList(input: ArrayBuffer): number[] {
    let inputBytes = new Uint8Array(input);
    let outputNumbers: number[] = [];
    let accum = 0;
    let shift = 0;

    /*
     * First undo the variant length encoding, in which numbers 
     * between -64 and 63, inclusive are encoded in a single byte
     * with the 7th bit clear and other numbers are encoded in 
     * two bytes with the 7th bit of the first byte set.  The
     * packing is little-endian.
     * 
     * We simultaneously remove the zig-zag encoding to turn these
     * values back into signed integers.
     */
    for (let i = 0; i < inputBytes.byteLength; ++i) {
        let val = inputBytes[i];
        if (val & (1 << 7)) {
            accum |= (val & (0x7f));
            shift = 7;
        } else {
            accum |= ((val & 0x7f) << shift);
            let zigzag = ((accum >>> 1)) ^ -(accum & 1);

            accum = 0;
            shift = 0;
            outputNumbers.push(zigzag);
        }
    }

    /**
     * Undo the delta encoding on each of the numbers now that
     * we have them back in their pristine state.
     */
    for (let i = 1; i < outputNumbers.length; ++i) {
        outputNumbers[i] += outputNumbers[i - 1];
    }

    return outputNumbers;
}

export function decompressWaveforms(rawWaveforms: RawWaveformInfo): DecodedWaveformInfo {
    let decoder = new HeatshrinkDecoder(WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH);
    let accelerationData: number[] = [];
    let waveforms: DecodedWaveformInfo = {};

    for (let wave in rawWaveforms) {
        let rawWaveform = rawWaveforms[wave];
        accelerationData = [];

        /*
         * Un-heatshrink each waveform separately since they are encoded separately.
         * In particular, we do not want any sliding window shared between subsequent
         * waveforms.
         */
        decoder.reset();
        decoder.process(rawWaveforms[wave].rawWaveform);

        let expanded = decoder.getOutput();

        // variable length decoding
        let vleDecoded = unpackVLEIntegerList(<ArrayBuffer>expanded.buffer);
        if (vleDecoded.length != 3072) {
            throw new InvalidDataError('Waveform Decompression Error', `Received number of data points is incorrect; parsed ${vleDecoded.length} of 3072`);
        }

        // convert from device internal storage to Gs
        for (let v of vleDecoded) {
            accelerationData.push(v * .049);
        }

        let waveformData: WaveformData = {acceleration_data: 
            { x: accelerationData.slice(0, 1024),
              y: accelerationData.slice(1024, 2048),
              z: accelerationData.slice(2048)},
            sampling_rate: SAMPLING_RATE,
            crc_code: rawWaveform.crcCode
        };


        waveforms[wave] = {
           deviceTimestamp: rawWaveform.timestamp,
           utcTimestamp: tryConvertUTCTimestamp(rawWaveform.timestamp),
           summary:  summarizeWaveform(waveformData),
           waveform: waveformData
        }

        /**
         * If the waveform has an embedded UTC timestamp, promote it to the waveform's UTC time.
         */
    }

    return waveforms;
}

export function tryConvertUTCTimestamp(deviceTimestamp: number): Date | null {
    if (deviceTimestamp === 0xFFFFFFFF)
        return null;
    
    if (!(deviceTimestamp & ( 1 << 31)))
        return null;

    //Mask out the high bit to leave the lower 31 bits
    let y2kDelta = deviceTimestamp & ((1 << 31) - 1);
    let y2k = new Date('2000-01-01T00:00:00Z');

    let timestamp = y2k.getTime() + y2kDelta*1000;

    let utcDate = new Date(timestamp);
    return utcDate;
}

/**
 * Create IOTileEvents for all waveforms.
 */
export function createWaveformEvents(waveforms: DecodedWaveformInfo): IOTileEvent[] {
    let events: IOTileEvent[] = [];
    let streamID = 0x5020;

    for (let uniqueId in waveforms) {
        let waveform = waveforms[uniqueId];

        let event = new IOTileEvent(streamID, waveform.deviceTimestamp, waveform.summary, waveform.waveform, +uniqueId, waveform.utcTimestamp);
        events.push(event);
    }

    return events;
}
