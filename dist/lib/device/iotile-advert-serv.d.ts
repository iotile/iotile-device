/// <reference path="../../../typings/cordova_plugins.d.ts" />
import { Platform } from "../common/iotile-types";
export interface IOTileAdvertisementFlags {
    hasData: boolean;
    otherConnected: boolean;
    lowVoltage: boolean;
    robustReports: boolean;
    fastWrites: boolean;
}
export interface IOTileAdvertisement {
    batteryVoltage: number;
    deviceID: number;
    rssi: number;
    flags: IOTileAdvertisementFlags;
    connectionID: any;
    slug: string;
}
export declare class IOTileAdvertisementService {
    private companyId;
    private _platform;
    constructor(companyId: number, platform: Platform);
    processAdvertisement(connectionID: any, rssi: number, advert: any): IOTileAdvertisement;
    platform(): Platform;
    private processAndroidAdvertisement(connectionID, rssi, advert);
    private processIOSAdvertisement(connectionID, rssi, advert);
    /**
     * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlags object
     */
    private parseFlags(flags);
}
