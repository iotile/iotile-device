import {unpackArrayBuffer, packArrayBuffer} from "iotile-common";
import * as Errors from "../common/error-space";
import * as IOTileTypes from "../common/iotile-types";
import {catService} from "../config";

export interface RPCData {
  rpcID: number;
  address: number;
  timeout: number;
  internalTimeout: number;
  timeoutHandler: number | null;
  payload: ArrayBuffer;
  headerReceived: boolean;
  expectedPayloadLength: number;
  success: (value: ArrayBuffer) => void,
  failure: (reason: Errors.RPCError) => void
}

export enum RPCError {
  OK = 0,
  UnexpectedRPCTimeout,
  ErrorWritingRPC,
  IncorrectReceivedLength,
  ResponseReceivedAtInvalidTime,
  BluetoothErrorWritingRPC,
  StoppedFromPreviousErrors,
  RPCQueueReset
}

export class RPCQueue {
    private rpcQueue: RPCData[];
    private processing: boolean;
    private currentRPC: RPCData | undefined;

    public stoppedFromErrors: boolean;
    public lastError: RPCError | null;

    public sendRPCHandler: (address: number, rpcID: number, payload: ArrayBuffer) => Promise<void>;
    public onFatalError: (error: Errors.RPCError) => void;

    constructor () {
        this.rpcQueue = [];
        this.processing = false;
        this.currentRPC = undefined;
        this.stoppedFromErrors = false;
        this.lastError = null;
        this.sendRPCHandler = (address, rpcID, payload) => Promise.reject(new Errors.InterfaceNotImplementedError(`sendRPCHandler in RPCQueue not implemented.`));
        this.onFatalError = (error) => {};
    }

    public reset(noClear?: boolean) {
        if (noClear !== true) {
            while (this.rpcQueue.length > 0) {
                let curr = this.rpcQueue.shift();
                if (curr) {
                    if (curr.timeoutHandler != null)
                        clearTimeout(curr.timeoutHandler);
                    
                    curr.failure(new Errors.RPCError(curr.address, curr.rpcID, RPCError.RPCQueueReset));
                }
            }
        }
        
        this.rpcQueue = [];
        this.processing = false;
        this.stoppedFromErrors = false;
        this.lastError = RPCError.OK;
    }

    public async queueRPC(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer> {
        let queueItem = {
            rpcID: rpcID,
            address: address,
            payload: payload,
            timeoutHandler: null,
            timeout: timeout || 1.0,
            internalTimeout: 15,
            success: function (value: ArrayBuffer) {},
            failure: function (err: Errors.RPCError) {},
            headerReceived: false,
            expectedPayloadLength: 0
        };

        if (this.stoppedFromErrors)
            throw new Errors.RPCError(address, rpcID, RPCError.StoppedFromPreviousErrors);

        let promise = new Promise<ArrayBuffer>(function (resolve, reject) {
            queueItem.success = resolve;
            queueItem.failure = reject;
        });

        this.rpcQueue.push(queueItem);

        if (!this.processing)
            this.processOne();

        return promise;
    }

    public rpcResponseHeaderReceived(status: number, payloadLength: number) {
        if (this.stoppedFromErrors)
            return;
    
        if (this.currentRPC == null) {
            this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
            return;
        }
    
        let statusCode = status & 0b00111111;
        let appDefined = !!(status & (1 << 6));
        let hasData = !!(status & (1 << 7));
        
        this.currentRPC.headerReceived = true;
        this.currentRPC.expectedPayloadLength = payloadLength;
    
        let rpcFinished = false;
    
        if (!appDefined || statusCode != 0) {
            //There was an error executing the RPC, reject the promise with an RPCError
            this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, status));
            rpcFinished = true;
        } else if (!hasData) {
            //If there is no data, we're done
            this.currentRPC.success(new ArrayBuffer(0));
            rpcFinished = true;
        } else {
            //We receive a valid header, now we need to wait for the payload
        }
    
        if (rpcFinished)
            this.finishRPC();
    }

    public rpcResponsePayloadReceived(payload: ArrayBuffer) {
        if (this.stoppedFromErrors)
            return;
    
        if (this.currentRPC === undefined || !this.currentRPC.headerReceived) {
            this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
            return;
        }
    
        if (payload.byteLength < this.currentRPC.expectedPayloadLength) {
            this.fatalRPCError(RPCError.IncorrectReceivedLength);
            return;
        }
    
        let truncatedValue = payload.slice(0, this.currentRPC.expectedPayloadLength);
        this.currentRPC.success(truncatedValue);
        
        this.finishRPC();
    }

    /*
  private receiveHeader(value: ArrayBuffer) {
    if (this.stoppedFromErrors) {
      return;
    }

    if (this.currentRPC === null || this.currentRPC === undefined) {
      this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
      return;
    }

    if (value.byteLength < 4) {
      this.fatalRPCError(RPCError.IncorrectReceivedLength);
      return;
    }

    let header = value.slice(0, 4);
    let resp = unpackArrayBuffer("BBBB", header);

    let status = resp[0];
    let statusCode = status & 0b00111111;
    let appDefined = !!(status & (1 << 6));
    let hasData = !!(status & (1 << 7));

    let payloadLength = resp[3];

    this.currentRPC.headerReceived = true;
    this.currentRPC.expectedPayloadLength = payloadLength;

    let rpcFinished = false;

    if (!appDefined || statusCode != 0) {
      //There was an error executing the RPC, reject the promise with an RPCError
      this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, status));
      rpcFinished = true;
    } else if (!hasData) {
      //If there is no data, we're done
      this.currentRPC.success(new ArrayBuffer(0));
      rpcFinished = true;
    } else {
      //We receive a valid header, now we need to wait for the payload
    }

    if (rpcFinished) {
      this.finishRPC();
    }
  }
    */

    /** 
     * Cleanup after an RPC is finished, removing its timeout handler and restarting the command queue
     */
    private finishRPC() {
        //We have received the response for this RPC, stop the timeout for it
        if (this.currentRPC && this.currentRPC.timeoutHandler !== null) {
            clearTimeout(this.currentRPC.timeoutHandler);
            this.currentRPC.timeoutHandler = null;
        }

        this.currentRPC = undefined;
        this.processing = false;
        setTimeout(() => this.processOne(), 0);
    }

    private fatalRPCError(code: RPCError) {
        this.stoppedFromErrors = true;
        this.lastError = code;
        this.processing = false;

        //If there was an RPC in flight, stop processing it and fail
        if (this.currentRPC !== undefined) {
            this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, code));
            
            if (this.currentRPC.timeoutHandler !== null)
                clearTimeout(this.currentRPC.timeoutHandler);

            this.currentRPC = undefined;
        }

        //If there were other RPCs queued, fail them all
        while (this.rpcQueue.length > 0) {
            let curr = this.rpcQueue.shift();
            if (curr)
                curr.failure(new Errors.RPCError(curr.address, curr.rpcID, RPCError.StoppedFromPreviousErrors));
        }

        //Notify anyone who is listening that we are no longer able to process RPCs.
        this.onFatalError(new Errors.RPCError(0, 0, code));
    }

    private async processOne() {
        if (this.stoppedFromErrors)
            return;

        if (this.processing === true)
            return;

        if (this.rpcQueue.length === 0)
            return;


        this.processing = true;
        this.currentRPC = this.rpcQueue.shift();

        if (this.currentRPC === undefined) {
            this.processing = false;
            return;
        }

        //Schedule the timeout for this RPC in case it does not ever return
        this.currentRPC.timeoutHandler = <any>setTimeout(() => this.fatalRPCError(RPCError.UnexpectedRPCTimeout), this.currentRPC.internalTimeout*1000);

        /*
         * After the await statement below, the RPC may have finished so no further access to
         * either currentRPC or any other RPC related state is possible.  Remember that await
         * statement can delay an arbitrary period of time so the line before and after the
         * await statement may be many seconds apart.
         */
        try {
            let rpc = this.currentRPC;

            //FIXME: add prototype for this function
            //let header = packArrayBuffer("BBHB", this.currentRPC.payload.byteLength, 0, this.currentRPC.rpcID, this.currentRPC.address);
            await this.sendRPCHandler(rpc.address, rpc.rpcID, rpc.payload);
        } catch (err) {
            catService.error(JSON.stringify(err), new Error(JSON.stringify(RPCError.BluetoothErrorWritingRPC)));
            this.fatalRPCError(RPCError.BluetoothErrorWritingRPC);
        }
    }
}
