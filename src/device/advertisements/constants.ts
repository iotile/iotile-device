/**
 * Constants used to decode advertisement data into a uniform format.
 */

export const IOTileV1ServiceUUID: string = "00002000-3FF7-53BA-E611-132C0FF60F63";
export const ArchManufacturerCode: number = 0x3c0;

export enum AdElementType {
    LocalName = "localName",
    ManufacturerData = "manufacturerData",
    ServiceData = "serviceData",
    ServiceUUIDList = "serviceUUIDList"
}

/**
 * The list of all binary type codes for the advertisement types that we care about. 
 */
export enum AdElementTypeCode {
    Incomplete128BitUUIDList = 0x06,
    ManufacturerSpecificData = 0xFF,
    CompleteLocalName = 0x09,
    ShortenedLocalName = 0x08
}

export const IOSAdElementMap = {
    kCBAdvDataLocalName: AdElementType.LocalName,
    kCBAdvDataManufacturerData: AdElementType.ManufacturerData,
    kCBAdvDataServiceUUIDs: AdElementType.ServiceUUIDList,
    kCBAdvDataServiceData: AdElementType.ServiceData
}

export type IOSAdvertisement = {
    [key in keyof typeof IOSAdElementMap]?: any
}

export type ManufacturerData = {[key: number]: ArrayBuffer | SharedArrayBuffer};

export type AndroidAdvertisement = ArrayBuffer | SharedArrayBuffer;

export interface RawAdvertisement {
    localName?: string,
    manufacturerData?: ManufacturerData,
    serviceData?: {[key: string]: ArrayBuffer | SharedArrayBuffer},
    serviceList?: string[]
}
