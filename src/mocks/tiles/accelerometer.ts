import {tileRPC, VirtualTile, RPCResponse, VersionInfo, packError} from "../virtual-device";
import { ArgumentError } from "@iotile/iotile-common";
import { buildIndividualReport } from "../utilities";
import { resolve } from "path";

const TILE_STATE_TABLE: {[key: string]: number} = {
    "initializing": 0,
    "capturing": 1,
    "streaming": 2
}

const status = {
    'tile_state': TILE_STATE_TABLE.capturing,
    'recording': true,
    'settled': true,
    'streaming': false,
}

const flagMask = {
    recording: 1 << 0,
    settled: 1 << 2,
    streaming: 1 << 4,
}

const defaultShock: Shock = {
    peak: 322,
    duration: 164,
    dVx: -41510,
    dVy: 56537,
    dVz: -16622,
}

export interface Shock {
    peak: number,
    duration: number,
    dVx: number,
    dVy: number,
    dVz: number,
}

export interface ShockInfo {
    last: Shock,
    maxG: Shock,
    maxDeltaV: Shock
}

export type NotificationCallback = (ArrayBuffer: ArrayBuffer) => void;
export type PrestreamingHook = (controller: AccelerometerTile) => ArrayBuffer[];

export class AccelerometerTile extends VirtualTile {

    private accelStatus: any;

    private shockInfo: ShockInfo;

    private config: any;

    constructor(firmwareVersion: string = "2.3.5", initAccelStatus = status, config: any = {}) {
        super(12, 'Accel ', firmwareVersion);

        this.accelStatus = initAccelStatus;

        this.shockInfo = {
            last: defaultShock,
            maxG: defaultShock,
            maxDeltaV: defaultShock,
        }

        this.config = config;
    }

    /*
     * Publicly available controller RPCs
     * 
     * These RPC functions represent the emulated public behavior of an
     * accelerometer tile.
     */

    @tileRPC(0x8004, "BB", "HHlll")
    public getShockInfo(type: number): RPCResponse {
        let shock: Shock;

        switch (type) {
            case 0: // last shock
            shock = this.shockInfo.last;
            break;

            case 1: // max G shock
            shock = this.shockInfo.maxG;
            break;

            case 2: // max deltaV shock
            shock = this.shockInfo.maxDeltaV;
            break;

            default:
            shock = defaultShock;
        } 

        const {peak, duration, dVx, dVy, dVz} = shock;
        return [peak, duration, dVx, dVy, dVz]
    }

    @tileRPC(0x8006, "", "LLBBBBHHHBB")
    public getAccelerometerStatus(): RPCResponse {
        let flags = 1;

        this.accelStatus.recording ? flags |= flagMask.recording : flags &= ~flagMask.recording;
        this.accelStatus.settled ? flags |= flagMask.settled : flags &= ~flagMask.settled;
        this.accelStatus.streaming ? flags |= flagMask.streaming : flags &= ~flagMask.streaming;

        const status = [
            0, // last_err
            0, // shock_counter
            this.accelStatus.tile_state, // tile_state
            0, // _unused 
            0, // state
            flags, // flags
            0, // x
            0, // y
            0, // z
            0, // _unused2
            0 // _unused3
        ];

        return status;
    }

    @tileRPC(0x8035, "", "")
    public pauseRecording(): RPCResponse {
        setTimeout(() => {
            this.accelStatus.recording = false;
        }, 500)

        return []
    }

    @tileRPC(0x8036, "", "")
    public resumeRecording(): RPCResponse {
        this.accelStatus.recording = true;
        this.accelStatus.settled = false;
        setTimeout(() => {
            this.accelStatus.settled = true;
        }, 1500)

        return []
    }

    @tileRPC(0x8038, "", "L")
    public async enterStreamingMode(): Promise<RPCResponse> {
        return new Promise<RPCResponse>(resolve => {
            setTimeout(() => {
                this.accelStatus.tile_state = TILE_STATE_TABLE.streaming;
                resolve([0]);
            }, 300)
        })
    }

    @tileRPC(0x8039, "", "L")
    public async leaveStreamingMode(): Promise<RPCResponse> {
        return new Promise<RPCResponse>(resolve => {
            setTimeout(() => {
                this.accelStatus.tile_state = TILE_STATE_TABLE.capturing;
                resolve([0]);
            }, 300)
        })
    }

    @tileRPC(0x803A, "LHB", "LL")
    public sortStoredWaveforms(skipID: number, highestN: number, sortCriteria: number): RPCResponse {
        // TODO: implemment
        const count = 0;
        return [0, count];
    }

    @tileRPC(0x803E, "", "HHH")
    public streamSortedWaveforms(): RPCResponse {
        // TODO: implemment
        const count = 0;
        const filler = 0;

        // For now, simulate that we streamed for 500ms
        this.accelStatus.streaming = true;
        setTimeout(() => {
            this.accelStatus.streaming = false;
        }, 500)

        return [0, count, filler];
    }

    public setShockInfo(type: number, shock: Shock) {
        switch (type) {
            case 0: // last shock
            this.shockInfo.last = shock;
            break;

            case 1: // max G shock
            this.shockInfo.maxG = shock;
            break;

            case 2: // max deltaV shock
            this.shockInfo.maxDeltaV = shock;
            break;

            default:
            throw new ArgumentError(`Unrecognized shock info type: ${type}`);
        } 
    }
}
