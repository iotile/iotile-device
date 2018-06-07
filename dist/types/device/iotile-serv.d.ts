/// <reference path="../../../typings/cordova_plugins.d.ts" />
import { AdapterState, AdapterEvent, IOTileCharacteristic, NotificationCallback, UserRedirectionInfo, Platform } from "../common/iotile-types";
import { IOTileAdvertisement, IOTileAdvertisementService } from "./iotile-advert-serv";
import { OperationMessage, ProgressNotifier } from "iotile-common";
import { AbstractIOTileAdapter } from "./iotile-base-types";
import { IOTileDevice } from "./iotile-device";
import { AbstractNotificationService } from "../common/notification-service";
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
export declare type ConnectionHookCallback = (device: IOTileDevice, adapter: IOTileAdapter) => Promise<UserRedirectionInfo>;
export declare type PreconnectionHookCallback = (device: IOTileAdvertisement, adapter: IOTileAdapter) => Promise<UserRedirectionInfo>;
export interface ConnectionOptions {
    noStreamInterface?: boolean;
    noRPCInterface?: boolean;
    scanIfNotFound?: boolean;
    prestreamingHook?: ConnectionHookCallback;
    noninteractive?: boolean;
}
export declare enum Interface {
    RPC = 0,
    Streaming = 1,
    Script = 2,
    Tracing = 3,
}
export declare class IOTileAdapter extends AbstractIOTileAdapter {
    notification: AbstractNotificationService;
    connectedDevice: IOTileDevice | null;
    state: AdapterState;
    adParser: IOTileAdvertisementService;
    private connectionHooks;
    private preconnectionHooks;
    lastScanResults: IOTileAdvertisement[];
    mockBLEService: any;
    private rpcInterface;
    private streamingInterface;
    private scriptInterface;
    private tracingInterface;
    private tracingOpen;
    private charManagers;
    private characteristicNames;
    private adapterEventNames;
    private supportsFastWrites;
    interactive: boolean;
    connectionMessages: OperationMessage[];
    constructor(Config: any, notificationService: AbstractNotificationService, platform: Platform);
    private setReportSize(device, adapter);
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
    getConnectedDevice(): IOTileDevice | null;
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
    registerConnectionHook(hook: ConnectionHookCallback): void;
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
    registerPreconnectionHook(hook: PreconnectionHookCallback): void;
    pause(): void;
    resume(): void;
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
    enabled(): Promise<boolean>;
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
    scan(scanPeriod: number): Promise<IOTileAdvertisement[]>;
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
    connectTo(slug: string, options: ConnectionOptions): Promise<IOTileDevice>;
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
    connect(advert: IOTileAdvertisement, options: ConnectionOptions): Promise<IOTileDevice>;
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
    rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer>;
    sendScript(script: ArrayBuffer, notifier: ProgressNotifier): Promise<void>;
    clearTrace(): void;
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
    waitForTracingData(numBytes: number, timeout?: number): Promise<ArrayBuffer>;
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
    typedRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (string | number)[], timeout?: number): Promise<any>;
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
    errorHandlingRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (number | string)[], timeout?: number): Promise<any>;
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
    disconnect(): Promise<void>;
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
    subscribe(event: AdapterEvent, callback: (string: string, any: any) => void): any;
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
    addNotificationListener(char: IOTileCharacteristic, callback: NotificationCallback): Promise<() => Promise<void>>;
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
    private removeNotificationListener(char, handlerID);
    /**
     * Create a channel object that can write and subscribe to characteristics
     * over BLE.  Channels are passed to the subinterfaces inside this IOTileAdapter
     * in order to give them the ability to actually talk to the IOTile device without
     * creating a public API for low level writes and notifications.
     *
     * The BLEChannel interface is intended to be minimalist and only all the required operations.
     */
    private createChannel();
    private openInterface(iface);
    /**
     * Open the tracing interface so that we can receive tracing data.
     */
    enableTracing(): Promise<void>;
    private closeInterface(iface);
    /**
     * Ensure the Adapter is in an idle state before proceeding
     */
    private ensureIdle(action);
    private ensureConnected(action, userMessage?);
    private notify(event, args);
    private createIOTileAdvertisement(peripheral);
    /**
     * Wrapper around cordova ble plugin with a Promise based interface
     */
    private stopScan();
    private write(char, value);
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
    private connectInternal(advert);
    private checkFastWriteSupport(peripheral);
    private findCharacteristic(peripheral, service, charName);
    private checkProperty(char, propToFind);
    /**
     * Internally in BLE central plugin, the possible responses are:
     * - in Android, there is no way for disconnect to fail.  The disconnect attempt
     *   is scheduled and then resolve is called.
     */
    private disconnectInternal(deviceID);
    /**
     * Callback provided to ble plugin that is called whenever a device gets disconnected
     * or if the connection attempt fails.
     */
    private disconnectCallback(reason);
}
