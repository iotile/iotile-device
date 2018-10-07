import {DeviceAdapter, BLE_DEVICE_ADAPTER_CLASS, DeviceAdapterState} from "../common/device-adapter";
import { BLEChannel, Platform } from "../common/iotile-types";
import { DeviceAdapterInInvalidStateError, DeviceInInvalidStateError, InvalidAdvertisingData } from "../common/error-space";
import { IOTileAdvertisement } from "../common/advertisement";
import { delay } from "iotile-common";
import { IOTileAdvertisementService } from "../device/iotile-advert-serv";
import { Category } from "typescript-logging";

const ARCH_BLE_COMPANY_ID = 960;

export interface BLEInterface {
    beginScan: (onAdvertisementCallback: (connectionString: string, rssi: number, advertData: ArrayBuffer | object) => void) => Promise<void>,
    endScan: () => Promise<void>,

    connect: (deviceString: string, onDisconnectCallback?: (reason: string) => void) => Promise<BLEPeripheral>,
    disconnect: (deviceString: string) => Promise<void>,
    
    write: (char: string, value: ArrayBuffer) => Promise<void>,
    subscribe: (char: string, callback: (value: ArrayBuffer)=> void) => Promise<() => Promise<void>>,
}

export interface BLEConnection {
    connectionString: string;
    rawPeripheral: any;
    fastWrites: boolean;

    rpcOpen: boolean;
    streamOpen: boolean;
    traceOpen: boolean;
    scriptOpen: boolean;
}

/**
 * This is a generic implementation of Bluetooth based device adapter that scans forever in the background.
 */
export class BLEDeviceAdapter extends DeviceAdapter {
    protected advertParser: IOTileAdvertisementService;
    protected bleInterface: BLEInterface;
    protected scanning: boolean;
    protected connections: {[key: number]: BLEConnection};

    constructor(name: string, platform: Platform, implementation: BLEInterface, logger: Category) {
        super(BLE_DEVICE_ADAPTER_CLASS, name, platform, logger);

        this.advertParser = new IOTileAdvertisementService(ARCH_BLE_COMPANY_ID);
        this.bleInterface = implementation;
        this.scanning = false;
        this.connections = {};
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

        if (!(connectionID in this.connections))
            throw new DeviceInInvalidStateError(`Connection ID ${connectionID} does not exist to disconnect from`);

        let connData = this.connections[connectionID];

        await this.bleInterface.disconnect(connData.connectionString);
        delete this.connections[connectionID];
    }

    public async connect(connectionID: number, connectionString: string) {
        this.verifyState(DeviceAdapterState.Started);

        throw new DeviceInInvalidStateError(`Connecting to a device is not supported yet`);
    }
}