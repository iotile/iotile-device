import {IOTileAdvertisement} from "./iotile-advert-serv";
import {AbstractIOTileAdapter} from "./iotile-base-types";
import {deviceIDToSlug, packArrayBuffer, unpackArrayBuffer, mapStreamName, ArgumentError, ProgressNotifier, Mutex} from "iotile-common/build";
import * as Errors from "../common/error-space";
import {RawReading} from "../common/iotile-reports";

export interface BLEConnectionInfo {
  intervalMS: number;
  timeoutMS: number;
  preferredMinMS: number;
  preferredMaxMS: number;
};

export interface StreamerInfo {
  lastAttemptTime: number;
  lastSuccessTime: number;
  lastError: number;
  highestAck: number;

  lastStatus: number;
  backoffNumber: number;
  commStatus: number;
}

export enum MatchBy {
  MatchBySlot = 1,
	MatchController = 2,
	MatchByName = 3
}

export enum RemoteBridgeState {
  Idle = 0,
  WaitingForScript = 1,
  ReceivingScript = 2,
  ReceivedCompleteScript = 3,
  ValidatedScript = 4,
  ExecutingScript = 5
}

export interface RemoteBridgeStatus {
  state: RemoteBridgeState,
  lastError: number
}

/**
 * Proxy class for calling functionality on the script processing and firmware update engine on an IOTile Device
 */
export class RemoteBridge {
  private adapter: AbstractIOTileAdapter;

  constructor(adapter: AbstractIOTileAdapter) {
    this.adapter = adapter;
  }

  public beginScript(): Promise<void>{
    return this.adapter.errorHandlingRPC(8, 0x2100, "", "L", [], 10.0);
  }

  public endScript() {
    return this.adapter.errorHandlingRPC(8, 0x2102, "", "L", [], 2.0);
  }

  public triggerScript() {
    return this.adapter.errorHandlingRPC(8, 0x2103, "", "L", [], 2.0);
  }

  public resetScript() {
    return this.adapter.errorHandlingRPC(8, 0x2105, "", "L", [], 20.0);
  }

  public async queryStatus(): Promise<RemoteBridgeStatus> {
    let [state, error]: [RemoteBridgeState, number] = await this.adapter.typedRPC(8, 0x2104, "", "LL", [], 2.0);

    return {
      state: state,
      lastError: error
    };
  }
}

/**
 * Proxy class for calling functionality on the configuration variables of an IOTile Device
 */
export class Config {
  private adapter: AbstractIOTileAdapter;
  private configLock: Mutex;

  constructor(adapter: AbstractIOTileAdapter) {
    this.adapter = adapter;
    this.configLock = new Mutex;

  }

  public async setConfigVariable(target: string, id: number, fmt: string, data: number){

    let releaseConfig = await this.configLock.acquire();

    try {
      let db_status = await this.getConfigDatabaseInfo(fmt);
      if (!db_status){
        await this.compactConfigDatabase();
      }

      let err = await this.startEntry(id, target);
      if (err){
        throw new Error('Failed to start Config entry');
      }
      
      await this.pushData(fmt, data);
      await this.finishEntry();
      
    } finally {
      releaseConfig();
    }
  }

  // FIXME: clean up 0 B's to x's when x supported
  private async startEntry(id: number, target: string) {
    let args: ArrayBuffer;

    if (target == 'controller'){
      args = packArrayBuffer("HBBBBBBBB", id, 0, 0,0,0,0,0,0, MatchBy.MatchController);
    } else if (target.includes('slot')){
      let slot = target.split(" ")[1];
      if (+slot >= 0 && +slot <= 255){
        args = packArrayBuffer("HBBBBBBBB", id, slot, 0,0,0,0,0,0, MatchBy.MatchBySlot);
      } else {
        throw new ArgumentError("Slot number must be between 0 and 255");
      }
    } else {
      throw new ArgumentError("Only controller and numbered slot targets are supported");
    }

    let resp = await this.adapter.rpc(8, 0x2a07, args, 5.0);
    [resp] = unpackArrayBuffer("L", resp);
    return resp;
  }

  private async pushData(type: string, data: number){
    await this.adapter.errorHandlingRPC(8, 0x2a08, type, 'L', [data], 5.0);
  }

  private async finishEntry(){
    await this.adapter.errorHandlingRPC(8, 0x2a09, "", "L", [], 5.0);
  }

  // FIXME
  // public async getConfigVariable(target: string, id: number){
  //   // TODO: how to find index [call count; rpc(8, 0x2a0a, ...) [ignore 0 index]]
  //   let index: number;
  //   let meta = this.adapter.errorHandlingRPC(8, 0x2a0a, "H", "L16s", [index]);

  //   let name; // = this.getIdentifier(index, meta);
  //   let value; // = this.getData(index);

  //   let variable = {
  //       'metadata': meta,
  //       'name': name,
  //       'data': value
  //   };

  //   return variable;
  // }

  public async compactConfigDatabase(){
    await this.adapter.errorHandlingRPC(8, 0x2a0f, "", "L", [], 5.0);
  }

  public async getConfigDatabaseInfo(type: string): Promise<boolean> {
    let resp = await this.adapter.typedRPC(8, 0x2a10, "", "LHHHHHBB", [], 5.0);
    let [max_data, data_size, invalid_data, entry_count, invalid_count, max_entries] = resp;

    let typeSize: {[key: string]: number} = {
      'B': 1, 
      'b': 1, 
      'H': 2, 
      'h': 2, 
      'L': 4, 
      'l': 4
    }
    // make sure there's enough room to store config variable
    return (data_size + typeSize[type] < max_data);
    
  }
}

export class IOTileDevice {
  public advertisement: IOTileAdvertisement;
  public deviceID: number;
  public slug: string;
  public connectionID: any;

  private adapter: AbstractIOTileAdapter;
  private downloadLock: Mutex;

  constructor (adapter: AbstractIOTileAdapter, advData: IOTileAdvertisement) {
    this.advertisement = advData;
    this.deviceID = advData.deviceID;
    this.adapter = adapter;

    this.slug = deviceIDToSlug(this.deviceID);
    this.connectionID = advData.connectionID;
    this.downloadLock = new Mutex;
  }

  public async acknowledgeStreamerRPC(streamer: number, highestID: number, force: boolean) {
    let args = packArrayBuffer("HHL", streamer, force? 1: 0, highestID);

    let resp = await this.adapter.rpc(8, 0x200f, args, 2.0);

    let decoded = unpackArrayBuffer("L", resp);
    let err = decoded[0];

    //If we're not forcing the update then the device can return
    //that the update is older than what is currently has stored
    //which is not an error.
    if (!force && err === 0x8003801e) {
      return;
    }
    else if (err != 0) {
      throw new Errors.RPCError(8, 0x200f, err);
    }
  }

  public async queryStreamerRPC(streamer: number): Promise<StreamerInfo> {
    let resp = await this.adapter.typedRPC(8, 0x200a, "H", "LLLLBBBB", [streamer], 2.0);

    let info = {
      lastAttemptTime: resp[0],
      lastSuccessTime: resp[1],
      lastError: resp[2],
      highestAck: resp[3],
      lastStatus: resp[4],
      backoffNumber: resp[5],
      commStatus: resp[6]
    }

    return info;
  }

  public async tileVersionRPC(address: number): Promise<string> {
    let resp = await this.adapter.typedRPC(address, 0x4, "", "H6sBBBB", [], 2.0);

    let major = resp[2];
    let minor = resp[3];
    let patch = resp[4];

    return `${major}.${minor}.${patch}`;
  }

  public controllerVersionRPC(): Promise<string> {
    return this.tileVersionRPC(8);
  }

  /** 
   * IOTile controllers have an embedded 10 character long hardware id tag that uniquely
   * determines what hardware type they are.  This is important information to know when
   * seeing what kind of script or firmware update to apply since different hardware 
   * versions may require different scripts or different firmware. 
   * 
   * The value is padded out with null characters to exactly 10 bytes so make sure to
   * strip those out.
   */
  public async controllerHWVersionRPC(): Promise<string> {
    try {
      let [version]: [string] = await this.adapter.typedRPC(8, 0x2, "", "10s", [], 2.0);
      return version.replace(/[\0]+$/g, '');
    } catch (err) {
      //Very old firmware versions don't support the controller hw version rpc, so return null in that case
      //any other error code is an error that should be propagated to the caller.
      if (err instanceof Errors.RPCError && err.errorCode == Errors.RPCProtocolError.CommandNotFound)
        return "";

      throw err;
    }
  }

  public async highestUniqueIDRPC() {
    let [highestID] = await this.adapter.errorHandlingRPC(8, 0x2011, "", "LL", [], 2.0);
    return highestID;
  }

  public async graphInput(stream: string | number, value: number) {
    if (typeof stream == 'string'){
      stream = mapStreamName(stream);
    }
    await this.adapter.errorHandlingRPC(8, 0x2004, "LH", "L", [value, stream], 1.0);
  }

  /**
   * Clear all stored readings in the device.  
   * 
   * This removes all buffered and output stream data stored in the device.
   */
  public async clearAllReadings() {
    await this.adapter.errorHandlingRPC(8, 0x200c, "", "L", [], 2.0);
  }

  public async triggerStreamer(streamer: number) {
    let [error] = await this.adapter.typedRPC(8, 0x2010, "H", "L", [streamer], 1.0);
    return error;
  }

  public remoteBridge(): RemoteBridge {
    return new RemoteBridge(this.adapter);
  }

  public config(): Config {
    return new Config(this.adapter);
  }

  public async downloadStream(streamName: string, progress?: ProgressNotifier): Promise<RawReading[]> {
    let releaseStream = await this.downloadLock.acquire();

    try {
      let streamId = mapStreamName(streamName);
      let [err, count, device_time] = await this.adapter.errorHandlingRPC(8, 0x2008, "H", "LLLL", [streamId], 3.0);
      let now = new Date();

      let readings = [];
      let subNotifier: ProgressNotifier | undefined = undefined;

      if (err) {
        throw new ArgumentError(`Error starting stream download: ${err}`);
      }

      if (progress){
        subNotifier = progress.startOne(`Downloading ${count} readings`, count);
      }
      for (let i = 0; i < count; i++){
          let [timestamp, raw_reading] = await this.adapter.errorHandlingRPC(8, 0x2009, "", "LLL", [], 1.0);

          
          let timebase = new Date(now.valueOf() - (device_time*1000));
          let reading = new RawReading(streamId, raw_reading, timestamp, timebase);
          readings.push(reading);
          if (subNotifier){
            subNotifier.finishOne();
          }
        }
      
      return readings;
    } finally {
      releaseStream();
    }
  }

  public async inspectVirtualStream(stream: string | number): Promise<number> {
    if (typeof stream == 'string'){
      stream = mapStreamName(stream);
    }
    let [val] = await this.adapter.errorHandlingRPC(8, 0x200b, "H", "LL", [stream]);
    return val;
  }

  public async queryBLEConnectionInfo(): Promise<BLEConnectionInfo> {
    let [interval, timeout, prefMin, prefMax, prefTimeout] = await this.adapter.errorHandlingRPC(8, 0x8000, "", "LHHHHHH", [], 1.0);
    
    return {
      intervalMS: interval * 1.25,
      preferredMinMS: prefMin * 1.25,
      preferredMaxMS: prefMax * 1.25,
      timeoutMS: timeout * 10
    }
  }

  public async updateBLEParams(minIntervalMS: number, maxIntervalMS: number, timeoutMS: number) {
    let minInterval = Math.floor(minIntervalMS / 1.25);
    let maxInterval = Math.floor(maxIntervalMS / 1.25);
    let timeout = Math.floor(timeoutMS / 10);
    
    if (minIntervalMS < 7.5 || maxIntervalMS < minIntervalMS) {
      throw new ArgumentError(`Invalid interval given [${minIntervalMS}, ${maxIntervalMS}], must be min >= 7.5 ms, max >= min`);
    }

    if (timeoutMS < 100) {
      throw new ArgumentError(`Invalid connection timeout given (${timeoutMS} ms), must be >= 100 ms.`);
    }

    // NB, the last parameter is the slave latency that we do not support changing from 0.  There is never
    // a good reason for the app to request a change to the slave latency.
    let [err] = await this.adapter.errorHandlingRPC(8, 0x8001, "HHHH", "L", [minInterval, maxInterval, timeout, 0], 1.0);
    return err;
  }
}
