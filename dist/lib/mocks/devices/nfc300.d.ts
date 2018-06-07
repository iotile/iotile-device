import { MockBLEDevice, MockDeviceArgs } from "../mock-ble-device";
export interface WaterMeterArgs extends MockDeviceArgs {
}
export declare class NFC300 extends MockBLEDevice {
    constructor(iotileID: string | number, args: WaterMeterArgs);
}
