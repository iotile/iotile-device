import {mapStreamName} from "iotile-common";
import {MockBLEDevice, MockDeviceArgs} from "../mock-ble-device";
import {VirtualDevice} from "../virtual-device";
import {BasicControllerTile} from "../tiles/basic-controller"; 

export interface WaterMeterArgs extends MockDeviceArgs {

}

export class NFC300 extends MockBLEDevice {
    constructor(iotileID: string | number, args: WaterMeterArgs) {
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

        controller.addRealtimeStreamer(mapStreamName('unbuffered node 11'), 1000);
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 13'), 1000);
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 12'), 1000);
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 14'), 1000);

        controller.pushReading(1, mapStreamName('unbuffered node 11'));
        controller.pushReading(1, mapStreamName('unbuffered node 13'));
        controller.pushReading(1, mapStreamName('unbuffered node 12'));
        controller.pushReading(1, mapStreamName('unbuffered node 14'));
    }
}