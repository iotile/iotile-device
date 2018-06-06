import {base64ToArrayBuffer} from "iotile-common";
import {IOTileAdvertisementService, Platform} from "../../src";
import {setupMockBLE} from "../helpers/mock-ble-setup";

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
        IOTileAdvert = new IOTileAdvertisementService(960, Platform.IOS);
    });

    afterEach(function() {
        window.device = deviceInfo;
    });

    it('should correctly parse ios advertising packets', function() {
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