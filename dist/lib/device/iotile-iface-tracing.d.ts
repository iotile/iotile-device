import * as IOTileTypes from "../common/iotile-types";
export declare class IOTileTracingInterface {
    private channel;
    private removeTracingHandler;
    private receivedData;
    private resolveWaiter;
    private rejectWaiter;
    private waitLength;
    private waiterTimer;
    private waiterTimeout;
    constructor();
    open(channel: IOTileTypes.BLEChannel): Promise<void>;
    close(): Promise<void>;
    receiveTracingData(value: ArrayBuffer): void;
    private startWatchdogTimer();
    private clearWaiter();
    /**
     * Wait for a given number of bytes to be received by the tracing interface.
     *
     * You can only have a single wait waiting for data at a time.  Attempting
     * to call waitForData again before the first promise resolves will result
     * in a rejected promise with OperationAtInvalidTimeError.
     */
    waitForData(numBytes: number, timeout?: number): Promise<ArrayBuffer>;
    clearData(): void;
}
