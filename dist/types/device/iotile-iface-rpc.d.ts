import * as IOTileTypes from "../common/iotile-types";
export declare enum RPCError {
    OK = 0,
    UnexpectedRPCTimeout = 1,
    ErrorWritingRPC = 2,
    IncorrectReceivedLength = 3,
    ResponseReceivedAtInvalidTime = 4,
    BluetoothErrorWritingRPC = 5,
    StoppedFromPreviousErrors = 6,
}
export declare class IOTileRPCInterface {
    private channel;
    private removeReceiveHeaderHandler;
    private removeReceivePayloadHandler;
    private rpcQueue;
    private processing;
    private currentRPC;
    stoppedFromErrors: boolean;
    lastError: RPCError | null;
    constructor();
    open(channel: IOTileTypes.BLEChannel): Promise<void>;
    rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer>;
    close(): Promise<void>;
    private receiveHeader(value);
    /**
     * Cleanup after an RPC is finished, removing its timeout handler and restarting the command queue
    */
    private finishRPC();
    private receivePayload(value);
    private fatalRPCError(code);
    private processOne();
}
