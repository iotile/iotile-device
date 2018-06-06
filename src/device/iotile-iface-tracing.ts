import * as Errors from "../common/error-space";
import * as IOTileTypes from "../common/iotile-types";
import {RingBuffer} from "../common/ring-buffer";

export class IOTileTracingInterface {
    private channel: IOTileTypes.BLEChannel | undefined;
    private removeTracingHandler: (() => Promise<void>) | null;

    private receivedData: RingBuffer;

    private resolveWaiter: ((buffer: ArrayBuffer) => void) | null;
    private rejectWaiter: ((any: any) => void) | null; 
    private waitLength: number | null;
    private waiterTimer: number | null;
    private waiterTimeout: number;

    constructor() {
        this.removeTracingHandler = null;
        this.receivedData = new RingBuffer(128, true);

        this.resolveWaiter = null;
        this.rejectWaiter = null;
        this.waiterTimer = null;
        this.waitLength = 0;
        this.waiterTimeout = 1000;
        this.channel = undefined;
    }

    public async open(channel: IOTileTypes.BLEChannel) {
        this.channel = channel;
        this.clearWaiter();
        this.clearData();

        this.removeTracingHandler = await this.channel.subscribe(IOTileTypes.IOTileCharacteristic.Tracing, (value: ArrayBuffer) => {
            this.receiveTracingData(value);
        });
    }

    public async close() {
        if (this.removeTracingHandler !== null) {
            await this.removeTracingHandler();
            this.removeTracingHandler = null;
        }

        if (this.rejectWaiter != null) {
            this.rejectWaiter(new Errors.ConnectionError("Tracing interface was closed."));
        }

        this.clearWaiter();
        this.clearData();
    }

    public receiveTracingData(value: ArrayBuffer) {
        this.receivedData.push(value);

        if (this.resolveWaiter != null && this.waitLength &&  this.receivedData.count >= this.waitLength) {
            this.resolveWaiter(this.receivedData.pop(this.waitLength));
            this.clearWaiter();
        } else if (this.resolveWaiter != null) {
            //We received more data, so push our watchdog timeout further down the line
            this.startWatchdogTimer();
        }
    }

    private startWatchdogTimer() {
        if (this.rejectWaiter == null) {
            return;
        }

        if (this.waiterTimer != null) {
            clearTimeout(this.waiterTimer);
        }

        this.waiterTimer = window.setTimeout(() => {
            if (this.rejectWaiter != null) {
                this.rejectWaiter(new Errors.StreamingTimeoutError("Timeout waiting for tracing data."));
                this.clearWaiter();
            }
        }, this.waiterTimeout);
    }

    private clearWaiter() {
        this.rejectWaiter = null;
        this.resolveWaiter = null;

        if (this.waiterTimer != null) {
            clearTimeout(this.waiterTimer);
        }

        this.waiterTimer = null;
        this.waitLength = null;
    }

    /**
     * Wait for a given number of bytes to be received by the tracing interface.
     * 
     * You can only have a single wait waiting for data at a time.  Attempting
     * to call waitForData again before the first promise resolves will result
     * in a rejected promise with OperationAtInvalidTimeError.
     */
    public waitForData(numBytes: number, timeout: number = 1000): Promise<ArrayBuffer> {
        if (this.resolveWaiter != null) {
            throw new Errors.OperationAtInvalidTimeError("You can only have one waiter waiting for tracing data at a time.", IOTileTypes.AdapterState.Connected, "Internal Tracing Error.");
        }

        return new Promise<ArrayBuffer>((resolve, reject) => {
            if (numBytes <= this.receivedData.count) {
                resolve(this.receivedData.pop(numBytes));
                return;
            }

            this.waitLength = numBytes;
            this.resolveWaiter = resolve;
            this.rejectWaiter = reject;
            this.waiterTimeout = timeout;
            this.startWatchdogTimer();
        });
    }

    public clearData() {
        this.receivedData.reset();
    }
}
