import { MockBLEDevice, MockDeviceArgs } from "../mock-ble-device";
export interface StreamTestArgs extends MockDeviceArgs {
}
export declare class StreamTestDevice extends MockBLEDevice {
    constructor(iotileID: string | number, args: StreamTestArgs);
}
