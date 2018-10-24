import {IOTileDevice} from "../../src/device/iotile-device";
import {IOTileAdvertisement}  from "../../src/device/iotile-advert-serv";
import {IOTileAdapter}  from "../../src/device/iotile-serv";
import {POD1M} from "../../src/device/pod-1m";

describe('module: iotile.device, POD-1MDevice', function () {
    let device: IOTileDevice;
    let pod1m: POD1M;

    beforeEach(function () {
        let adapter = {};
        let advert = {};
        device = new IOTileDevice(<IOTileAdapter>adapter, <IOTileAdvertisement>advert);
        pod1m = new POD1M(device, <IOTileAdapter>adapter);
    });

    it('should get shock information from the device', async function() {

        spyOn(pod1m.adapter, 'typedRPC').and.returnValue([1129, 6, -10186, 22172, 5166]);

        let shockInfo = await pod1m.getShockInfo(1);

        expect(shockInfo).toBeDefined();
        expect(shockInfo.peakVal).toEqual(13.818000000000001);
        expect(shockInfo.axis).toEqual(1);
        expect(shockInfo.duration).toEqual(6);
        expect(shockInfo.dVx).toEqual(-0.155426025390625);
        expect(shockInfo.dVy).toEqual(0.33831787109375);
        expect(shockInfo.dVz).toEqual(0.078826904296875);
        expect(shockInfo.largestDeltaV).toEqual(0.33831787109375 * 39.3701);
    });
});