import {RawAdvertisement, IOSAdvertisement, AndroidAdvertisement, AdElementTypeCode, ManufacturerData, ServiceData} from "./constants";
import { parseUTF8String, parseBinaryUUID, parseBinary16BitUUID } from "./utilities";
import { copyArrayBuffer } from "@iotile/iotile-common";

export class Advertisement {
    public readonly elements: RawAdvertisement;

    constructor(elements: RawAdvertisement) {
        this.elements = elements;
    }

    public containsService(service: string): boolean {
        if (this.elements.serviceList == null) return false;

        return this.elements.serviceList.indexOf(service.toUpperCase()) > -1;
    }

    public hasManufacturerData(manu: number): boolean {
        if (this.elements.manufacturerData == null) return false;

        return manu in this.elements.manufacturerData;
    }

    public getManufacturerData(manu: number): ArrayBuffer | SharedArrayBuffer | null {
        if (this.elements.manufacturerData == null) return null;
        if (this.elements.manufacturerData[manu] == null) return null;

        return this.elements.manufacturerData[manu];
    }

    public getServiceData(serviceUUID: number): ArrayBuffer | SharedArrayBuffer | null {
        if (this.elements.serviceData == null) return null;
        
        return this.elements.serviceData[serviceUUID];
    }

    public static FromAndroid(data: AndroidAdvertisement): Advertisement {
        let i = 0;
        let advert: RawAdvertisement = {};
        let view = new DataView(data);
        
        while (i < data.byteLength) {
            let length = view.getUint8(i);

            /*
             * Make sure we have all of the data that we claim to have.
             * the length encoded in each ad element does not include
             * the length byte itself.
             */
            if ((i + length + 1) >= data.byteLength) break;

            if (length === 0 ) {
                /*
                 * Do nothing, some advertisement pack null bytes at the end
                 * of the advertisement so just ignore them and continue parsing.
                 */
            } else if (length === 1) {
               /**
                * This just means there is no associated with this ad element, so
                * for now we ignore it since there are no ad elements we care about
                * that have no associated data.
                */
            } else {
                let type = view.getUint8(i + 1);
                let dataLength = length - 1;
                let elementData = data.slice(i + 2, i + 2 + dataLength);

                switch (type) {

                    case AdElementTypeCode.CompleteLocalName:
                    case AdElementTypeCode.ShortenedLocalName:
                    /*
                     * The contexts are utf-8 encoded string with the name of the device
                     */
                    try {
                        advert.localName = parseUTF8String(elementData); 
                    } catch (err) {
                        /*
                         * UTF-8 decoding errors are ignored, we just don't process the
                         * local name.
                         */
                    }
                    break;

                    case AdElementTypeCode.Incomplete128BitUUIDList:
                    /**
                     * This should contain exactly one 
                     */
                    if (elementData.byteLength === 16) {
                        let uuids = Advertisement.ParseUUID128List(elementData);

                        if (uuids != null) advert.serviceList = uuids;
                    }
                    break;

                    case AdElementTypeCode.ManufacturerSpecificData:
                    let manuData = Advertisement.ParseManufacturerData(elementData);
                    if (manuData != null) {
                        if (advert.manufacturerData != null) {
                            Advertisement.MergeManufacturerData(advert.manufacturerData, manuData);
                        } else {
                            advert.manufacturerData = manuData;  
                        } 
                    }
                    break;

                    case AdElementTypeCode.ServiceData:
                    let uuid = Advertisement.ParseServiceUUIDFromData(elementData);
                    if (uuid != null) {
                        advert.serviceList = [uuid];

                        let serviceData = Advertisement.ParseServiceData(elementData, parseInt(uuid, 16));
                        if (serviceData != null) {
                            if (advert.serviceData != null) {
                                Advertisement.MergeServiceData(advert.serviceData, serviceData);
                            } else {
                                advert.serviceData = serviceData;  
                            } 
                        }
                    }
                    break;
                }    
            }

            i += (length + 1);
        }

        return new Advertisement(advert);
    }

    public static FromIOS(data: IOSAdvertisement): Advertisement {
        let advert: RawAdvertisement = {};

        if (data.kCBAdvDataLocalName != null) advert.localName = data.kCBAdvDataLocalName;
        if (data.kCBAdvDataManufacturerData != null) {
            let manuData = Advertisement.ParseManufacturerData(data.kCBAdvDataManufacturerData);
            
            if (manuData != null) {
                advert.manufacturerData = manuData;
            }
        }
        if (data.kCBAdvDataServiceData != null) {
            let UUID = Object.keys(data.kCBAdvDataServiceData)[0];
            
            let serviceData: ServiceData = {[parseInt(UUID, 16)]: data.kCBAdvDataServiceData[UUID]};

            if (serviceData != null) {
                advert.serviceData = serviceData;
                advert.serviceList = [UUID]
            }
        }

        if (data.kCBAdvDataServiceUUIDs != null && advert.serviceList == null) advert.serviceList = data.kCBAdvDataServiceUUIDs;

        return new Advertisement(advert);
    }

    public static ParseManufacturerData(data: ArrayBuffer | SharedArrayBuffer): ({[key: number]: ArrayBuffer | SharedArrayBuffer} | null) {
        //Make sure we received enough data for the manufacturer ID
        if (data.byteLength < 2) return null;

        let view = new DataView(data);
        let manuID = view.getUint16(0, true);
        let manuData = data.slice(2);

        let result: {[key: number]: ArrayBuffer | SharedArrayBuffer} = {};
        result[manuID] = manuData;

        return result;
    }

    public static ParseServiceData(data: ArrayBuffer | SharedArrayBuffer, serviceUUID: number): ({[key: number]: ArrayBuffer | SharedArrayBuffer} | null) {
        //Make sure we received enough data for the service UUID
        if (data.byteLength < 2) return null;

        let serviceData = data.slice(2);

        let result: {[key: number]: ArrayBuffer | SharedArrayBuffer} = {};
        result[serviceUUID] = serviceData;

        return result;
    }

    public static MergeManufacturerData(orig: ManufacturerData, update: ManufacturerData) {
        for (let key in update) {
            if (key in orig) {
                let newSize = orig[key].byteLength + update[key].byteLength;
                let newBuffer = new ArrayBuffer(newSize);

                copyArrayBuffer(newBuffer, orig[key], 0, 0, orig[key].byteLength);
                copyArrayBuffer(newBuffer, update[key], 0, orig[key].byteLength, update[key].byteLength);
            }
        }
    }

    public static MergeServiceData(orig: ServiceData, update: ServiceData) {
        for (let key in update) {
            if (key in orig) {
                let newSize = orig[key].byteLength + update[key].byteLength;
                let newBuffer = new ArrayBuffer(newSize);

                copyArrayBuffer(newBuffer, orig[key], 0, 0, orig[key].byteLength);
                copyArrayBuffer(newBuffer, update[key], 0, orig[key].byteLength, update[key].byteLength);
            }
        }
    }

    public static ParseUUID128List(data: ArrayBuffer | SharedArrayBuffer): string[] | null {
        if (data.byteLength % 16 !== 0) return null;

        let uuids: string[] = [];

        for (let i = 0; i < data.byteLength; i += 16) {
            let binUUID = data.slice(i, i + 16);
            let uuid = parseBinaryUUID(binUUID, true);

            uuids.push(uuid);
        }

        return uuids;
    }

    public static ParseServiceUUIDFromData(data: ArrayBuffer | SharedArrayBuffer): string | null {
        if (data.byteLength < 2) return null;

        let binUUID = data.slice(0, 2);
        let uuid = parseBinary16BitUUID(binUUID, true);

        return uuid;
    }
}