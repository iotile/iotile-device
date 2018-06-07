import { MockBLEDevice, MockDeviceArgs } from "../mock-ble-device";
export interface TemperatureArgs extends MockDeviceArgs {
}
export declare class TemperaturePOD extends MockBLEDevice {
    constructor(iotileID: string | number, args: TemperatureArgs);
}
