import { IOTileDevice } from "./iotile-device";
import { IOTileAdapter } from "./iotile-serv";

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
    private device: IOTileDevice;
    private adapter: IOTileAdapter;

    constructor(device: IOTileDevice, adapter: IOTileAdapter) {
        this.device = device;
        this.adapter = adapter;
    }

    public getAccelermeterStatus(){

    }

    public async getShockInfo(shock: number): Promise<ShockInfo> {
        let [peak, duration, dVx, dVy, dVz] = await this.adapter.typedRPC(12, 0x8004, 'BB', 'HHlll', [1, shock]);

        let peakVal = peak >> 2;
        let peakAxis = peak & 0b11;

        return new ShockInfo(peakVal, peakAxis, duration, dVx, dVy, dVz);
    }

}