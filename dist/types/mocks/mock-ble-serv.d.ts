import { MockBLEDevice } from "./mock-ble-device";
export declare class MockBleService {
    devices: MockBLEDevice[];
    scanInfo: {
        inProgress: boolean;
        discoveryTimer: any;
    };
    connectionInfo: any;
    Config: any;
    constructor(Config: any);
    isEnabled(yesCallback: any, noCallback: any): void;
    startScan(services: any, success: any, failure: any): void;
    stopScan(success: any, failure: any): void;
    connect(deviceID: number, success: any, failure: any): void;
    finishConnection(callback: any): void;
    isConnected(deviceID: number, success: any, failure: any): void;
    disconnect(deviceID: number, success: any, failure: any): void;
    force_disconnect(): void;
    write(deviceID: number, serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any): void;
    writeWithoutResponse(deviceID: number, serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any): void;
    startNotification(deviceID: number, serviceID: string, charID: string, success: any, failure: any): void;
    stopNotification(deviceID: number, serviceID: string, charID: string, success: any, failure: any): void;
}
