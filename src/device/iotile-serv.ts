///<reference path="../../typings/cordova_plugins.d.ts"/>
import * as Errors from "../common/error-space";
import {AdapterState, AdapterEvent, IOTileCharacteristic, NotificationCallback, 
  BLEChannel, UserRedirectionInfo, Platform} from "../common/iotile-types";
import {IOTileAdvertisement, IOTileAdvertisementService} from "./iotile-advert-serv";
import {IOTileRPCInterface} from "./iotile-iface-rpc";
import {IOTileScriptInterface} from "./iotile-iface-script";
import {IOTileStreamingInterface} from "./iotile-iface-streaming";
import {IOTileTracingInterface} from "./iotile-iface-tracing";
import {ArgumentError, UnknownKeyError, packArrayBuffer, unpackArrayBuffer, delay, BaseError} from "@iotile/iotile-common";
import {BLEConnectionOptimizer} from "./iotile-ble-optimizer";
import {AbstractIOTileAdapter} from "./iotile-base-types";
import {IOTileDevice} from "./iotile-device";
import {AbstractNotificationService} from "../common/notification-service";
import {catAdapter} from "../config";
import { MockBleService } from "../mocks/mock-ble-serv";
import { Category } from "typescript-logging";


/**
 * @ngdoc overview
 * @name iotile.device
 * @description
 * 
 * # Introduction
 * The `iotile.device` module contains all services and classes needed for interacting
 * with IOTile Devices, including receiving data from them, sending commands to them,
 * updating their firmware and querying their status.  It is designed to be dropped into
 * an otherwise IOTile unaware angular application and provide a small API that encapsulates
 * all necessary interactions with IOTile Devices.
 * 
 * The main point of entry in the `iotile.device` module is the `IOTileAdapter` service, which
 * is the only public service provided by `iotile.device`.  The `IOTileAdapter` service provides
 * a way to scan for, connect to, receive data from, control and update IOTile Devices.  
 * 
 */
export type ConnectionHookCallback = (device: IOTileDevice, adapter: IOTileAdapter) => Promise<UserRedirectionInfo>;
export type PreconnectionHookCallback = (device: IOTileAdvertisement, adapter: IOTileAdapter) => Promise<UserRedirectionInfo>;

const ReceiveHeaderCharacteristic = '2001';
const ReceivePayloadCharacteristic = '2002';
const SendHeaderCharacteristic = '2003';
const SendPayloadCharacteristic = '2004';
const StreamingCharacteristic = '2005';
const HighspeedDataCharacteristic = '2006';
const TracingCharacteristic = '2007';

export interface ConnectionOptions {
  noStreamInterface?: boolean,
  noRPCInterface?: boolean,
  scanIfNotFound?: boolean,
  prestreamingHook?: ConnectionHookCallback
  noninteractive?: boolean
}

interface ScanStartedArgs {

}

interface ScanFinishedArgs {
  count: number;
}

export enum Interface {
  RPC,
  Streaming,
  Script,
  Tracing
}

let IOTileServiceName: string = '00002000-3FF7-53BA-E611-132C0FF60F63';


export class IOTileAdapter extends AbstractIOTileAdapter {
  notification: AbstractNotificationService;
  connectedDevice: IOTileDevice | null;

  state: AdapterState;
  adParser: IOTileAdvertisementService;

  private connectionHooks: ConnectionHookCallback[];
  private preconnectionHooks: PreconnectionHookCallback[];
  
  public lastScanResults: IOTileAdvertisement[];
  public mockBLEService: any;
  public catAdapter: Category;
  private config: any;

  public rpcInterface: IOTileRPCInterface;
  private streamingInterface: IOTileStreamingInterface;
  private scriptInterface: IOTileScriptInterface;
  private tracingInterface: IOTileTracingInterface;
  private tracingOpen: boolean;

  private charManagers: {[key: number]: CharacteristicManager} = {};
  private characteristicNames: {[key: number]: string} = {};

  private adapterEventNames: {[key: number]: string} = {};

  private supportsFastWrites: boolean;
  //This value is valid when we are connected to an IOTile device and returns whether
  //the connection is showing an interactive device page where you could pop up a UI
  //element like a dialog box.  This is primarily used in the connection hooks to 
  //determine whether they should show a message or ask the user a question during 
  //a connection.
  public interactive: boolean;
  public connectionMessages: any[];
  
  constructor (Config: any, notificationService: AbstractNotificationService, platform: Platform) {
    super();
    
    this.adParser = new IOTileAdvertisementService(Config.BLE.ARCH_BLE_COMPANY_ID, platform);
    this.config = Config;
    this.catAdapter = catAdapter;
    this.notification = notificationService;
    this.state = AdapterState.Idle;
    this.connectionHooks = [];
    this.preconnectionHooks = [];
    this.lastScanResults = [];
    this.connectedDevice = null;
    this.tracingOpen = false;

    this.interactive = false;
    this.supportsFastWrites = false;
    this.connectionMessages = [];

    this.characteristicNames[IOTileCharacteristic.ReceiveHeader] = '2001';
    this.characteristicNames[IOTileCharacteristic.ReceivePayload] = '2002';
    this.characteristicNames[IOTileCharacteristic.SendHeader] = '2003';
    this.characteristicNames[IOTileCharacteristic.SendPayload] = '2004';
    this.characteristicNames[IOTileCharacteristic.Streaming] = '2005';
    this.characteristicNames[IOTileCharacteristic.HighspeedData] = '2006';
    this.characteristicNames[IOTileCharacteristic.Tracing] = '2007';

    //Names of all of our adapter events for broadcasting using angular's emit      
    this.adapterEventNames[AdapterEvent.ScanStarted] = "adapter_scanstarted";
    this.adapterEventNames[AdapterEvent.ScanFinished] = "adapter_scanfinished";
    this.adapterEventNames[AdapterEvent.Connected] = "adapter_connected";
    this.adapterEventNames[AdapterEvent.ConnectionStarted] = "adapter_connectionstarted";
    this.adapterEventNames[AdapterEvent.ConnectionFinished] = "adapter_connectionfinished";
    this.adapterEventNames[AdapterEvent.Disconnected] = "adapter_disconnected";
    this.adapterEventNames[AdapterEvent.UnrecoverableRPCError] = "adapter_unrecoverablerpcerror";
    this.adapterEventNames[AdapterEvent.UnrecoverableStreamingError] = "adapter_streamingerror";
    this.adapterEventNames[AdapterEvent.RawRealtimeReading] = "adapter_rawrealtimereading";
    this.adapterEventNames[AdapterEvent.RawRobustReport] = "adapter_rawrobustreport";
    this.adapterEventNames[AdapterEvent.RobustReportStarted] = "adapter_robustreportstarted";
    this.adapterEventNames[AdapterEvent.RobustReportStalled] = "adapter_robustreportstalled";
    this.adapterEventNames[AdapterEvent.RobustReportProgress] = "adapter_robustreportprogress";
    this.adapterEventNames[AdapterEvent.RobustReportFinished] = "adapter_robustreportfinished";
    this.adapterEventNames[AdapterEvent.RobustReportInvalid] = "adapter_robustreportinvalid";
    this.adapterEventNames[AdapterEvent.StreamingInterrupted] = "adapter_streaminginterrupted";

    if (Object.keys(this.adapterEventNames).length !== AdapterEvent.Length) {
      throw new BaseError("UnrecoverableError", "IOTileAdapter has not assigned all adapter events.  This is an internal coding error.");
    }
    /*
      * We internally manage all notifications on characteristics using a pub/sub
      * listener scheme to allow multiple people to act on the data coming in
      */

    this.charManagers[IOTileCharacteristic.Streaming] = new CharacteristicManager();
    this.charManagers[IOTileCharacteristic.Tracing] = new CharacteristicManager();
    this.charManagers[IOTileCharacteristic.ReceiveHeader] = new CharacteristicManager();
    this.charManagers[IOTileCharacteristic.ReceivePayload] = new CharacteristicManager();
    
    this.rpcInterface = new IOTileRPCInterface();
    this.streamingInterface = new IOTileStreamingInterface(Config.BLE.STREAMING_BUFFER_SIZE, true);
    this.scriptInterface = new IOTileScriptInterface();
    this.tracingInterface = new IOTileTracingInterface();

    /*
      * Check if we should install a mock ble plugin for development
      * purposes.  This replaces the cordova ble plugin and provides
      * access to a fixed set of (virtual) testing devices defined in
      * mock-ble-serv.js.
      */

    if (Config.BLE && Config.BLE.MOCK_BLE) {
      // this.catAdapter.info('Using Mock BLE implementation.');
      this.mockBLEService = new MockBleService(Config);
      window.ble = this.mockBLEService;
      window.device = {'platform': Config.BLE.MOCK_BLE_DEVICE};
    }

    //Register our own connection hook that optimizes BLE connection speed on connect
    let optimizer = new BLEConnectionOptimizer(platform);
    this.registerConnectionHook((device, adapter) => {return optimizer.optimizeConnection(device, adapter)});

    //Register our connection hook to support larger stream reports on newer devices
    this.registerConnectionHook((device: IOTileDevice, adapter: AbstractIOTileAdapter) => {
          return this.setReportSize(device, adapter);
    });
  }

  private async setReportSize(device: IOTileDevice, adapter: AbstractIOTileAdapter): Promise<any> {
    // configure the device to increase the maximum report size
    try {
      await adapter.errorHandlingRPC(8, 0x0A05, "LB", "L", [1024*1024, 0], 5.0);
      
      // confirm report size
      let [maxPacket, _comp1, _comp2] = await adapter.typedRPC(8, 0x0A06, "", "LBB", [], 5.0);
      if (maxPacket != 1024*1024){
        this.catAdapter.error("Device report size failed to update", Error);
      } else {
        this.catAdapter.info("Large device report size successfully configured");
      }
    } catch (err){
      this.catAdapter.info("Couldn't configure sending larger reports on this device: "  +  JSON.stringify(err));
    }
    
    return null;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#getConnectedDevice
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Get the currently connected device.  If there is no device
   * currently connected, returns null.
   * 
   * @returns
   * {IOTileDevice} The currently connected device or null 
   *     if no device is connected currently.
   */
  public getConnectedDevice(): IOTileDevice | null {
    return this.connectedDevice;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#registerConnectionHook
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Register a function to be called everytime someone connects to a device
   * 
   * The function should be asynchronous and throw an exception if there is an error 
   * inside the hook that means the device should not be connected to.  If any hook throws
   * an exception, the device is disconnected from and that error is thrown to whomever
   * tried to connect to the device.
   * 
   * The signature of the method should be (IOTileDevice, IOTileAdapter) => Promise<void>
   * 
   * @param {ConnectionHookCallback} hook The function that should be called every time we 
   *    connect to a device.
   */

  public registerConnectionHook(hook: ConnectionHookCallback) {
    this.connectionHooks.push(hook);
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#registerPreconnectionHook
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Register a function to be called before someone connects to a device
   * 
   * The function should be asynchronous and return a boolean.  If the function returns
   * true, we can proceed with the connection.  If the function returns false, the connection
   * attempt will be stopped.
   * 
   * The signature of the method should be (IOTileDevice, IOTileAdapter) => Promise<boolean>
   * 
   * @param {ConnectionHookCallback} hook The function that should be called every time we 
   *    connect to a device.
   */

  public registerPreconnectionHook(hook: PreconnectionHookCallback) {
    this.preconnectionHooks.push(hook);
  }

  /*
  * If the app gets suspended, we don't receive bluetooth notifications so we need to
  * stop the streaming service so that we don't get corrupted reports that have missing
  * chunks when the user had the app closed.
  * 
  * Device pages can hook into the StreamingInterrupted event to boot the user out of a
  * connection to the device page when the app resumes operation after a suspend.
  */
  public pause(){
    this.streamingInterface.stop();
  }

  public resume(){
    this.notify(AdapterEvent.StreamingInterrupted, null);
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#enabled
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Return is BLE is enabled on the device.
   *
   * **This is an async method!**
   * 
   * @returns {boolean} Whether or not BLE is enabled on the device
   */
  public async enabled() : Promise<boolean> {
    return new Promise<boolean>(function (resolve, reject) {
      window.ble.isEnabled(() => resolve(true), () => resolve(false));
    });
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#scan
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Scan for devices for a fixed period of time.
   *
   * **This is an async method!**
   *
   * Returns a list of IOTileAdvertisement objects for the IOTile devices that 
   * were found.
   *
   * ## Side Effects:
   * - Notifies on AdapterEvent.ScanStarted when scanning has been started
   * - Notifies on AdapterEvent.ScanFinished when scanning has finished.
   *
   * AdapterEvent.ScanFinished has one argument with a count property that
   * contains the number of IOTile devices that were found.  See the 
   * ScanFinishedArgs interface.
   *
   * @example
   * <pre>
   * //Scan for 1 second and return the devices seen
   * var foundDevices = await IOTileAdapter.scan(1.0);
   * console.log("Found " + foundDevices.length + " IOTile devices!");
   * </pre>
   *
   * @param {number} scanPeriod The number of seconds to scan
   * @returns {IOTileAdvertisement[]} A list of the IOTile devices seen during the scan
   */
  public async scan(scanPeriod: number): Promise<IOTileAdvertisement[]> {
    let foundDevices : IOTileAdvertisement[] = [];
    let uniqueDevices: {[key: string]: boolean} = {};

    this.ensureIdle('scanning');

    this.state = AdapterState.Scanning;
    this.notify(AdapterEvent.ScanStarted, {});

    let that = this;

    try {
      window.ble.startScan([], function (peripheral) {
          try {
            let device = that.createIOTileAdvertisement(peripheral);
            //Make sure we only report each device once even on OSes like iOS that
            //can return multiple scan events per device in a given scan period.
            if (device.slug in uniqueDevices) {
              return;
            }

            uniqueDevices[device.slug] = true;
            foundDevices.push(device);
          } catch (err) {
            if (!(err instanceof Errors.InvalidAdvertisingData)) {
              that.catAdapter.error("Error Scanning for Devices", new Error(JSON.stringify(err)));
              throw err;
            }
          }
        });
      
      await delay(scanPeriod * 1000);
      await this.stopScan();
    } catch (err){
      this.catAdapter.error("Problem calling BLE startScan", new Error(JSON.stringify(err)));
    } finally {
      this.state = AdapterState.Idle;
      this.notify(AdapterEvent.ScanFinished, {"count": foundDevices.length});
    }

    this.lastScanResults = foundDevices;
    return foundDevices;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#connectTo
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Connect to an IOTileDevice that has previously been scanned given its slug.  
   *
   * **This is an async method**
   *
   * This method connects to an IOTile device over bluetooth.  If there
   * is already an IOTile device connected, it throws an error.
   * 
   * Raises a ConnectionError if the device slug cannot be found in previously scanned
   * devices.
   * 
   * @param {string} slug The slug of the device that we want to connect to
   * @param {ConnectionOptions} options (optional) Configure what checks and 
   *  and actions are performed automatically on connection without any required interaction.
   *  By default, the RPC interface is opened and streaming is started.
   */
  public async connectTo(slug: string, options: ConnectionOptions): Promise<IOTileDevice> {
    for (let i = 0; i < this.lastScanResults.length; ++i) {
      let advert = this.lastScanResults[i];

      if (advert.slug == slug) {
        let device = await this.connect(advert, options);
        return device;
      }
    }

    //If we didn't find it, try to scan again and see if we find it this time
    //This is useful for development in the browser so you can go straight to
    //a connected page but is also useful if a device is at the edge of range
    if (options && options.scanIfNotFound) {
      await this.scan(2.0);

      for (let i = 0; i < this.lastScanResults.length; ++i) {
        let advert = this.lastScanResults[i];

        if (advert.slug == slug) {
          let device = await this.connect(advert, options);
          return device;
        }
      }
    }

    throw new Errors.ConnectionError("Could not find device slug in scan results");
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#connect
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Connect to an IOTileDevice.  
   *
   * **This is an async method**
   *
   * This method connects to an IOTile device over bluetooth.  If there
   * is already an IOTile device connected, it throws an error.
   * 
   * @param {IOTileAdvertisement} advert The IOTileDevice object that we should
   *                       connect to.  This device should been returned
   *                       from a previous call to IOTileAdapter.scan.
   * @param {ConnectionOptions} options (optional) Configure what checks and 
   *  and actions are performed automatically on connection without any required interaction.
   *  By default, the RPC interface is opened and streaming is started.
   *
   * @example
   * <pre>
   * var foundAdverts = await IOTileAdapter.scan(1.0);
   * if (foundAdverts.length > 0) {
   *   var device = await IOTileAdapter.connect(foundAdverts[0]);
   * }
   * </pre>
   */
  public async connect(advert: IOTileAdvertisement, options: ConnectionOptions): Promise<IOTileDevice> {
    this.ensureIdle('connecting');

    let openRPC = true;
    let openStreaming = true;
    let prestreamingHook = null;

    this.connectionMessages = [];
    this.interactive = true;
    this.supportsFastWrites = false;
    this.tracingOpen = false;

    if (options != null) {
      if (options.noStreamInterface != null) {
        openStreaming = !options.noStreamInterface;
      }

      if (options.noRPCInterface != null) {
        openRPC = !options.noRPCInterface;
      }

      if (options.prestreamingHook != null) {
        prestreamingHook = options.prestreamingHook;
      }

      if (options.noninteractive != null) {
        this.interactive = !options.noninteractive;
      }
    }

    //FIXME: Check to make sure BLE is enabled here

    //Run all preconnection hooks here to make sure that we should
    //connect to this device.  Do this before notifying ConnectionStarted
    //so that users can capture that event to show a loading modal.
    this.catAdapter.info("Running preconnectionHooks");
    for (let i = 0; i < this.preconnectionHooks.length; ++i) {
      let hook = this.preconnectionHooks[i];

      let redirect = await hook(advert, this);

      if (redirect) {
        this.catAdapter.error(`Error running preconnection hooks`, new Error(redirect.reason));
        throw new Errors.ConnectionCancelledError(redirect);
      }
    }

    this.state = AdapterState.Connecting;
    this.notify(AdapterEvent.ConnectionStarted, {});

    try {
      this.connectedDevice = await this.connectInternal(advert);

      //this.state is updated by connectInternal
      if (this.config.ENV.CONNECTION_DELAY){
        this.catAdapter.info("Connection delay: " + this.config.ENV.CONNECTION_DELAY);
        await delay(this.config.ENV.CONNECTION_DELAY);
      }

      try {
          if (openRPC) {
            await this.openInterface(Interface.RPC);
          }

          //Always open the script interface in case we need to do a firmware update
          await this.openInterface(Interface.Script);

          //Now run all of the connection hooks that are registered for this device
          this.catAdapter.info(`Running ${this.connectionHooks.length} connectionHooks`);
          for (let i = 0; i < this.connectionHooks.length; ++i) {
            let hook = this.connectionHooks[i];

            let redirect = await hook(this.connectedDevice, this);
            if (redirect) {
              this.catAdapter.error(`Error running connection hooks`, new Error(redirect.reason));
              throw new Errors.ConnectionCancelledError(redirect);
            }
          }
          this.catAdapter.info('Finished connectionHooks');

          //Users can pass a one-time hook that will be called as if it were registered
          //with registerConnectionHook.  This is useful for controllers that need to do
          //predevice setup before allowing realtime and historical streaming.
          if (prestreamingHook != null) {
            this.catAdapter.info("Running prestreamingHooks");
            await prestreamingHook(this.connectedDevice, this);
          }

          if (openStreaming) {
            this.catAdapter.info("Running openStreaming interface");
            await this.openInterface(Interface.Streaming);
          }
      } catch (err) {
        await this.disconnect();
        this.catAdapter.error(`Connection Cancelled`, new Error(JSON.stringify(err)));
        throw err;
      }
    } finally {
      this.notify(AdapterEvent.ConnectionFinished, {});
    }

    this.notify(AdapterEvent.Connected, {device: this.connectedDevice});
    return this.connectedDevice;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#rpc
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Send an RPC to a connected IOTile device
   * 
   * **This is an async method!**
   * 
   * This function sends a single RPC to an IOTile device and waits for it to finish
   * before returning.  Internally the RPC is queued so that multiple users calling this
   * function from different places simultaneously will properly be synchronized. 
   * 
   * This is provisional API that will change.
   * 
   * @param {number} address The address of the tile that we want to send the RPC to
   * @param {ArrayBuffer} payload The payload that we would like to send
   * @param {number} rpcID The 16 bit id of the RPC that we would like to call
   * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
   *     to finish.
   * 
   * 
   */
  public async rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer> {
    this.ensureConnected('sending rpc');

    let response: ArrayBuffer = await this.rpcInterface.rpc(address, rpcID, payload, timeout);
    return response;
  }

  public async sendScript(script: ArrayBuffer, notifier: any): Promise<void> {
    this.ensureConnected('sending script');

    await this.scriptInterface.send(script, notifier);
  }

  public clearTrace() {
    this.tracingInterface.clearData();
  }

  /**
   * Wait for a given number of bytes to be received on the tracing interface.
   * 
   * If no data has been received in more than 1 second after calling this function,
   * the promise returned will be rejected by the tracing interface watchdog timer,
   * making sure that the interface cannot stall.  The recommended way to use this
   * function is to trigger some event that sends data via the tracing interface
   * (after making sure the interface is open...) and then calling:
   * 
   * ```
   * let data: ArrayBuffer = await adapter.waitForTracingData(numBytes);
   * ```
   * 
   * That is all that is required to synchronously receive that number of bytes
   * from the tracing interface. 
   * 
   * @param numBytes The number of bytes to wait for.  This exact
   *        number of bytes will be returned to you when the Promise
   *        is resolved.
   * @param timeout The number of milliseconds to wait before receiving another chunk
   *        of tracing data before we give up and abort the wait (rejecting the promise).
   *        This defaults to 1000 ms if not passed.
   */
  public waitForTracingData(numBytes: number, timeout: number = 1000): Promise<ArrayBuffer> {
    return this.tracingInterface.waitForData(numBytes, timeout);
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#typedRPC
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Type converting wrapper around rpc()
   * 
   * **This is an async method!**
   * 
   * This function sends a single RPC to an IOTile device and waits for it to finish
   * before returning.  Internally it calls IOTileAdapter.rpc() to make the actual RPC
   * call but this function builds the payload ArrayBuffer from a list of integers and
   * a format code.  Similarly, it decodes the response into a list of numbers as well.
   * 
   * If an error occurs calling the RPC, an exception is thrown indicating what went wrong.
   * If the error is unrecoverable, further RPCs to the device will not be allowed without
   * disconnecting and reconnecting.
   * 
   * @param {number} address The address of the tile that we want to send the RPC to
   * @param {number} rpcID The 16 bit id of the RPC that we would like to call
   * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
   *     to finish.
   * @param {string} callFormat A format code passed to packArrayBuffer to convert a list of numbers 
   *     into an ArrayBuffer.  Examples would be "LH" to pack an unsigned 32 bit integer followed by
   *     a 16 bit integer.
   * @param {string} respFormat A format code passed to unpackArrayBuffer to convert the response Callback
   *     into a list of numbers that are returned.
   * @param {number[]} args An array of arguments that should match the format of callFormat and is used to
   *     construct the payload for this RPC.
   * @returns {number[]} The decoded list of numbers that were returned from the RPC.
   */
  public async typedRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (string | number)[], timeout?: number) {
    let callPayload: ArrayBuffer = packArrayBuffer(callFormat, ...args);

    let respBuffer = await this.rpc(address, rpcID, callPayload, timeout);
    let resp = unpackArrayBuffer(respFormat, respBuffer);
    
    return resp;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#errorHandlingRPC
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Type converting wrapper around rpc() that throws if the first argument of response is nonzero
   * 
   * **This is an async method!**
   * 
   * This function sends a single RPC to an IOTile device and waits for it to finish
   * before returning.  Internally it calls IOTileAdapter.rpc() to make the actual RPC
   * call but this function builds the payload ArrayBuffer from a list of integers and
   * a format code.  Similarly, it decodes the response into a list of numbers as well.
   * 
   * If an error occurs calling the RPC, an exception is thrown indicating what went wrong.
   * If the error is unrecoverable, further RPCs to the device will not be allowed without
   * disconnecting and reconnecting.  
   * 
   * The RPC called must return a uint32_t as the first 4 bytes of its response and this value
   * is checked to ensure it is zero.  If it is nonzero, an exception is thrown rather saying
   * there was an error executing the RPC.  
   * 
   * **The list of values returned does not include the error code since it will always be zero.**
   * 
   * @param {number} address The address of the tile that we want to send the RPC to
   * @param {number} rpcID The 16 bit id of the RPC that we would like to call
   * @param {number} timeout The maximum amount of time that we would like to wait for this RPC
   *     to finish.
   * @param {string} callFormat A format code passed to packArrayBuffer to convert a list of numbers 
   *     into an ArrayBuffer.  Examples would be "LH" to pack an unsigned 32 bit integer followed by
   *     a 16 bit integer.
   * @param {string} respFormat A format code passed to unpackArrayBuffer to convert the response Callback
   *     into a list of numbers that are returned.
   * @param {number[]} args An array of arguments that should match the format of callFormat and is used to
   *     construct the payload for this RPC.  The first item (the error code) is shifted off and not returned.
   * @returns {number[]} The decoded list of numbers that were returned from the RPC (excluding the error code).
   */
  public async errorHandlingRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (number | string)[], timeout?: number) {
    //The response must start with a 32 bit integer
    if (respFormat.length === 0 || respFormat[0] != 'L') {
      throw new ArgumentError('Invalid response format for errorHandlingRPC that did not start with an L code for the error.');
    }

    let resp = await this.typedRPC(address, rpcID, callFormat, respFormat, args, timeout);
    let errorCode = resp.shift();

    if (errorCode != 0) {
      this.catAdapter.error(`Failed to execute rpc ${rpcID} on tile ${address}`, Error);
      throw new Errors.RPCError(address, rpcID, errorCode);
    }
    
    return resp;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#disconnect
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Disconnect from any currently connected IOTile Device.
   *
   * **This is an async method!**
   *
   * This method can never fail.  After the method returns, the IOTile
   * adapter will be in an Idle state and able to scan for or connect to
   * other IOTile devices.
   */
  public async disconnect() {
      if (this.state !== AdapterState.Connected) {
      return;
    }

    this.state = AdapterState.Disconnecting;

    //Trigger disconnection  
    //We will get a callback from the ble stack when the disconnection has finished
    //that will be processed by disconnectCallback
    if (this.connectedDevice){
      await this.disconnectInternal(this.connectedDevice.connectionID);
    }

    this.charManagers[IOTileCharacteristic.Streaming].removeAll();
    this.charManagers[IOTileCharacteristic.ReceiveHeader].removeAll();
    this.charManagers[IOTileCharacteristic.ReceivePayload].removeAll();
    this.charManagers[IOTileCharacteristic.Tracing].removeAll();

    this.state = AdapterState.Idle;
    this.connectedDevice = null;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#subscribe
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Subscribe to notifications on IOTileDevice related events.
   *
   * Currently supports scan started and scan finished events.  The 
   * notifications proceed using the angular event system.  You may
   * pass a scope object and all notifications you register will be
   * automatically removed when your scope is destroyed.  If you are calling
   * this method from a service, you can pass null for the scope to not automatically
   * deregister the handler on scope destruction.
   *
   * @param {AdapterEvent} event The event that you want to subscribe to, must be an event
   *                       in IOTileAdapterModule.AdapterEvent.
   * @param {Callback} callback The function that will be called when the event happens.
   *                   callback must have the signature callback(object) => void.
   *
   * @returns {Handler} A function that will deregister this handler before the scope
   *                    is destroyed if necessary.
   */
  public subscribe(event: AdapterEvent, callback: (string: string, any: any) => void) {
    let eventName: string = this.adapterEventNames[event];

    let handler = this.notification.subscribe(eventName, callback);
    return handler;
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#addNotificationListener
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Listen for notifications on a specific BLE characteristic known to IOTileAdapter.
   *
   * **This is an async method!**
   *
   * If this is the first call to addNotificationListener on this characteristic, 
   * the BLE stack is called to enable notifications.  However, if this is a subsequent call, 
   * it will complete immediately since nofications have already been enabled.  The listener
   * will just be added to an internal table of notification listeners for that characteristic
   * @param {IOTileCharacteristic} char A numerical identifier for the characteristic that we want
   *                               notifications about.
   * @param {NotificationCallback} callback The callback with signature (ArrayBuffer) => void
   * @returns {Promise}            Asynchronously returns a function that takes no arguments and
   *                               removes this notification listener when called.  The signature
   *                               of the function returned is () => Promise<void> 
   */
  public async addNotificationListener(char: IOTileCharacteristic, callback: NotificationCallback) : Promise<() => Promise<void>> {
    this.ensureConnected('enable notifications');

    if (!(char in this.charManagers)) {
      throw new UnknownKeyError("Characteristic cannot be listened to: " + char);
    }

    let charManager = this.charManagers[char];

    let handlerID = charManager.addListener(callback);

    let that = this;
    let removeHandler: () => Promise<void> = () => {return that.removeNotificationListener(char, handlerID);};

    if (charManager.numListeners() > 1) {
      return removeHandler;
    }
    
    //If this is the first listener registered, start notification on the characteristic.
    return new Promise<() => Promise<void>>(function (resolve, reject) {
      if (that.connectedDevice){
        window.ble.startNotification(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char],
          function(data) {
            charManager.handleData(data);
          }, function (failure) {
            charManager.removeListener(handlerID);
            reject(failure);
          });
    
          /**
           * Unfortunately, there is no callback from the BLE stack when notifications are successfully enabled,
           * but there is a failure callback, so given that multiple BLE events should have occurred
           * within 100 ms, if we haven't heard a failure by then, assume that it worked and resolve
           * the promise.
           */
          setTimeout(function () {resolve(removeHandler);}, 100);
      }    
    });
  }

  /**
   * @ngdoc method
   * @name iotile.device.service:IOTileAdapter#removeNotificationListener
   * @methodOf iotile.device.service:IOTileAdapter
   *
   * @description
   * Remove a previously installed notification listener.
   *
   * **This is an async method!**
   *
   * This will deregister a callback that was listening for notified data on a characteristic.
   * If this is the last callback registered on that characteristic, notifications will also be
   * stopped.
   * @param {IOTileCharacteristic} char A numerical identifier for the characteristic that we want
   *                               notifications about.
   * @param {number} handlerID the ID of the callback that should be removed, which is returned from the call
                     to addNotificationListener.
    * @returns {Promise} A promise that is fullfilled when the listener has been removed
    */
  private async removeNotificationListener(char: IOTileCharacteristic, handlerID: number) : Promise<void> {
    if (!(char in this.charManagers)) {
      throw new UnknownKeyError("Characteristic cannot be listened to: " + char);
    }

    let charManager = this.charManagers[char];
    let stopNotifications: boolean = charManager.removeListener(handlerID);

    let that = this;

    if (stopNotifications) {
      return new Promise<void>(function (resolve, reject) {
        if (that.connectedDevice){
          window.ble.stopNotification(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], () => resolve(), (reason: string) => reject(reason));
        }
      });
    }
  }

  /**
   * Create a channel object that can write and subscribe to characteristics 
   * over BLE.  Channels are passed to the subinterfaces inside this IOTileAdapter
   * in order to give them the ability to actually talk to the IOTile device without
   * creating a public API for low level writes and notifications.
   * 
   * The BLEChannel interface is intended to be minimalist and only all the required operations.
   */
  private createChannel(): BLEChannel {
    let that = this;
    return {
      write: function(char: IOTileCharacteristic, value: ArrayBuffer): Promise<void> {
        return that.write(char, value);
      },

      subscribe: function(char: IOTileCharacteristic, callback: NotificationCallback) {
        return that.addNotificationListener(char, callback);
      },

      notify: function(event: AdapterEvent, value: any) {
        return that.notify(event, value);
      }
    };
  }

  private async openInterface(iface: Interface) {
    this.ensureConnected('open device interface');

    switch(iface) {
      case Interface.RPC:
        await this.rpcInterface.open(this.createChannel());
        break;
      case Interface.Streaming:
        await this.streamingInterface.open(this.createChannel());
        break;
      case Interface.Script:
        if (this.connectedDevice){
          await this.scriptInterface.open(this.connectedDevice, this.createChannel());
        }
        break;
      case Interface.Tracing:
        await this.tracingInterface.open(this.createChannel());
        break;
    }
  }
  
  /**
   * Open the tracing interface so that we can receive tracing data.
   */

  public async enableTracing() {
    if (this.tracingOpen)
      return;

    await this.tracingInterface.open(this.createChannel());
    this.tracingOpen = true;
  }

  private async closeInterface(iface: Interface) {
    this.ensureConnected('close device interface');

    switch(iface) {
      case Interface.RPC:
        await this.rpcInterface.close();
        break;
      case Interface.Streaming:
        await this.streamingInterface.close();
        break;
      case Interface.Script:
        await this.scriptInterface.close();
        break;
      case Interface.Tracing:
        await this.tracingInterface.close();
        break;
    }
  }

  /**
   * Ensure the Adapter is in an idle state before proceeding
   */
  private ensureIdle(action: string) {
    if (this.state != AdapterState.Idle) {
      throw new Errors.OperationAtInvalidTimeError("action: '" + action + "'' started at invalid time, adapter was not idle.", this.state);
    }
  }

  private ensureConnected(action: string, userMessage?: string) {
    if (this.state != AdapterState.Connected) {
      throw new Errors.OperationAtInvalidTimeError("action: '" + action + "'' started at invalid time, adapter was not connected.", this.state, userMessage);
    }
  }

  private notify(event: AdapterEvent, args: any) {
    let eventName: string = this.adapterEventNames[event];
    this.notification.notify(eventName, args);
  }

  private createIOTileAdvertisement(peripheral: any) : IOTileAdvertisement {
    return this.adParser.processAdvertisement(peripheral.id, peripheral.rssi, peripheral.advertising);
  }

  /**
   * Wrapper around cordova ble plugin with a Promise based interface
   */
  public async stopScan() {
    return new Promise<void>((resolve, reject) => {
      window.ble.stopScan(resolve, reject);
    })
  }

  private async write(char: IOTileCharacteristic, value: ArrayBuffer): Promise<void> {
    this.ensureConnected('writing to characteristic', "Error sending data to device");

    let that = this;

    return new Promise<void>(function(resolve, reject) {
      /**
       * In case there is ever a hang in the bluetooth stack, make sure we timeout our writes.  They should take < 50 ms each
       * so if any single write takes longer than 2 seconds. fail it.  We need to set the timeout
       * to 2 seconds because on old v2 controller hardware, there can be ~ .5s lag when the controller
       * needs to erase its flash memory which backs up the writes and it can take more than 1s total
       * for the writes to succeed, causing a spurious timeout.  Having a 2 second timeout is observed
       * to be long enough.
       */
      let removeHandler = setTimeout(function() {
        reject(new Errors.WriteError("Timeout sending data"));
      }, 2000);

      let resolveFunction = () => {
        clearTimeout(removeHandler);
        resolve();
      };

       /*
        * Old POD1 devices were misconfigured and did not specify that they allowed writeWithoutResponse on their
        * RPC characteristics, leading to a 2x reduction in RPC throughput.  So, we added an advertisement flag
        * that states whether the device allows fast writes and if it's set we should use writeWithoutResponse
        * to get faster throughput.
        *
        * However, this is only enforced on iOS devices, so don't unnecessarily slow down android devices.  Also,
        * even though we have a nice advertisement flag for this purpose, iOS and Android cache the GATT tables
        * for BLE devices so they won't update the gatt table when a new one is loaded upon firmware update, so we
        * need to check in the phone's cached GATT table to see if it supports fast writes.  The check is done upon
        * connection and the result stored in this.supportsFastWrites.
        */
      if (that.connectedDevice){
        if (that.supportsFastWrites || that.adParser.platform() === Platform.Android) {
          window.ble.writeWithoutResponse(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], value, resolveFunction, function(err) {
            clearTimeout(removeHandler);
            reject(new Errors.WriteError(err));
          });
        } else {
          window.ble.write(that.connectedDevice.connectionID, IOTileServiceName, that.characteristicNames[char], value, resolveFunction, function(err) {
            clearTimeout(removeHandler);
            reject(new Errors.WriteError(err));
          });
        }
      }
    })
  }

  /** 
   * Connect to a device using the internal cordova BLE plugin
   * 
   * This function is a bit complicated because of the plugin's
   * API.  There are two callbacks provided to the plugin:
   * onConnected and onDisconnected
   * 
   * onConnected is called with no arguments after we succesfully connect
   * onDisconnected is called in two circumstances:
   *   - if we did not connect successfully, in which case we reject the promise
   *   - if we subsequently get disconnected from the BLE device, in which case
   *     the promise is gone and we instead notify that we were disconnected by
   *     calling disconnectCallback.
   */
  private async connectInternal(advert: IOTileAdvertisement): Promise<IOTileDevice> {
    let that = this;

    return new Promise<IOTileDevice>( function(resolve, reject) {
      window.ble.connect(advert.connectionID, function (peripheral: BLEPeripheral) {

        that.supportsFastWrites = that.checkFastWriteSupport(peripheral);

        if (that.supportsFastWrites) {
          that.catAdapter.info("Device supports fast writes, increasing RPC and script speed.");
        }

        resolve(new IOTileDevice(that, advert));
        that.state = AdapterState.Connected;
      }, function (reason) {
        if (that.state == AdapterState.Connecting) {
          that.state = AdapterState.Idle;
          reject(new Errors.ConnectionFailedError(reason));
        } else {
          that.disconnectCallback(reason);
        }
      });
    });
  }

  private checkFastWriteSupport(peripheral: BLEPeripheral): boolean {
    let highspeed = this.findCharacteristic(peripheral, IOTileServiceName, HighspeedDataCharacteristic);
    let header = this.findCharacteristic(peripheral, IOTileServiceName, SendHeaderCharacteristic);
    let payload = this.findCharacteristic(peripheral, IOTileServiceName, SendPayloadCharacteristic);

    if (highspeed == null || header == null || payload == null)
      return false;

    return this.checkProperty(highspeed, "WriteWithoutResponse") && this.checkProperty(header, "WriteWithoutResponse") && this.checkProperty(payload, "WriteWithoutResponse");
  }

  private findCharacteristic(peripheral: BLEPeripheral, service: string, charName: string): BLECharacteristic | null {
    if (peripheral.characteristics == null || peripheral.characteristics.length == null)
      return null;

    for (let char of peripheral.characteristics) {
      if (char.service.toLowerCase() !== service.toLowerCase())
        continue
      
      if (char.characteristic.toLowerCase() === charName.toLowerCase())
        return char;
    }

    return null;
  }

  private checkProperty(char: BLECharacteristic, propToFind: string): boolean {
    for (let prop of char.properties) {
      if (prop.toLowerCase() === propToFind.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Internally in BLE central plugin, the possible responses are:
   * - in Android, there is no way for disconnect to fail.  The disconnect attempt
   *   is scheduled and then resolve is called.
   */
  private async disconnectInternal(deviceID: any) {      
    return new Promise<void>((resolve, reject) => {
      window.ble.disconnect(deviceID, resolve, reject);
    });
  }

  /**
   * Callback provided to ble plugin that is called whenever a device gets disconnected
   * or if the connection attempt fails.
   */
  private disconnectCallback(reason: any) {
    this.catAdapter.info("Disconnect callback: " + JSON.stringify(reason));

    if (this.state == AdapterState.Connected) {
      this.state = AdapterState.Idle;
      let device = this.connectedDevice;

      this.connectedDevice = null;

      this.charManagers[IOTileCharacteristic.Streaming].removeAll();
      this.charManagers[IOTileCharacteristic.ReceiveHeader].removeAll();
      this.charManagers[IOTileCharacteristic.ReceivePayload].removeAll();
      this.charManagers[IOTileCharacteristic.Tracing].removeAll();

      this.notify(AdapterEvent.Disconnected, {device: device});
    }
  }
}

class CharacteristicManager {
  private callbacks: {[key: number]: NotificationCallback};
  private lastID: number;
  private listenerCount: number;

  constructor() {
    this.lastID = 0;
    this.listenerCount = 0;
    this.callbacks = {};
  }

  public addListener(callback: NotificationCallback) {
    let id = this.lastID;
    this.lastID += 1;
    this.listenerCount += 1;

    this.callbacks[id] = callback;
    return id;
  }

  public removeAll() {
    this.callbacks = {}
    this.listenerCount = 0;
  }

  public handleData(data: ArrayBuffer) {
      for (let key in this.callbacks) {
        try {
          this.callbacks[key](data);
        } catch (err) {
          //FIXME: Log an error here that one of our handlers was broken
        }
      }
  }

  public numListeners() {
    return this.listenerCount;
  }

  /**
   * @description
   * Remove a listener and return true if there are no more listeners registered
   */
  public removeListener(listenerID: number) : boolean {
    if (!(listenerID in this.callbacks)) {
      throw new UnknownKeyError('Unknown characteristic listener key: ' + listenerID);
    }

    delete this.callbacks[listenerID];
    this.listenerCount -= 1;

    return (this.listenerCount == 0);
  }
}