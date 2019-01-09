import {deviceIDToSlug, ArgumentError, unpackArrayBuffer} from "@iotile/iotile-common";
import { Advertisement, IOTileV1ServiceUUID, ArchManufacturerCode } from "./advertisements";

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
     * Currently we only support v1 advertisements, which means that we have manufacturer data
     * for arch systems and a fixed service UUID.
     */

     if (!advert.containsService(IOTileV1ServiceUUID)) return null;
     
     let manuData = advert.getManufacturerData(ArchManufacturerCode);
     if (manuData == null) return null;
     if (manuData.byteLength < 6) return null; //6 is the number of bytes in the initial advertisement packet (not including anything in the scan response)

     return this.processValidAdvertisementV1(connectionID, rssi, advert);
  }

  private processValidAdvertisementV1(connectionID: any, rssi: number, advert: Advertisement): IOTileAdvertisement {
    let manuData = advert.getManufacturerData(ArchManufacturerCode);

    if (manuData == null) throw new ArgumentError("Missing manufactururer data in processValidAdvertisement");
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
