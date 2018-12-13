import {IOTileDevice} from "../../src/device/iotile-device";
import {IOTileAdapter}  from "../../src/device/iotile-serv";
import { IOTileAdvertisement } from "../../src/device/iotile-advert-serv";

describe('module: iotile.device, IOTileDevice', function () {
    let device: IOTileDevice;
    let adapter: any;
    let advert: any;
    let secondsAt2000 = Date.UTC(2000, 0, 1).valueOf() / 1000;

    beforeEach(function () {
        adapter = {};
        advert = {};

        device = new IOTileDevice(<IOTileAdapter>adapter, <IOTileAdvertisement>advert);
        // @ts-ignore
        device.adapter.typedRPC = function(){};
        // @ts-ignore
        device.adapter.errorHandlingRPC = function(){};
    });

    it('[RTC] should correctly synchronize device time', async function() {    
        let forcedTime = Date.now();
        let forcedTimeDiff = (forcedTime / 1000) - secondsAt2000;
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([forcedTimeDiff]);
        let sentTime = await device.synchronizeTime(new Date(forcedTime));
        expect(sentTime).toEqual(Math.ceil(forcedTimeDiff));
    });

    it('[RTC] should correctly get synchronized UTC device time', async function() {
        let now = new Date();
        let nowSeconds = Math.round(now.valueOf() /1000);
        let nowSince2000 = nowSeconds - secondsAt2000;
    
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([nowSince2000 | (1 << 31)]);      

        let time = await device.currentTime();

        expect(time).toBeDefined();
        expect(time.currentTime).toEqual(new Date(nowSeconds * 1000));
        expect(time.isSynchronized).toBe(true);
        expect(time.isUTC).toBe(true);
    });

    it('[RTC] should correctly get unsynchronized UTC device time', async function() {
        let then = Date.UTC(2018, 0, 1) / 1000;
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([(then - secondsAt2000) | (1 << 31)]);

        let time = await device.currentTime();

        expect(time).toBeDefined();
        expect(time.currentTime).toEqual(new Date(then * 1000));
        expect(time.isSynchronized).toBe(false);
        expect(time.isUTC).toBe(true);
    });

    it('[RTC] should correctly get non-UTC device time', async function() {
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([1377748]);

        let time = await device.currentTime();

        expect(time).toBeDefined();
        expect(time.currentTime).toEqual(1377748);
        expect(time.isSynchronized).toBe(false);
        expect(time.isUTC).toBe(false);
    });
});