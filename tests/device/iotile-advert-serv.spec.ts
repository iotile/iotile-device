import {base64ToArrayBuffer} from "iotile-common";
import {IOTileAdvertisementService} from "../../src/device/iotile-advert-serv";
import {Platform}  from "../../src/common/iotile-types";
import {setupMockBLE} from "../../src/mocks/helpers/mock-ble-setup";

describe('module: iotile.device, IOTileAdvertisingService', function () {
    let IOTileAdvert = new IOTileAdvertisementService(960, window.device);

    beforeEach(function () {
        setupMockBLE({});
    });
});

describe('module: iotile.device, IOTileAdvertisingService (ios support)', function () {
    let IOTileAdvert: IOTileAdvertisementService;
    let rootScope: any;
    let deviceInfo: any;

    beforeEach(function () {
        setupMockBLE({});
    });

    afterEach(function() {
        window.device = deviceInfo;
    });

    it('should correctly parse android advertising packets', function() {
        IOTileAdvert = new IOTileAdvertisementService(960, Platform.Android);
        expect(IOTileAdvert.platform()).toBe(Platform.Android);

        let ex1 = [2,1,6,17,6,99,15,246,15,44,19,17,230,186,83,247,63,0,32,0,0,9,255,192,3,122,1,0,0,24,0,19,255,192,3,132,3,255,255,0,0,0,0,0,0,0,0,106,173,151,0,7,9,73,79,84,105,108,101,0,0,0];
        let ex2 = [2,1,6,17,6,99,15,246,15,44,19,17,230,186,83,247,63,0,32,0,0,9,255,192,3,56,5,0,0,24,0,19,255,192,3,204,3,255,255,0,0,0,0,0,0,0,0,0,0,0,0,7,9,73,79,84,105,108,101,0,0,0];
        let ex3 = [2,1,6,17,6,66,0,116,169,255,82,16,155,51,73,53,155,0,1,104,239,7,9,84,104,105,110,103,121,7,255,89,0,133,94,227,242,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        let ex4 = [30,255,6,0,1,9,32,2,206,64,154,184,153,24,213,216,145,67,46,109,213,202,219,87,171,172,255,170,177,117,145,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

        let buffer = new ArrayBuffer(62);
        let packet = new Uint8Array(buffer);
        packet.set(ex1);
        let view = new DataView(buffer, 0, 31);
        let map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(3);
        expect(map[255]).toBeDefined();
        expect(map[6]).toBeDefined();
        expect(map[1]).toBeDefined();
        expect(map[255].byteLength).toEqual(8);
        expect(map[6].byteLength).toEqual(16);
        expect(map[1].byteLength).toEqual(1);
        expect(map[255].getUint16(0, true)).toEqual(960);
        
        buffer = new ArrayBuffer(62);
        packet = new Uint8Array(buffer);
        packet.set(ex2);
        view = new DataView(buffer, 0, 31);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(3);
        expect(map[255]).toBeDefined();
        expect(map[6]).toBeDefined();
        expect(map[1]).toBeDefined();
        expect(map[255].byteLength).toEqual(8);
        expect(map[6].byteLength).toEqual(16);
        expect(map[1].byteLength).toEqual(1);
        expect(map[255].getUint16(0, true)).toEqual(960);

        // NOT IOTile
        buffer = new ArrayBuffer(62);
        packet = new Uint8Array(buffer);
        packet.set(ex3);
        view = new DataView(buffer, 0, 31);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(4);
        expect(map[255]).toBeDefined();
        expect(map[1]).toBeDefined();
        expect(map[6]).toBeDefined();
        expect(map[9]).toBeDefined();
        expect(map[255].byteLength).toEqual(6);

        buffer = new ArrayBuffer(62);
        packet = new Uint8Array(buffer);
        packet.set(ex4);
        view = new DataView(buffer, 0, 31);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(1);
        expect(map[255]).toBeDefined();
        expect(map[255].byteLength).toEqual(29);
    });

    it('should correctly parse ios advertising packets', function() {
        IOTileAdvert = new IOTileAdvertisementService(960, Platform.IOS);
        let oldPlatform = window.device;

        let advertising = {
            kCBAdvDataIsConnectable: 1,
            kCBAdvDataLocalName: 'IOTile',
            kCBAdvDataManufacturerData: base64ToArrayBuffer("wAOtAAAACAB2A///AAAAAAAAAABOfwoA"),
            kCBAdvDataServiceUUIDs: 
            [
                "00002000-3FF7-53BA-E611-132C0FF60F63"
            ]
        };

        expect(IOTileAdvert.platform()).toBe(Platform.IOS);

        let processed = IOTileAdvert.processAdvertisement('test', -50, advertising);

        expect(processed.rssi).toBe(-50);
        expect(processed.deviceID).toBe(0xad);
        expect(processed.connectionID).toBe('test');

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
        expect(processed.rssi).toBe(-50);
        expect(processed.deviceID).toBe(0xad);
        expect(processed.connectionID).toBe('test');
    });
});