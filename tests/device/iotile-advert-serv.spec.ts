import {base64ToArrayBuffer} from "@iotile/iotile-common";
import {IOTileAdvertisementService} from "../../src/device/iotile-advert-serv";
import {Advertisement} from "../../src/device/advertisements";
import {setupMockBLE} from "../../src/mocks/helpers/mock-ble-setup";
import {MockBLEDevice} from "../../src/mocks/mock-ble-device";
import { parseBinaryUUID } from "../../src/device/advertisements/utilities";
import { VirtualDevice } from "../../src/mocks/virtual-device";

describe('module: iotile.device, IOTileAdvertisingService', function () {
    beforeEach(function () {
        setupMockBLE({});
    });
});

describe('module: iotile.device, IOTileAdvertisingService (ios support)', function () {
    let IOTileAdvert: IOTileAdvertisementService;

    beforeEach(function () {
        setupMockBLE({});
    });

    it('should correctly turn a uuid into a string', function() {
        let ex1 = [99,15,246,15,44,19,17,230,186,83,247,63,0,32,0,0];
        let binUUID: ArrayBuffer = <any>new Uint8Array(ex1).buffer;

        let strUUID = parseBinaryUUID(binUUID, true);
        expect(strUUID).toEqual('00002000-3FF7-53BA-E611-132C0FF60F63');

        //Make sure both endianness directions work
        strUUID = parseBinaryUUID(base64ToArrayBuffer('AAAgAD/3U7rmERMsD/YPYw=='), false);
        expect(strUUID).toEqual('00002000-3FF7-53BA-E611-132C0FF60F63');

        strUUID = parseBinaryUUID(base64ToArrayBuffer('Yw/2DywTEea6U/c/ACAAAA=='), true);
        expect(strUUID).toEqual('00002000-3FF7-53BA-E611-132C0FF60F63');
    });

    it('it should construct adverts from android adverising packets (v1)', function() {
        let ad1Raw = base64ToArrayBuffer("AgEGEQZjD/YPLBMR5rpT9z8AIAAACf/AA3oBAAAYABP/wAOEA///AAAAAAAAAABqrZcABwlJT1RpbGUAAAA=");
        let ad2Raw = base64ToArrayBuffer("AgEGEQZjD/YPLBMR5rpT9z8AIAAACf/AAzgFAAAYABP/wAPMA///AAAAAAAAAAAAAAAABwlJT1RpbGUAAAA=");
        let ad3Raw = base64ToArrayBuffer("AgEGEQZCAHSp/1IQmzNJNZsAAWjvBwlUaGluZ3kH/1kAhV7j8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); //Not IOTile
        let ad4Raw = base64ToArrayBuffer("Hv8GAAEJIALOQJq4mRjV2JFDLm3VyttXq6z/qrF1kQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); //Not IOTile

        let ad1 = Advertisement.FromAndroid(ad1Raw);
        let ad2 = Advertisement.FromAndroid(ad2Raw);
        let ad3 = Advertisement.FromAndroid(ad3Raw);
        let ad4 = Advertisement.FromAndroid(ad4Raw);
        
        expect(ad1.elements).toEqual({"localName": "IOTile", "manufacturerData": {0x3c0: base64ToArrayBuffer("egEAABgAhAP//wAAAAAAAAAAaq2XAAcJSU9UaWxl")}, "serviceList": ["00002000-3FF7-53BA-E611-132C0FF60F63"]});
        expect(ad2.elements).toEqual({"localName": "IOTile", "manufacturerData": {0x3c0: base64ToArrayBuffer("OAUAABgAzAP//wAAAAAAAAAAAAAAAAcJSU9UaWxl")}, "serviceList": ["00002000-3FF7-53BA-E611-132C0FF60F63"]});
        expect(ad3.elements).toEqual({"localName": "Thingy", "manufacturerData": {0x59: base64ToArrayBuffer("hV7j8g==")}, "serviceList": ["EF680100-9B35-4933-9B10-52FFA9740042"]});
        expect(ad4.elements).toEqual({"manufacturerData": {0x06: base64ToArrayBuffer("AQkgAs5AmriZGNXYkUMubdXK21errP+qsXWR")}});

        expect(ad1.containsService('00002000-3FF7-53BA-E611-132C0FF60F63')).toBeTruthy();
        expect(ad2.containsService('00002000-3FF7-53BA-E611-132C0FF60F63')).toBeTruthy();
        expect(ad3.containsService('00002000-3FF7-53BA-E611-132C0FF60F63')).toBeFalsy();
        expect(ad3.containsService('EF680100-9B35-4933-9B10-52FFA9740042')).toBeTruthy();
        expect(ad4.containsService('00002000-3FF7-53BA-E611-132C0FF60F63')).toBeFalsy();

        //Verify that capitalization doe not matter
        expect(ad1.containsService('00002000-3ff7-53BA-E611-132C0FF60F63')).toBeTruthy();
    });

    it('it should construct adverts from android adverising packets (v2)', function() {
        let ad1Raw = base64ToArrayBuffer("AgEGGxbd/dwKAAAAAAAAANwAAGsF/38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

        let ad1 = Advertisement.FromAndroid(ad1Raw);
        
        expect(ad1.elements).toEqual({"serviceData": base64ToArrayBuffer("3AoAAAAAAAAA3AAAawX/fwAAAAAAAAAA"), "serviceList": ["FDDD"]});

        expect(ad1.containsService('FDDD')).toBeTruthy();
    });

    it('it should construct adverts from ios advertising packets (v1)', function() {
        let advertising = {
            kCBAdvDataIsConnectable: 1,
            kCBAdvDataLocalName: 'IOTile',
            kCBAdvDataManufacturerData: base64ToArrayBuffer("wAOtAAAACAB2A///AAAAAAAAAABOfwoA"),
            kCBAdvDataServiceUUIDs: 
            [
                "00002000-3FF7-53BA-E611-132C0FF60F63"
            ]
        };

        //Make sure if the scan response packet is not received, we still parse correctly
        let truncAdvertising = {
            kCBAdvDataIsConnectable: 1,
            kCBAdvDataLocalName: 'IOTile',
            kCBAdvDataManufacturerData: base64ToArrayBuffer("wAOtAAAACAB="),
            kCBAdvDataServiceUUIDs: 
            [
                "00002000-3FF7-53BA-E611-132C0FF60F63"
            ]
        };

        let advert = Advertisement.FromIOS(advertising);
        expect(advert.elements).toEqual({
            "localName": "IOTile",
            "manufacturerData": {"960": base64ToArrayBuffer("rQAAAAgA")},
            "serviceList": ["00002000-3FF7-53BA-E611-132C0FF60F63"]
        });

        let truncAdvert = Advertisement.FromIOS(truncAdvertising);
        expect (truncAdvert.elements).toEqual({
            "localName": "IOTile",
            "manufacturerData": {"960": base64ToArrayBuffer("rQAAAAgAdgP//wAAAAAAAAAATn8KAA==")},
            "serviceList": ["00002000-3FF7-53BA-E611-132C0FF60F63"]
        });
    });

    it('should correctly parse android advertising packets', function() {
        IOTileAdvert = new IOTileAdvertisementService();

        let ad1Raw = base64ToArrayBuffer("AgEGEQZjD/YPLBMR5rpT9z8AIAAACf/AA3oBAAAYABP/wAOEA///AAAAAAAAAABqrZcABwlJT1RpbGUAAAA=");
        let ad2Raw = base64ToArrayBuffer("AgEGEQZjD/YPLBMR5rpT9z8AIAAACf/AAzgFAAAYABP/wAPMA///AAAAAAAAAAAAAAAABwlJT1RpbGUAAAA=");
        let ad3Raw = base64ToArrayBuffer("AgEGEQZCAHSp/1IQmzNJNZsAAWjvBwlUaGluZ3kH/1kAhV7j8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); //Not IOTile
        let ad4Raw = base64ToArrayBuffer("Hv8GAAEJIALOQJq4mRjV2JFDLm3VyttXq6z/qrF1kQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); //Not IOTile
        let ad5Raw = base64ToArrayBuffer("AgEGGxbd/dwKAAAAAAAAANwAAGsF/38AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); //v2

        let ad1 = IOTileAdvert.processAdvertisement('test', -50, ad1Raw);
        let ad2 = IOTileAdvert.processAdvertisement('test', -50, ad2Raw);
        let ad3 = IOTileAdvert.processAdvertisement('test', -50, ad3Raw);
        let ad4 = IOTileAdvert.processAdvertisement('test', -50, ad4Raw);
        let ad5 = IOTileAdvert.processAdvertisement('test', -50, ad5Raw);

        expect(ad3).toBeNull();
        expect(ad4).toBeNull();

        expect(ad1).not.toBeNull();
        expect(ad2).not.toBeNull();
        expect(ad5).not.toBeNull();

        if (ad1 != null && ad2 != null && ad5 != null) {
            expect(ad1.flags).toEqual({"hasData":false,"lowVoltage":false,"otherConnected":false,"robustReports":true,"fastWrites":true});
            expect(ad1.slug).toEqual("d--0000-0000-0000-017a");
            expect(ad1.deviceID).toEqual(0x17a);

            expect(ad2.flags).toEqual({"hasData":false,"lowVoltage":false,"otherConnected":false,"robustReports":true,"fastWrites":true});
            expect(ad2.slug).toEqual("d--0000-0000-0000-0538");
            expect(ad2.deviceID).toEqual(0x538);

            expect(ad5.flags).toEqual({"hasData":false,"lowVoltage":false,"otherConnected":false,"robustReports":true,"fastWrites":true});
            expect(ad5.slug).toEqual("d--0000-0000-0000-0adc");
            expect(ad5.deviceID).toEqual(0xadc);
        }
    });

    it('should correctly parse mock advertising packets', function() {
        let mockDevice = new MockBLEDevice(<VirtualDevice>{
            iotileID: 0xabc
        }, true);

        IOTileAdvert = new IOTileAdvertisementService();

        let advert = IOTileAdvert.processAdvertisement('test', -50, mockDevice.advertising);
        expect(advert).not.toBeNull();

        if (advert != null) {
            expect(advert.flags.otherConnected).toBeTruthy();
            expect(advert.deviceID).toEqual(0xabc);
        }

        mockDevice = new MockBLEDevice(<VirtualDevice>{
            iotileID: 0xabc
        }, false);

        advert = IOTileAdvert.processAdvertisement('test', -50, mockDevice.advertising);
        expect(advert).not.toBeNull();

        if (advert != null) {
            expect(advert.flags.otherConnected).toBeFalsy();
            expect(advert.deviceID).toEqual(0xabc);
        }
    });

    it('should correctly parse ios advertising packets', function() {
        IOTileAdvert = new IOTileAdvertisementService();

        let advertising = {
            kCBAdvDataIsConnectable: 1,
            kCBAdvDataLocalName: 'IOTile',
            kCBAdvDataManufacturerData: base64ToArrayBuffer("wAOtAAAACAB2A///AAAAAAAAAABOfwoA"),
            kCBAdvDataServiceUUIDs: 
            [
                "00002000-3FF7-53BA-E611-132C0FF60F63"
            ]
        };

        let processed = IOTileAdvert.processAdvertisement('test', -50, advertising);

        expect(processed).not.toBeNull();

        if (processed != null) {
            expect(processed.rssi).toBe(-50);
            expect(processed.deviceID).toBe(0xad);
            expect(processed.connectionID).toBe('test');
        }
        
        //Make sure if the scan response packet is not received, we still parse correctly
        let truncAdvertising = {
            kCBAdvDataIsConnectable: 1,
            kCBAdvDataLocalName: 'IOTile',
            kCBAdvDataManufacturerData: base64ToArrayBuffer("wAOtAAAACAB="),
            kCBAdvDataServiceUUIDs: 
            [
                "00002000-3FF7-53BA-E611-132C0FF60F63"
            ]
        };

        processed = IOTileAdvert.processAdvertisement('test', -50, truncAdvertising);

        expect(processed).not.toBeNull();

        if (processed != null) {
            expect(processed.rssi).toBe(-50);
            expect(processed.deviceID).toBe(0xad);
            expect(processed.connectionID).toBe('test');
        }
    });
});