import {deviceIDToSlug, ArgumentError, unpackArrayBuffer} from "@iotile/iotile-common";
import { Advertisement, IOTileV1ServiceUUID, IOTileV2ServiceUUID, ArchManufacturerCode } from "./advertisements";

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
      let serviceData = advert.getServiceData();
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
    let flags = parseFlags(rawFlags);

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
    let serviceData = advert.getServiceData();

    if (serviceData == null) throw new ArgumentError("Missing service data in processValidAdvertisementV2");
    if (serviceData.byteLength < 9) throw new ArgumentError(`Service data too short, length=${serviceData.byteLength}`);

    /**
     * We skip the 4 bytes betweein the uuid and the flags since this contains information
     * relevant for decrypting broadcast information but not for what we need here.
     */
    let [uuid, rawFlags] = unpackArrayBuffer("L4xB", serviceData.slice(0, 9))
    let slug = deviceIDToSlug(uuid);
    let flags = parseFlags(rawFlags);

    /**
     * v2 packets do not contain the following two flags so we set them to true by default.
     */
    flags.robustReports = true;
    flags.fastWrites = true;

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
  * Parse a 16-bit integer with flags from an advertising packet into an IOTileAdvertisementFlags object
  */
function parseFlags(flags: number): IOTileAdvertisementFlags {
  return {
    hasData: ((flags & (1 << 0)) !== 0),
    lowVoltage: ((flags & (1 << 1)) !== 0),
    otherConnected: ((flags & (1 << 2)) !== 0),
    robustReports: ((flags & (1 << 3)) !== 0),
    fastWrites: ((flags & (1 << 4)) !== 0)
  };
}
