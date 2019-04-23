import { AccelerometerTile } from './../tiles/accelerometer';
import {mapStreamName} from "@iotile/iotile-common";
import {MockBLEDevice, MockDeviceArgs} from "../mock-ble-device";
import {VirtualDevice, rpc, RPCResponse} from "../virtual-device";
import {BasicControllerTile} from "../tiles/basic-controller"; 
import {createHashListReport, buildIndividualReport} from "../utilities";

export interface ShippingArgs extends MockDeviceArgs {
 
}

export class ShippingPOD extends MockBLEDevice {
    constructor(iotileID: string | number, args: ShippingArgs) {
        let connected = args.connected;

        if (connected == null) {
            connected = false;
        }

        if (typeof iotileID === "string") {
            iotileID = parseInt(iotileID, 16);
        }

        let device = new VirtualPod1M(iotileID);
        super(device, connected);
    }
}

export class VirtualPod1M extends VirtualDevice {

    private accelerometer: AccelerometerTile;

    constructor(iotileID: number) {
        let controller = new BasicControllerTile(iotileID, {appTag: 2049, appVersion: "0.0", osTag: 1024, osVersion: "0.0"}, "2.11.4", "btc1_v3");
        let accelerometer = new AccelerometerTile();

        super(iotileID, [controller, accelerometer])

        this.accelerometer = accelerometer;

        // push environmental readings
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 18'), 1000);
        controller.pushReading(2040, mapStreamName('unbuffered node 18'));
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 15'), 1000);
        controller.pushReading(2041, mapStreamName('unbuffered node 15'));
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 22'), 1000);
        controller.pushReading(2042, mapStreamName('unbuffered node 22'));
        controller.addRealtimeStreamer(mapStreamName('unbuffered node 25'), 1000);
        controller.pushReading(2043, mapStreamName('unbuffered node 25'));
        
        // push start event data
        controller.pushReading(1555428985, mapStreamName('system buffered node 1536'));
    }


    @rpc(8, 0x2004, "LH", "L")
    public graphInput(value: any, stream: any): RPCResponse {
        switch (stream) {
            case 15874: // pause/resume recording input
            if (value) {
                this.rpc(12, 0x8036) //resume
            }
            else {
                this.rpc(12, 0x8035) //pause
            }
        }

        return [0];
    }
}