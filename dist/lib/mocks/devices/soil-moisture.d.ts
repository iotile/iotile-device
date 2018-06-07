import { MockBLEDevice, MockDeviceArgs } from "../mock-ble-device";
export interface SoilMoistureArgs extends MockDeviceArgs {
    double: boolean;
}
export declare class SoilMoisturePOD extends MockBLEDevice {
    constructor(iotileID: string | number, args: SoilMoistureArgs);
}
