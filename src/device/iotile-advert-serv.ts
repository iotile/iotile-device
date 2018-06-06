///<reference path="../../typings/cordova_plugins.d.ts"/>
import {InvalidAdvertisingData} from "../common/error-space";
import {deviceIDToSlug} from "iotile-common/build";
import {Platform} from "../common/iotile-types";

export interface IOTileAdvertisementFlags {
  hasData: boolean,
  otherConnected: boolean,
  lowVoltage: boolean,
  robustReports: boolean,
  fastWrites: boolean
}

export interface IOTileAdvertisement {
  batteryVoltage: number,
  deviceID: number,
  rssi: number,
  flags: IOTileAdvertisementFlags,
  connectionID: any,
  slug: string
}

export class IOTileAdvertisementService {
  private companyId: number;
  private _platform: Platform;

  constructor(companyId: number, platform: Platform) {
    this.companyId = companyId;
    this._platform = platform;
  }

  public processAdvertisement(connectionID: any, rssi: number, advert: any): IOTileAdvertisement {
    if (this._platform === Platform.IOS) {
      return this.processIOSAdvertisement(connectionID, rssi, advert);
    } else if (this._platform === Platform.Android) {
      return this.processAndroidAdvertisement(connectionID, rssi, advert);
    } else {
      //FIXME: Currently the only web advertisements we process come from mock
      //devices that are returned in android format.
      return this.processAndroidAdvertisement(connectionID, rssi, advert);
    }
  }

  public platform(): Platform {
    return this._platform;
  }

  //FIXME: Process scan response information
  private processAndroidAdvertisement(connectionID: any, rssi: number, advert: ArrayBuffer): IOTileAdvertisement {
    if (advert.byteLength != 31 && advert.byteLength != 62) {
      throw new InvalidAdvertisingData("Advertisement has the wrong length: " + advert.byteLength + " bytes");
    }

    //FIXME: We should check for the actual service id here
    let advertData = new DataView(advert, 0, 31);
    let manuID = advertData.getUint16(23, true);

    if (manuID != this.companyId) {
      throw new InvalidAdvertisingData("Advertisement has an invalid company ID: " + manuID);
    }

    let deviceID = advertData.getUint32(25, true);
    let flags = advertData.getUint16(29, true);

    return {
      batteryVoltage: 0,
      deviceID: deviceID,
      flags: this.parseFlags(flags),
      connectionID: connectionID,
      rssi: rssi,
      slug: deviceIDToSlug(deviceID)
    };
  }

  //FIXME: Process scan response information
  private processIOSAdvertisement(connectionID: any, rssi: number, advert: any): IOTileAdvertisement {      
    if (!(advert && advert.kCBAdvDataManufacturerData)) {
      throw new InvalidAdvertisingData("No manufacturing data in IOS device advertisement");
    }

    let manuData = new DataView(advert.kCBAdvDataManufacturerData);
    if (manuData.byteLength != 8 && manuData.byteLength != (8+16)) {
      throw new InvalidAdvertisingData("IOS advertising data had the wrong manufacturing data length: " + manuData.byteLength);
    }

    let manuID = manuData.getUint16(0, true);
    if (manuID != this.companyId) {
      throw new InvalidAdvertisingData("Advertisement has an invalid company ID: " + manuID); 
    }

    let deviceID = manuData.getUint32(2, true);
    let flags = manuData.getUint16(6, true);

    return {
      batteryVoltage: 0,
      deviceID: deviceID,
      flags: this.parseFlags(flags),
      connectionID: connectionID,
      rssi: rssi,
      slug: deviceIDToSlug(deviceID)
    };
  }

  /**
   * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlags object
   */
  private parseFlags(flags: number): IOTileAdvertisementFlags {
    return {
      hasData: ((flags & (1 << 0)) !== 0),
      lowVoltage: ((flags & (1 << 1)) !== 0),
      otherConnected: ((flags & (1 << 2)) !== 0),
      robustReports: ((flags & (1 << 3)) !== 0),
      fastWrites: ((flags & (1 << 4)) !== 0)
    };
  }
}
