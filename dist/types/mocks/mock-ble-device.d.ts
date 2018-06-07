import { VirtualDevice } from "./virtual-device";
export interface MockDeviceArgs {
    "appVersion": string;
    "appTag": number;
    "osTag": number;
    "osVersion": string;
    "hwVersion": string;
    "connected"?: boolean;
}
export declare class MockBLEDevice {
    private advertising;
    rssi: number;
    connected: boolean;
    id: number;
    private subscriptions;
    protected rpcs: any;
    private payload;
    device: VirtualDevice;
    constructor(device: VirtualDevice, connected: boolean);
    private buildAdvertising(uuid, voltage);
    unsubscribe(serviceID: string, charID: string, success: any, failure: any): void;
    subscribe(serviceID: string, charID: string, success: any, failure: any): void;
    disconnect(success: any): void;
    private notify(packet, charID);
    write(serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any): void;
    private rpc(headerData, payloadData);
}
