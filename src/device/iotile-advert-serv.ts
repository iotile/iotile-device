import {InvalidAdvertisingData} from "../common/error-space";
import {deviceIDToSlug} from "iotile-common";
import {Platform} from "../common/iotile-types";
import { catAdapter } from "../config";

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

  public processADelements(data: DataView){
    let advertData: {[key: number]: any} = {}
    let offset = 1;
    let first = true;
    let type = false;
    let seg_length = 0;
    for (let i = 0; i < data.byteLength; i += offset){
      if(first){
        offset = 1;
        seg_length = data.getUint8(i) - 1;
        // catAdapter.info(`SEGLENGTH: ${seg_length}`);
        if (seg_length > 0){
          first = false;
          type = true;
        }
      } else if (type){
        try {
          advertData[+data.getUint8(i)] = new DataView(data.buffer, i+1, seg_length);
          // catAdapter.info(`Adding key ${+data.getUint8(i)} bytelength ${advertData[+data.getUint8(i)].byteLength}`);
          type = false;
          first = true;
          offset += seg_length;
        } catch (err){
          catAdapter.error(`Segment exceeds buffer length: segment ${seg_length}, start index ${i+1}`, new Error("Advertisement Parse Error"));
        }
      }
    }

    return advertData;
  }

  //FIXME: Process scan response information
  private processAndroidAdvertisement(connectionID: any, rssi: number, advert: ArrayBuffer): IOTileAdvertisement {
    if (advert.byteLength != 31 && advert.byteLength != 62) {
      catAdapter.error("Advertisement has the wrong length: " + advert.byteLength + " bytes", new Error("InvalidAdvertisingData"));
      throw new InvalidAdvertisingData("Advertisement has the wrong length: " + advert.byteLength + " bytes");
    }

    //FIXME: We should check for the actual service id here
    let advertData = new DataView(advert, 0, 31);

    // Break into AD elements (GAP: 0x1: flags (18 bits; don't use), 0x06: service class IDs (128 bits), 0xFF: manufacturer data[manuID (16 bits), deviceID (32 bits), flags (16 bits)])
    let aDElements = this.processADelements(advertData);

    if (aDElements[255] && aDElements[255].byteLength >= 8){
      let manuID = aDElements[255].getUint16(0, true);

      if (manuID != this.companyId) {
        catAdapter.debug("Advertisement has an invalid company ID: " + manuID);
        throw new InvalidAdvertisingData("Advertisement has an invalid company ID: " + manuID);
      }

      let deviceID = aDElements[255].getUint32(2, true);
      let flags = aDElements[255].getUint16(4, true);
      
      return {
        batteryVoltage: 0,
        deviceID: deviceID,
        flags: this.parseFlags(flags),
        connectionID: connectionID,
        rssi: rssi,
        slug: deviceIDToSlug(deviceID)
      };
      
    } else {
      catAdapter.debug("Advertisement has incorrect manufacturer information");
      throw new InvalidAdvertisingData("Advertisement has incorrect manufacturer information");
    }
  }

  //FIXME: Process scan response information
  private processIOSAdvertisement(connectionID: any, rssi: number, advert: any): IOTileAdvertisement {      
    if (!(advert && advert.kCBAdvDataManufacturerData)) {
      catAdapter.warn("No manufacturing data in IOS device advertisement");
      throw new InvalidAdvertisingData("No manufacturing data in IOS device advertisement");
    }

    let manuData = new DataView(advert.kCBAdvDataManufacturerData);
    if (manuData.byteLength != 8 && manuData.byteLength != (8+16)) {
      catAdapter.warn("IOS advertising data had the wrong manufacturing data length: " + manuData.byteLength);
      throw new InvalidAdvertisingData("IOS advertising data had the wrong manufacturing data length: " + manuData.byteLength);
    }

    let manuID = manuData.getUint16(0, true);
    if (manuID != this.companyId) {
      catAdapter.warn("Advertisement has an invalid company ID: " + manuID);
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
