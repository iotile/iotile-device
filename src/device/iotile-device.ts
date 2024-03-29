import { MQTTBridgeConfig } from './iotile-mqtt';
import {IOTileAdvertisement} from "./iotile-advert-serv";
import {AbstractIOTileAdapter} from "./iotile-base-types";
import {deviceIDToSlug, packArrayBuffer, unpackArrayBuffer, mapStreamName, ArgumentError, ProgressNotifier, Mutex, delay, LoggingBase} from "@iotile/iotile-common";
import * as Errors from "../common/error-space";
import {RawReading, SignedListReport, IOTileReport} from "../common/iotile-reports";
import {AdapterEvent} from "../common/iotile-types";
import {ReportParsingError} from "../common/error-space";
import { catAdapter, catIOTileDevice } from "../config";
import { ReportParserEvent } from "./iotile-report-parser";
import { NetworkConfig } from "./iotile-network";

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

export interface DeviceInfo {
  uuid: number,
  stateFlags: number,
  flags: number,
  appTag: number,
  appVersion: string,
  osTag: number,
  osVersion: string
}

export interface DeviceUptime {
  isUTC: false;
  isSynchronized: false;
  currentTime: number;
}

export interface DeviceUTCTime {
  isUTC: true;
  isSynchronized: boolean;
  currentTime: Date;
}

export function convertToSecondsSince2000(date: Date): number {
  let millisecondsAt2000 = Date.UTC(2000, 0, 1);
  let secondsSince2000 = Math.ceil((date.valueOf() - millisecondsAt2000) /1000);
  return secondsSince2000;
}

export type DeviceTime = DeviceUptime | DeviceUTCTime;

export interface ReceiveReportsOptions {
  expectedStreamers: {[key: number]: string},   //The indices of the streamers that we expect to receive reports from as well as the names that should be used in the ProgressNotifier
  requireAll?: boolean,           //Whether an exception should be received if there is no data on one or more of the streamers
}

export interface ReceiveReportsResult {
  reports: SignedListReport[],    // The actual SignedListReport objects received (only those from the streamers in expectedStreamers)
  receivedFromAll: boolean,       // Whether a report was received from every expected streamer
  receivedExtra: boolean,         // Whether extra SignedListReports were received from other streamers during this function    
}

export interface WaitReportsResult {
  numReceived: number,
  numInvalid: number
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
  private configLock: any;

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

  private async startEntry(id: number, target: string) {
    let args: ArrayBuffer;

    if (target == 'controller'){
      args = packArrayBuffer("H7xB", id, MatchBy.MatchController);
    } else if (target.includes('slot')){
      let slot = target.split(" ")[1];
      if (+slot >= 0 && +slot <= 255){
        args = packArrayBuffer("HB6xB", id, slot, MatchBy.MatchBySlot);
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

export class IOTileDevice extends LoggingBase {
  public advertisement: IOTileAdvertisement;
  public deviceID: number;
  public slug: string;
  public connectionID: any;

  public adapter: AbstractIOTileAdapter;

  public networkConfig: NetworkConfig;
  public mqttBridgeConfig: MQTTBridgeConfig;
  private downloadLock: any;

  constructor (adapter: AbstractIOTileAdapter, advData: IOTileAdvertisement) {
    super(catIOTileDevice);

    this.advertisement = advData;
    this.deviceID = advData.deviceID;
    this.adapter = adapter;

    this.networkConfig = new NetworkConfig(adapter, 10);
    this.mqttBridgeConfig = new MQTTBridgeConfig(adapter, 11);

    this.slug = deviceIDToSlug(this.deviceID);
    this.connectionID = advData.connectionID;
    this.downloadLock = new Mutex;
  }

  public async acknowledgeStreamerRPC(streamer: number, highestID: number, force: boolean) {
    if (streamer > 255) {
      throw new ArgumentError('Acknowledgement RPC called with invalid streamer index');
    }
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

  public async getDeviceInfo(): Promise<DeviceInfo> {
    let [uuid, stateFlags, flags, res1, res2, res3, osInfo, appInfo]: [number, number, number, number, number, number, number, number] = await this.adapter.typedRPC(8, 0x1008, "", "LLBBBBLL", [], 2.0);

    let osTag = osInfo & ((1 << 20) - 1)
    let osEncVersion = osInfo >> 20;

    let appTag = appInfo & ((1 << 20) - 1)
    let appEnvVersion = appInfo >> 20;

    return {
      uuid: uuid,
      stateFlags: stateFlags,
      flags: flags,
      osTag: osTag,
      osVersion: this.convertEncodedVersion(osEncVersion),
      appTag: appTag,
      appVersion: this.convertEncodedVersion(appEnvVersion)
    };
  }

  private convertEncodedVersion(encVersion: number) {
    let major = (encVersion >> 6) & ((1 << 6) - 1)
    let minor = (encVersion >> 0) & ((1 << 6) - 1)

    return `${major}.${minor}`;
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

  private async waitReports(notifier: ProgressNotifier, streamers: number[] | {[key: number]: string}): Promise<WaitReportsResult> {
    let reportInProgress: boolean = false;
    let reportFailed: boolean = false;
    let reportCount: number = 0;
    let invalidReports: number = 0;

    let streamerNames: {[key: number]: string} = {};
    let streamerNumbers: number[] = [];

    /**
     * Setup default names for all streamers if we were not passed in a dictionary
     */

     if (streamers instanceof Array) {
      for (let streamer of streamers)
        streamerNames[streamer] = `Report Type ${streamer}`;

      streamerNumbers = streamers;
     } else {
      streamerNames = streamers;
      for (let streamer of Object.keys(streamers))
        streamerNumbers.push(+streamer);
     }

    let subNotifier: ProgressNotifier | null = null;

    let progressCallback = (eventName: string, event: ReportParserEvent) => {
      this.logTrace(`waitReports received event: ${eventName}`, event);

      switch(event.name) {
        case 'ReportInvalidEvent':
        reportInProgress = false;
        invalidReports += 1;
        notifier.finishOne();
        break;

        case 'ReportFinishedEvent':
        reportInProgress = false;
        reportCount += 1;
        notifier.finishOne();
        break;

        case 'ReportStartedEvent':
        subNotifier = notifier.startOne(`Receiving ${getReportName(event.reportIndex, streamerNames)}`, 20);
        reportInProgress = true;
        break;

        case 'ReportProgressEvent':
        if (subNotifier != null)
          subNotifier.finishOne();

        reportInProgress = true;
        break;

        case 'ReportStalledEvent':
        case 'ReportParsingError':
        reportInProgress = false;
        reportFailed = true;
        break;
      }
    }

    let disconnectCallback = function (eventName: string, event: ReportParserEvent) {
        reportInProgress = false;
    }

    let reportStartedHandler = this.adapter.subscribe(AdapterEvent.RobustReportStarted, progressCallback);
    let reportStalledHandler = this.adapter.subscribe(AdapterEvent.RobustReportStalled, progressCallback);
    let reportParseErrorHandler = this.adapter.subscribe(AdapterEvent.UnrecoverableStreamingError, progressCallback);
    let reportProgressHandler =  this.adapter.subscribe(AdapterEvent.RobustReportProgress, progressCallback);
    let reportInvalidHandler = this.adapter.subscribe(AdapterEvent.RobustReportInvalid, progressCallback);
    let reportFinishedHandler = this.adapter.subscribe(AdapterEvent.RobustReportFinished, progressCallback);
    let reportDisconnectedHandler = this.adapter.subscribe(AdapterEvent.Disconnected, disconnectCallback);
    
    /**
     * Make sure to clear out any previous corrupt data from the streaming interface before starting to
     * receive new reports.  This prevents a permanent failure receiving data if there is a corrupt report
     * that has corruption in the first 20 bytes since that will cause it to decode as an invalid report
     * type and the report parser will enter permanent failure until you reconnect or reset the stream
     * interface.
     */
    this.adapter.resetStreaming();

    /**
     * It is very important that triggering the streamer happens after we install our handlers to capture
     * the status updates, otherwise we cannot guarantee that we will see a report event in < 500 ms
     * since we only get a progress event every 5% of the report.  For large reports that take > 10 seconds
     * to receive, we would miss the report started event since it happened when the report was triggered
     * and we would not get a report status event in < 500 ms so we would return early from this routine.
     */
    try {
      for (let key of streamerNumbers) {
        let info = await this.queryStreamerRPC(+key);
  
        this.logDebug(`Queried streamer ${key}`, {
          info: info
        });
  
        // Check if streamer has been triggered yet
        if (info.commStatus === 0) {
            let err = await this.triggerStreamer(+key);
            this.logDebug(`Triggered streamer ${key}`, {
              returnValue: err
            })
  
            // if error != no new reports
            if (err && (err !== 0x8003801f)) throw new Errors.FatalStreamingError(`Error triggering streamer ${key}, error: ${err}`, "Download Failed - Please Try Again");
          }
      }
  
      while (true) {
        await delay(500);
  
        if (reportInProgress) continue;
  
        await delay(100);

        if (!reportInProgress) break;
      }

      if (reportFailed) throw new Errors.FatalStreamingError("Stall while receiving a report", "Streaming Failed - Please Try Again");
    } finally {
      //clean up subscriptions
      reportStartedHandler();
      reportStalledHandler();
      reportProgressHandler();
      reportFinishedHandler();
      reportDisconnectedHandler();
      reportInvalidHandler();
      reportParseErrorHandler();
    }

    /** 
     * If we received fewer reports than we were expecting, make sure we finish the rest of the progress items
     */
    for (let i = reportCount; i < streamerNumbers.length; ++i) {
      notifier.startOne(`Skipping Report with No New Data`, 1);
      notifier.finishOne();
    }
    
    return {
      numInvalid: invalidReports,
      numReceived: reportCount
    }
  }

  public async receiveReports(options: ReceiveReportsOptions, progress?: ProgressNotifier): Promise<ReceiveReportsResult> {
    let result: ReceiveReportsResult = {reports: [], receivedFromAll: true, receivedExtra: false};

    if (!progress)
      progress = new ProgressNotifier();

    let receivedNames: number[] = [];

    // get the triggered reports as they come in
    let clearSubscription = this.adapter.subscribe(AdapterEvent.RawRobustReport, async (event: string, report: SignedListReport) => {
      try {
          // is this a report we care about?
          if (report.streamer in options.expectedStreamers && !(report.streamer in receivedNames)){
            result.reports.push(report);
            receivedNames.push(report.streamer);
          } else {
            result.receivedExtra = true;
          }
      } catch (err) {
        this.logException(`Could not process report: ${options.expectedStreamers[report.streamer]}`, new Error(err));
      }
    });

    try {
      let reportInfo = await this.waitReports(progress, options.expectedStreamers);
      this.logDebug("Result of waitReports", {
        streamers: options.expectedStreamers,
        result: reportInfo
      });

      if (reportInfo.numInvalid > 0)
        throw new Errors.FatalStreamingError(`Received ${reportInfo.numInvalid} invalid reports`, 'Download Failed - Please Try Again');
    } finally {
      clearSubscription();
    }

    for (let key of Object.keys(options.expectedStreamers)) {
      if (!(+key in receivedNames)){
        result.receivedFromAll = false;
      }
    }

    if (options.requireAll && !result.receivedFromAll) {
      this.logError(`Failed to receive all required streamers`, {
        result: result,
        options: options
      });

      throw new Errors.FatalStreamingError(`Missing required report`, 'Download Failed - Please Try Again');
    }

    //Make sure we finish 

    return result;
  }

  public remoteBridge(): RemoteBridge {
    return new RemoteBridge(this.adapter);
  }

  public config(): Config {
    return new Config(this.adapter);
  }

  public async currentTime(synchronizationSlopSeconds: number = 60): Promise<DeviceTime> {
    let deviceTime: DeviceTime;
    let [timestamp] = await this.adapter.typedRPC(8, 0x1001, "", "L", []);
    catAdapter.info(`Timestamp is: ${timestamp}`);

    if (!!(timestamp & (1 << 31)) === true){
      let secondsSince2000 = timestamp & ((1 << 31) - 1);
      catAdapter.info(`Seconds since 2000: ${secondsSince2000}`);
      let convertedSeconds = (Date.UTC(2000, 0, 1) / 1000) + secondsSince2000;
      let convertedTime = new Date(convertedSeconds * 1000);
      let currentSeconds = Date.now() / 1000;
      
      //If UTC is set and decoded Date is within synchronizationSlopSeconds of our current time
      //sets isSynchronized to true.
      let synched = (Math.abs(convertedSeconds - currentSeconds) <= synchronizationSlopSeconds);

      //Returns a DeviceUTCTime if UTC is set
      deviceTime = {
        isUTC: true,
        isSynchronized: synched,
        currentTime: convertedTime
      };
    } else {
      //Returns a DeviceUptime if UTC is not set
      deviceTime = {
          isUTC: false,
          isSynchronized: false,
          currentTime: timestamp
        };
    }
    
    return deviceTime;
  }

  public async synchronizeTime(forcedTime?: Date): Promise<number> {
    if (!forcedTime){
      forcedTime = new Date();
    }

    let secondsSince2000 = convertToSecondsSince2000(forcedTime);
    catAdapter.info(`Sending time to RTC: ${secondsSince2000}`);

    await this.adapter.errorHandlingRPC(8, 0x1010, "L", "L", [secondsSince2000]);
    return secondsSince2000;
  }

  public async downloadStream(streamName: string, progress?: any): Promise<RawReading[]> {
    let releaseStream = await this.downloadLock.acquire();

    try {
      let streamId = mapStreamName(streamName);
      let [err, count, device_time] = await this.adapter.errorHandlingRPC(8, 0x2008, "H", "LLLL", [streamId], 3.0);
      let now = new Date();

      let readings = [];
      // @ts-ignore
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

  public async updateBLEParams(minIntervalMS: number, maxIntervalMS: number, timeoutMS: number): Promise<number> {
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
    let [err]: [number] = await this.adapter.typedRPC(8, 0x8001, "HHHH", "L", [minInterval, maxInterval, timeout, 0], 1.0);
    return err;
  }
}

function getReportName(streamer: number, streamerNames: {[key: number]: string}): string {
  if (!(streamer in streamerNames))
    return "Extra Report";

  return streamerNames[streamer];
}