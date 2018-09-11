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

        let ex1 = [2,1,27,23,255,76,0,5,18,0,
                   0,0,0,0,0,0,0,1,194,243,
                   241,17,0,0,0,0,0,0,0,0,0];
        let ex2 = [27,255,117,0,66,4,1,128,96,248,
                   119,184,144,184,109,250,119,184,144,184,
                   108,1,0,0,0,0,0,0,0,0,0];
        let ex3 = [30,255,6,0,1,9,32,2,53,171,
                   54,164,233,74,170,166,234,122,25,79,
                   155,167,23,154,168,51,123,74,242,172,8];
        let ex4 = [30,255,6,0,1,9,32,2,181,65,
                   219,55,145,99,204,42,88,222,9,220,
                   35,246,140,229,215,3,108,245,32,33,246];

        let buffer = new ArrayBuffer(31);
        let packet = new Uint8Array(buffer);
        packet.set(ex1);
        let view = new DataView(buffer);
        expect(view.getUint8(2)).toEqual(27);
        let map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(2);
        expect(map[255]).toBeDefined();
        expect(map[255].byteLength).toEqual(22);
        console.log(map[255].getUint16(0, true));
        console.log(map[255].getUint32(2, true));
        console.log(map[255].getUint16(6, true));
        
        buffer = new ArrayBuffer(31);
        packet = new Uint8Array(buffer);
        packet.set(ex2);
        view = new DataView(buffer);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(1);
        expect(map[255]).toBeDefined();
        expect(map[255].byteLength).toEqual(26);
        console.log(map[255].getUint16(0, true));
        console.log(map[255].getUint32(2, true));
        console.log(map[255].getUint16(6, true));

        buffer = new ArrayBuffer(31);
        packet = new Uint8Array(buffer);
        packet.set(ex3);
        view = new DataView(buffer);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(1);
        expect(map[255]).toBeDefined();
        expect(map[255].byteLength).toEqual(29);
        console.log(map[255].getUint16(0, true));
        console.log(map[255].getUint32(2, true));
        console.log(map[255].getUint16(6, true));

        buffer = new ArrayBuffer(31);
        packet = new Uint8Array(buffer);
        packet.set(ex4);
        view = new DataView(buffer);
        map = IOTileAdvert.processADelements(view);
        expect(Object.keys(map).length).toEqual(1);
        expect(map[255]).toBeDefined();
        expect(map[255].byteLength).toEqual(29);
        console.log(map[255].getUint16(0, true));
        console.log(map[255].getUint32(2, true));
        console.log(map[255].getUint16(6, true));

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