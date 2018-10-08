import {ConnectionTrackingDeviceAdapter, BLE_DEVICE_ADAPTER_CLASS, DeviceAdapterState} from "../common/device-adapter";
import { BLEChannel, Platform } from "../common/iotile-types";
import { DeviceAdapterInInvalidStateError, DeviceInInvalidStateError, InvalidAdvertisingData } from "../common/error-space";
import { IOTileAdvertisement } from "../common/advertisement";
import { delay } from "iotile-common";
import { RPCQueue } from "../common/rpc-queue";
import { IOTileAdvertisementService } from "../device/iotile-advert-serv";
import { Category } from "typescript-logging";

const ARCH_BLE_COMPANY_ID = 960;

const IOTileServiceName = '00002000-3FF7-53BA-E611-132C0FF60F63';
const ReceiveHeaderCharacteristic = '2001';
const ReceivePayloadCharacteristic = '2002';
const SendHeaderCharacteristic = '2003';
const SendPayloadCharacteristic = '2004';
const StreamingCharacteristic = '2005';
const HighspeedDataCharacteristic = '2006';
const TracingCharacteristic = '2007';


export interface BLEInterface {
    beginScan: (onAdvertisementCallback: (connectionString: string, rssi: number, advertData: ArrayBuffer | object) => void) => Promise<void>,
    endScan: () => Promise<void>,

    connect: (deviceString: string, onDisconnectCallback?: (reason: string) => void) => Promise<BLEPeripheral>,
    disconnect: (deviceString: string) => Promise<void>,
    
    write: (device: string, service: string, char: string, value: ArrayBuffer) => Promise<void>,
    subscribe: (device: string, service: string, char: string, callback: (value: ArrayBuffer)=> void) => Promise<() => Promise<void>>,
}

export interface BLEConnectionData {
    connectionString: string;
    rawPeripheral: any;
    fastWrites: boolean;

    rpcOpen: boolean;
    streamOpen: boolean;
    traceOpen: boolean;
    scriptOpen: boolean;

    rpcQueue: RPCQueue;
};

/**
 * This is a generic implementation of Bluetooth based device adapter that scans forever in the background.
 * 
 * It just needs a BLEInterface object that implements the specific bluetooth state transition commands
 * needed for scanning, connecting and controlling IOTile devices.  This class should generally not
 * be instantiated directly, but rather it provides shared functionality that subclasses can use to
 * implement device adapters for specific BLE implementations such as cordova-plugin-ble-central.
 */
export class BLEDeviceAdapter extends ConnectionTrackingDeviceAdapter<BLEConnectionData> {
    protected advertParser: IOTileAdvertisementService;
    protected bleInterface: BLEInterface;
    protected scanning: boolean;

    constructor(name: string, platform: Platform, implementation: BLEInterface, logger: Category) {
        super(BLE_DEVICE_ADAPTER_CLASS, name, platform, logger);

        this.advertParser = new IOTileAdvertisementService(ARCH_BLE_COMPANY_ID);
        this.bleInterface = implementation;
        this.scanning = false;
    }

    protected async ensureScanning(forceRestart?: boolean) {
        if (this.scanning && forceRestart !== true)
            return;
        
        if (this.scanning) {
            await this.bleInterface.endScan();
            this.scanning = false;
        }

        await this.bleInterface.beginScan((connString, rssi, data) => this.handleAdvertisement(connString, rssi, data));
        this.scanning = true
    }

    protected handleAdvertisement(connectionString: string, rssi: number, data: ArrayBuffer | object) {
        try {
            this.logger.trace(() => `Saw advertisement from: ${connectionString} rssi: ${rssi}`);
            let advert = this.advertParser.processAdvertisement(connectionString, rssi, data);
            this.onDeviceSeen(advert);
        } catch (err) {
            if (!(err instanceof InvalidAdvertisingData)) {
                //FIXME: Log the error here
            }
        }
    }

    protected handleDisconnect(connectionID: number) {
        let connData = this.getConnectionData(connectionID);

        if (connData.rawPeripheral) {
            this.onUnexpectedDisconnection(connectionID);
        }

        this.deleteConnectionData(connectionID);
    }

    public async start() {
        this.verifyState(DeviceAdapterState.Stopped);

        this.logger.info("Starting BLE DeviceAdapter");

        try {
            this.state = DeviceAdapterState.Starting;
            await this.ensureScanning(true);
            this.state = DeviceAdapterState.Started;   
        } catch (err) {
            this.logger.error("Error starting BLE DeviceAdapter", err);
            this.state = DeviceAdapterState.Stopped;
            throw err;
        }
    }

    public async stop() {
        this.verifyState(DeviceAdapterState.Started);

        try {
            this.state = DeviceAdapterState.Stopping;

            if (this.scanning) {
                await this.bleInterface.endScan();
                this.scanning = false;
            }

            for (let connID in this.connections) {
                await this.disconnect(+connID);
            }

            this.state = DeviceAdapterState.Stopped;   
        } catch (err) {
            this.state = DeviceAdapterState.Started;
            throw err;
        }
    }

    public async disconnect(connectionID: number) {
        this.verifyState([DeviceAdapterState.Started, DeviceAdapterState.Stopping]);

        let connData = this.getConnectionData(connectionID);

        await this.bleInterface.disconnect(connData.connectionString);
        this.deleteConnectionData(connectionID);
    }

    public async connect(connectionID: number, connectionString: string) {
        this.verifyState(DeviceAdapterState.Started);

        let connData: BLEConnectionData = {
            connectionString: connectionString,
            rawPeripheral: null,
            fastWrites: false,
            rpcOpen: false,
            traceOpen: false,
            streamOpen: false,
            scriptOpen: false,

            rpcQueue: new RPCQueue()
        };

        this.setConnectionData(connectionID, connData);

        try {
            let start = new Date();

            let peripheral = await this.bleInterface.connect(connectionString, (reason) => {
                this.handleDisconnect(connectionID);
            });

            let end = new Date();
            let elapsedTime = (end.getTime() - start.getTime()) / 1000.0;

            connData.rawPeripheral = peripheral;
            connData.fastWrites = checkFastWriteSupport(peripheral);

            this.logger.info(`Connected to device ${connectionString} connectionTime=${elapsedTime}, id=${connectionID}, fastWriteSupport=${connData.fastWrites}`);
        } catch (err) {
            this.deleteConnectionData(connectionID, true);
            this.logger.error(`Error connecting to POD ${connectionString}`, err);
            throw err;
        }
    }
}


function checkFastWriteSupport(peripheral: BLEPeripheral): boolean {
    let highspeed = findCharacteristic(peripheral, IOTileServiceName, HighspeedDataCharacteristic);
    let header = findCharacteristic(peripheral, IOTileServiceName, SendHeaderCharacteristic);
    let payload = findCharacteristic(peripheral, IOTileServiceName, SendPayloadCharacteristic);

    if (highspeed == null || header == null || payload == null)
        return false;

    return checkProperty(highspeed, "WriteWithoutResponse") && checkProperty(header, "WriteWithoutResponse") && checkProperty(payload, "WriteWithoutResponse");
}

function findCharacteristic(peripheral: BLEPeripheral, service: string, charName: string): BLECharacteristic | null {
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

function checkProperty(char: BLECharacteristic, propToFind: string): boolean {
    for (let prop of char.properties) {
        if (prop.toLowerCase() === propToFind.toLowerCase())
            return true;
    }

    return false;
}
