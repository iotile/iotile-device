import {MockBLEDevice, MockDeviceArgs} from "../mock-ble-device";
import {VirtualDevice} from "../virtual-device";
import {BasicControllerTile} from "../tiles/basic-controller";
import {createHashListReport, buildIndividualReport} from "../utilities";

export interface StreamTestArgs extends MockDeviceArgs {

}

export class StreamTestDevice extends MockBLEDevice {
    constructor(iotileID: string | number, args: StreamTestArgs) {
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

        let robust = createHashListReport(iotileID, 2, 0, 0, [{stream: 0x5000, value: 0, id: 1, timestamp: 0}]);
        let realtime = buildIndividualReport(iotileID, 0x100b, 1);
        controller.queuedReports = [robust, realtime];
    }
}
