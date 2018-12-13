import {mapStreamName} from "@iotile/iotile-common";
import {MockBLEDevice, MockDeviceArgs} from "../mock-ble-device";
import {VirtualDevice} from "../virtual-device";
import {BasicControllerTile} from "../tiles/basic-controller"; 

export interface SoilMoistureArgs extends MockDeviceArgs {
    double: boolean;
}

export class SoilMoisturePOD extends MockBLEDevice {
    constructor(iotileID: string | number, args: SoilMoistureArgs) {
        let connected = args.connected;

        if (connected == null) {
            connected = false;
        }

        if (typeof iotileID === "string") {
            iotileID = parseInt(iotileID, 16);
        }

        let controller = new BasicControllerTile(iotileID, {appTag: 1024, appVersion: "0.0", osTag: 1024, osVersion: "0.0"}, "2.11.4", "btc1_v3");
        let device = new VirtualDevice(iotileID, [controller]);
        super(device, connected);

        controller.addRealtimeStreamer(mapStreamName('unbuffered node 15'), 1000);
        controller.pushReading(2048, mapStreamName('unbuffered node 15'));
        if (args.double) {
            controller.addRealtimeStreamer(mapStreamName('unbuffered node 16'), 1000);
            controller.pushReading(1024, mapStreamName('unbuffered node 16'));
        }
        
    }
}
