import { IOTileDevice } from "./iotile-device";
import { IOTileAdapter } from "./iotile-serv";
import { catAdapter } from "../config";
import { ConnectionError } from "../common/error-space";

export class ShockInfo {
    public peakVal: number;
    private peakAxis: number;
    public duration: number;
    public dVx: number;
    public dVy: number;
    public dVz: number;

    constructor(peakVal : number, peakAxis: number, duration: number,
        dVx: number, dVy: number, dVz: number){
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

export class POD1M {
    public device: IOTileDevice;
    public adapter: IOTileAdapter;

    constructor(device: IOTileDevice, adapter: IOTileAdapter) {
        this.device = device;
        this.adapter = adapter;
    }

    public async getShockInfo(shock: number): Promise<ShockInfo> {
        let [peak, duration, dVx, dVy, dVz] = await this.adapter.typedRPC(12, 0x8004, 'BB', 'HHlll', [1, shock]);

        let peakVal = peak >> 2;
        let peakAxis = peak & 0b11;

        return new ShockInfo(peakVal, peakAxis, duration, dVx, dVy, dVz);
    }

    public async getAccelerometerStatus(){
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

            return status
        } catch (err){
            catAdapter.error(`Couldn't get accelerometer tile status: `, new Error(err));
            throw new ConnectionError("Lost connection to accelerometer tile");
        } 
    }

}