import {BLEDeviceAdapter, BLEInterface} from "./ble-adapter";
import { Platform } from "../common/iotile-types";
import { IOTileAdvertisementService } from "../device/iotile-advert-serv";
import { IOTileAdvertisement } from "../common/advertisement";
import { catBLEAdapter } from "../config";

export class CordovaBLEDeviceAdapter extends BLEDeviceAdapter {
    constructor(platform: Platform) {
        let bleInterface: BLEInterface = {
            beginScan: beginScan,
            endScan: endScan,

            connect: (deviceString: string, onDisconnectCallback?: (reason: string) => void) => {return Promise.reject("FIXME")},
            disconnect: (deviceString: string)  => {return Promise.reject("FIXME")},
    
            write: (char: string, value: ArrayBuffer) => {return Promise.reject("FIXME")},
            subscribe: (char: string, callback: (value: ArrayBuffer)=> void)  => {return Promise.reject("FIXME")}
        };

        super("CordovaBLEDeviceAdapter", platform, bleInterface, catBLEAdapter);
    }
}

//FIXME: The fail callback on beginScan needs to be passed so that we get an error if we cannot start scanning

function beginScan(onAdvertisementCallback: (connectionString: string, rssi: number, advertData: ArrayBuffer | object) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        window.ble.startScanWithOptions([], {reportDuplicates: true}, function (peripheral: any) {
                onAdvertisementCallback(peripheral.id, peripheral.rssi, peripheral.advertising);
        });

        resolve();
    });
}

function endScan(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        window.ble.stopScan(resolve, reject);
    });
}