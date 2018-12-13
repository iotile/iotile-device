export interface AxisSummary {
    deltaV: number,
    peak: number,
    timeAboveThreshold: number
}

export class ShockInfo {
    public peakVal: number;
    private peakAxis: number;
    public duration: number;
    public dVx: number;
    public dVy: number;
    public dVz: number;

    constructor(peakVal : number, peakAxis: number, duration: number,
        dVx: number, dVy: number, dVz: number) {
            this.peakAxis = peakAxis;
            // convert from mg/LSB to G
            this.peakVal = peakVal * 0.049;
            this.duration = duration;
            // convert to m/s from 16.16 fixed point format
            this.dVx = dVx / 65536.0;
            this.dVy = dVy / 65536.0;
            this.dVz = dVz / 65536.0;
        }

        public get axis(): string {
            let axisMap: {[key: number]: string} = {
                0: 'X',
                1: 'Y',
                2: 'Z'
            }
            return axisMap[this.peakAxis];
        }

        public get largestDeltaV(): number {
            let max = Math.max(Math.abs(this.dVx), Math.abs(this.dVy), Math.abs(this.dVz));
            return max * 39.3701;
        }
}

export type PeakAxis = "x" | "y" | "z";

/** 
 * The expected waveform data format that needs to be uploaded to IOTile.cloud. 
 */
export interface WaveformData {
    acceleration_data: {
        x: number[],
        y: number[],
        z: number[],
    },
    sampling_rate: number,
    crc_code: number
};

export type WaveformInfo = {
    [key: number]: {"timestamp": number,
                    "crcCode": number,
                    "waveform": WaveformData,
                    "rawWaveform": ArrayBuffer}
};

export type RawWaveformInfo = {
    [key: number]: {
        timestamp: number,
        crcCode: number,
        rawWaveform: ArrayBuffer
    }
};

/** 
 * This is the expected waveform summary information that needs to be uploaded in
 * extra_data with each waveform event to iotile.cloud.
 */
export interface WaveformSummary {
    peak: number,
    axis: PeakAxis,
    duration: number,
    delta_v_x: number,
    delta_v_y: number,
    delta_v_z: number
};