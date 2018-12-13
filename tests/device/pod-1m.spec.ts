import {IOTileDevice} from "../../src/device/iotile-device";
import {IOTileAdvertisement}  from "../../src/device/iotile-advert-serv";
import {IOTileAdapter}  from "../../src/device/iotile-serv";
import {POD1M} from "../../src/device/pod-1m";
import {unpackVLEIntegerList, calculateDeltaV, summarizeWaveform, timeAboveThreshold, summarizeAxis} from "../../src/device/pod-1m/utilities";

describe('module: iotile.device, POD-1MDevice', function () {
    let device: IOTileDevice;
    let pod1m: POD1M;

    beforeEach(function () {
        let adapter = {};
        let advert = {};
        device = new IOTileDevice(<IOTileAdapter>adapter, <IOTileAdvertisement>advert);
        pod1m = new POD1M(device, <IOTileAdapter>adapter);
        // @ts-ignore
        pod1m.adapter.typedRPC = function () { return Promise.reject()};
    });

    it('should get shock information from the device', async function() {
        spyOn(<IOTileAdapter>pod1m.adapter, 'typedRPC').and.returnValue(Promise.resolve([1129, 6, -10186, 22172, 5166]));

        let shockInfo = await pod1m.getShockInfo(1);

        expect(shockInfo).toBeDefined();
        expect(shockInfo.peakVal).toEqual(13.818000000000001);
        expect(shockInfo.axis).toEqual("Y");
        expect(shockInfo.duration).toEqual(6);
        expect(shockInfo.dVx).toEqual(-0.155426025390625);
        expect(shockInfo.dVy).toEqual(0.33831787109375);
        expect(shockInfo.dVz).toEqual(0.078826904296875);
        expect(shockInfo.largestDeltaV).toEqual(0.33831787109375 * 39.3701);
    });

    it('should get accelerometer status information from the device', async function() {
        spyOn(<IOTileAdapter>pod1m.adapter, 'typedRPC').and.returnValue(Promise.resolve([0, 4, 1, 0, 0, 7, 65532, 1, 26, 0, 0]));

        let status = await pod1m.getAccelerometerStatus();

        expect(status).toBeDefined();
        expect(status.recording).toBeTruthy();
        expect(status.settled).toBeTruthy();
        expect(status.streaming).toBeFalsy();
        expect(status.tile_state).toEqual("capturing");
    });
});

describe("Waveform Unpacking", () => {
    it("should correctly unpack encoded integer lists", () => {
        //Test unpacking 1 and 2-byte encoded positive and negative integers 
        //and make sure the delta decoding is properly applied
        let test = new Uint8Array([0x00, 0x04, 0x01, 0x00, 0x03, 0x05, 0x01, (1 << 7) | 2, 4]);

        let output = unpackVLEIntegerList(<ArrayBuffer>test.buffer);
        expect(output).toEqual([0, 2, 1, 1, -1, -4, -5, -5 + ((2 << 7) | 1)]);
    });
});

describe("Waveform Summarizing", () => {
    it("should correctly calculate waveform statistics", () => {
        let dataX = [0.0, 2.0, 3.0, 2.0, -2.0, 0.0, -4.0, -4.0];
        let dataY = [0.0, 2.0, 3.0, 2.0, -2.0, 0.0, -5.0, -3.0];
        let dataZ = [0.0, 2.0, 3.0, 2.0, -2.0, 0.0, -6.0, -2.0];

        let deltaV = calculateDeltaV(dataX, 1.0, 100.0);
        expect(deltaV).toBeCloseTo((-8 * 9.80665 / 100.0));

        let duration = timeAboveThreshold(dataY, 1.0, 100.0);
        expect(duration).toBeCloseTo(3 / 100.0 * 1000.0);

        let xSumm = summarizeAxis(dataX, 1.0, 100.0);
        expect(xSumm).toEqual({
            timeAboveThreshold: duration,
            peak: 4.0,
            deltaV: deltaV
        });

        let summ = summarizeWaveform({
            acceleration_data: {
                x: dataX,
                y: dataY,
                z: dataZ,
            },
            crc_code: 0,
            sampling_rate: 100.0
        });

        expect(summ).toEqual({"peak":6,"axis":"z","duration":30,"delta_v_x":-0.784532,"delta_v_y":-0.784532,"delta_v_z":-0.784532});
    });
});