import {IOTileDevice} from "../../src/device/iotile-device";
import {IOTileAdapter}  from "../../src/device/iotile-serv";

describe('module: iotile.device, IOTileDevice', function () {
    let device: IOTileDevice;
    let adapter;
    let advert;

    beforeEach(function () {
        adapter = {};
        advert = {};

        device = new IOTileDevice(adapter, advert);
        // @ts-ignore
        device.adapter.typedRPC = function(){};
    });

    it('[RTC] should correctly synchronize device time', async function() {
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([]);

        let oldTime = await device.currentTime();

        expect(oldTime).toBeDefined();
        expect(oldTime.currentTime).toEqual(15);
        expect(oldTime.isSynchronized).toBe(false);
        expect(oldTime.isUTC).toBe(true);

        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([]);
        // force set time to 59 seconds after default device time (1/1/2000)
        let forcedTime = new Date(2000, 1, 1, 0, 1, 5);
        await device.synchronizeTime(forcedTime);

        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([]);
        let newTime = await device.currentTime();

        expect(newTime).toBeDefined();
        expect(newTime.currentTime).toEqual(65);
        expect(newTime.isSynchronized).toBe(true);
        expect(newTime.isUTC).toBe(true);
    });

    it('[RTC] should correctly get synchronized UTC device time', async function() {
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([]);      

        let time = await device.currentTime();

        expect(time).toBeDefined();
        // FIXME: real time
        expect(time.currentTime).toEqual(15);
        expect(time.isSynchronized).toBe(true);
        expect(time.isUTC).toBe(true);
    });

    it('[RTC] should correctly get unsynchronized UTC device time', async function() {
        spyOn(<IOTileAdapter>device.adapter, 'typedRPC').and.returnValue([]);

        let time = await device.currentTime();

        expect(time).toBeDefined();
        // FIXME: real time
        expect(time.currentTime).toEqual(15);
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