import {unpackArrayBuffer, packArrayBuffer} from "iotile-common/build";
import * as Errors from "../common/error-space";
import * as IOTileTypes from "../common/iotile-types";
import {catService} from "../config";

interface RPCData {
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
  StoppedFromPreviousErrors
}

export class IOTileRPCInterface {
  private channel: IOTileTypes.BLEChannel | null;

  private removeReceiveHeaderHandler: (() => Promise<void>) | null;
  private removeReceivePayloadHandler: (() => Promise<void>) | null;

  private rpcQueue: RPCData[];
  private processing: boolean;
  private currentRPC: RPCData | undefined;

  public stoppedFromErrors: boolean;
  public lastError: RPCError | null;

  constructor () {
    this.removeReceiveHeaderHandler = null;
    this.removeReceivePayloadHandler = null;
    this.channel = null;
    this.rpcQueue = [];
    this.processing = false;
    this.currentRPC = undefined;
    this.stoppedFromErrors = false;
    this.lastError = null;
  }

  public async open(channel: IOTileTypes.BLEChannel) {
    this.channel = channel;

    this.rpcQueue = [];
    this.processing = false;
    this.stoppedFromErrors = false;
    this.lastError = RPCError.OK;

    let that = this;
    this.removeReceiveHeaderHandler = await this.channel.subscribe(IOTileTypes.IOTileCharacteristic.ReceiveHeader, function(value: ArrayBuffer) {
      that.receiveHeader(value);
    });

    this.removeReceivePayloadHandler = await this.channel.subscribe(IOTileTypes.IOTileCharacteristic.ReceivePayload, function(value: ArrayBuffer) {
      that.receivePayload(value);
    });
  }

  public async rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer> {
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

    if (this.stoppedFromErrors) {
      throw new Errors.RPCError(address, rpcID, RPCError.StoppedFromPreviousErrors);
    }

    let promise = new Promise<ArrayBuffer>(function (resolve, reject) {
      queueItem.success = resolve;
      queueItem.failure = reject;
    });

    this.rpcQueue.push(queueItem);

    if (!this.processing) {
      this.processOne();
    }

    return promise;
  }

  public async close() {
    if (this.removeReceiveHeaderHandler !== null) {
      await this.removeReceiveHeaderHandler();
      this.removeReceiveHeaderHandler = null;
    }

    if (this.removeReceivePayloadHandler !== null) {
      await this.removeReceivePayloadHandler();
      this.removeReceivePayloadHandler = null;
    }
  }

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

    let that = this;
    setTimeout(function() {that.processOne();}, 0);
  }

  private receivePayload(value: ArrayBuffer) {
    if (this.stoppedFromErrors) {
      return;
    }

    if (this.currentRPC === undefined || !this.currentRPC.headerReceived) {
      this.fatalRPCError(RPCError.ResponseReceivedAtInvalidTime);
      return;
    }

    if (value.byteLength < this.currentRPC.expectedPayloadLength) {
      this.fatalRPCError(RPCError.IncorrectReceivedLength);
      return;
    }

    let truncatedValue = value.slice(0, this.currentRPC.expectedPayloadLength);
    this.currentRPC.success(truncatedValue);
    
    this.finishRPC();
  }

  private fatalRPCError(code: RPCError) {
    this.stoppedFromErrors = true;
    this.lastError = code;
    this.processing = false;

    //If there was an RPC in flight, stop processing it and fail
    if (this.currentRPC !== undefined) {
      this.currentRPC.failure(new Errors.RPCError(this.currentRPC.address, this.currentRPC.rpcID, code));
      
      if (this.currentRPC.timeoutHandler !== null) {
        clearTimeout(this.currentRPC.timeoutHandler);
      }

      this.currentRPC = undefined;
    }

    //If there were other RPCs queued, fail them all
    while (this.rpcQueue.length > 0) {
      let curr = this.rpcQueue.shift();
      if (curr){
        curr.failure(new Errors.RPCError(curr.address, curr.rpcID, RPCError.StoppedFromPreviousErrors));
      }
    }

    //Notify anyone who is listening that we are no longer able to process RPCs.
    if (this.channel){
      this.channel.notify(IOTileTypes.AdapterEvent.UnrecoverableRPCError, new Errors.RPCError(0, 0, code));
    }
  }

  private async processOne() {
    if (this.stoppedFromErrors) {
      return;
    }

    if (this.processing === true) {
      return;
    }

    if (this.rpcQueue.length === 0) {
      return;
    }

    this.processing = true;
    this.currentRPC = this.rpcQueue.shift();

    if (this.currentRPC && this.channel){
      let header = packArrayBuffer("BBHB", this.currentRPC.payload.byteLength, 0, this.currentRPC.rpcID, this.currentRPC.address);

    let that = this;

    //Schedule the timeout for this RPC in case it does not ever return
    this.currentRPC.timeoutHandler = <any>setTimeout(function() {    
      that.fatalRPCError(RPCError.UnexpectedRPCTimeout);
    }, this.currentRPC.internalTimeout*1000);

    /**
     * After the second await statement below, the RPC may have finished so no further access to
     * either currentRPC or any other RPC related state is possible 
     */
    try {
      let rpc = this.currentRPC;
      let start = Date.now();
      
      if (this.currentRPC.payload.byteLength > 0) {
        await this.channel.write(IOTileTypes.IOTileCharacteristic.SendPayload, this.currentRPC.payload);
      }

      await this.channel.write(IOTileTypes.IOTileCharacteristic.SendHeader, header);
      
      let end = Date.now();
      let actual = (end - start)/1000;
      if (actual > rpc.timeout){
        catService.error(`Timeout in RPC ${rpc.rpcID} on tile ${rpc.address}. Expected to take ${rpc.timeout} s; took ${actual} s`, Error);
      }

    } catch (err) {
      this.fatalRPCError(RPCError.BluetoothErrorWritingRPC);
    }
    }
  }
}
