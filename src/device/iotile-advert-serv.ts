import {deviceIDToSlug, ArgumentError, unpackArrayBuffer} from "@iotile/iotile-common";
import { Advertisement, IOTileV1ServiceUUID, IOTileV2ServiceUUID, ArchManufacturerCode } from "./advertisements";

export interface IOTileAdvertisementFlagsV1 {
  hasData: boolean,
  otherConnected: boolean,
  lowVoltage: boolean,
  robustReports: boolean,
  fastWrites: boolean
}

export interface IOTileAdvertisementFlagsV2 {
  hasData: boolean,
  otherConnected: boolean,
  lowVoltage: boolean,
  dataIsEncrypted: boolean,
  keyIsDeviceKey: boolean,
  keyIsUserKey: boolean,
  isSynchronized: boolean,
  robustReports: boolean,
  fastWrites: boolean
}

export interface IOTileAdvertisement {
  batteryVoltage: number,
  deviceID: number,
  rssi: number,
  flags: IOTileAdvertisementFlagsV1 | IOTileAdvertisementFlagsV2,
  connectionID: any,
  slug: string
}

export class IOTileAdvertisementService {
  constructor() {
  }

  public processAdvertisement(connectionID: any, rssi: number, rawAdvert: ArrayBuffer | {}): IOTileAdvertisement | null {
    let advert: Advertisement;

    if (rawAdvert instanceof ArrayBuffer) {
      advert = Advertisement.FromAndroid(rawAdvert);
    } else {
      advert = Advertisement.FromIOS(rawAdvert);
    }

    /**
     * Do a series of checks to make sure that we are looking at a valid IOTile advertisement.
     * 
     * We currently support the following advertisements:
     * 
     * v1: We recieve manufacturer data for arch systems and a fixed 128bit service UUID.
     * v2: We recieve service data for arch systems and an assigned 16bit service UUID. 
     */

     if (advert.containsService(IOTileV1ServiceUUID)) {
      let manuData = advert.getManufacturerData(ArchManufacturerCode);
      if (manuData == null) return null;
      if (manuData.byteLength < 6) return null; //6 is the number of bytes in the initial advertisement packet (not including anything in the scan response)
 
      return this.processValidAdvertisementV1(connectionID, rssi, advert);
     } else if (advert.containsService(IOTileV2ServiceUUID)) {
      let serviceData = advert.getServiceData(parseInt(IOTileV2ServiceUUID, 16));
      if (serviceData == null) return null;
      if (serviceData.byteLength < 9) return null; //9 is the number of bytes in the advertisement packet that we will need
 
      return this.processValidAdvertisementV2(connectionID, rssi, advert);
     } else {
       return null;
     }
     
     
  }

  private processValidAdvertisementV1(connectionID: any, rssi: number, advert: Advertisement): IOTileAdvertisement {
    let manuData = advert.getManufacturerData(ArchManufacturerCode);

    if (manuData == null) throw new ArgumentError("Missing manufactururer data in processValidAdvertisementV1");
    if (manuData.byteLength < 6) throw new ArgumentError(`Manufacturer data too short, length=${manuData.byteLength}`);

    let [uuid, rawFlags] = unpackArrayBuffer("LH", manuData.slice(0, 6));
    let slug = deviceIDToSlug(uuid);
    let flags = parseFlagsV1(rawFlags);

    return {
      batteryVoltage: 0,
      deviceID: uuid,
      slug: slug,
      connectionID: connectionID,
      rssi: rssi,
      flags: flags
    }
  }

  private processValidAdvertisementV2(connectionID: any, rssi: number, advert: Advertisement): IOTileAdvertisement {
    let serviceData = advert.getServiceData(parseInt(IOTileV2ServiceUUID, 16));

    if (serviceData == null) throw new ArgumentError("Missing service data in processValidAdvertisementV2");
    if (serviceData.byteLength < 9) throw new ArgumentError(`Service data too short, length=${serviceData.byteLength}`);

    /**
     * We skip the 4 bytes betweein the uuid and the flags since this contains information
     * relevant for decrypting broadcast information but not for what we need here.
     */
    let [uuid, rawFlags] = unpackArrayBuffer("L3xB", serviceData.slice(0, 8))
    let slug = deviceIDToSlug(uuid);
    let flags = parseFlagsV2(rawFlags);

    return {
      batteryVoltage: 0,
      deviceID: uuid,
      slug: slug,
      connectionID: connectionID,
      rssi: rssi,
      flags: flags
    }
  }
}

/**
  * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlagsV1 object
  */
function parseFlagsV1(flags: number): IOTileAdvertisementFlagsV1 {
  return {
    hasData: ((flags & (1 << 0)) !== 0),
    lowVoltage: ((flags & (1 << 1)) !== 0),
    otherConnected: ((flags & (1 << 2)) !== 0),
    robustReports: ((flags & (1 << 3)) !== 0),
    fastWrites: ((flags & (1 << 4)) !== 0)
  };
}


/**
  * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlagsV2 object
  */
 function parseFlagsV2(flags: number): IOTileAdvertisementFlagsV2 {
  return {
    hasData: ((flags & (1 << 0)) !== 0),
    lowVoltage: ((flags & (1 << 1)) !== 0),
    otherConnected: ((flags & (1 << 2)) !== 0),
    dataIsEncrypted: ((flags & (1 << 3)) !== 0),
    keyIsDeviceKey: ((flags & (1 << 4)) !== 0),
    keyIsUserKey: ((flags & (1 << 5)) !== 0),
    isSynchronized: ((flags & (1 << 6)) !== 0),
    robustReports: true,
    fastWrites: true
  };
}