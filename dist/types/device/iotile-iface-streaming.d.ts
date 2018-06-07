/// <reference path="../../../typings/cordova_plugins.d.ts" />
import * as IOTileTypes from "../common/iotile-types";
export declare class IOTileStreamingInterface {
    private channel;
    private removeStreamingHandler;
    private reportParser;
    constructor(bufferSize: number, expand?: boolean);
    open(channel: IOTileTypes.BLEChannel): Promise<void>;
    close(): Promise<void>;
    stop(): void;
    private receiveStreamingData(value);
}
