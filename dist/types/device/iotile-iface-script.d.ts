import * as IOTileTypes from "../common/iotile-types";
import { IOTileDevice } from "./iotile-device";
import { ProgressNotifier } from "iotile-common";
export declare class IOTileScriptInterface {
    private channel;
    private device;
    open(device: IOTileDevice, channel: IOTileTypes.BLEChannel): Promise<void>;
    send(script: ArrayBuffer, notifier: ProgressNotifier): Promise<void>;
    close(): Promise<void>;
}
