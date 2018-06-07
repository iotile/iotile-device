import {RingBuffer} from "../../src/common/ring-buffer";
import * as IOTileDeviceModule from "../../src/iotile-device";
import {createSequentialReport, createHashListReport, expectSequential} from "../../src/iotile-device";


describe('module: iotile.common, class: SignedListReportMerger', function () {
    let reportParser: IOTileDeviceModule.ReportParser;
    let merger: IOTileDeviceModule.SignedListReportMerger;

    beforeEach(function () {
        reportParser = new IOTileDeviceModule.ReportParser(192*1024);
        merger = new IOTileDeviceModule.SignedListReportMerger();
    });

    it('should merge two reports', function () {
        let userBinary = createSequentialReport(1, 'output 1', 100, 0);
        let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 100);

        let [user]: [IOTileDeviceModule.SignedListReport] = <any>reportParser.pushData(userBinary);
        let [system]: [IOTileDeviceModule.SignedListReport] = <any>reportParser.pushData(systemBinary);

        let merged = merger.mergeReports(user, system);

        expect(merged.readings.length).toEqual(200);

        for (let i = 0; i < 200; ++i) {
            expect(merged.readings[i].id == i);
        }

        expect(merged.validity).toEqual(IOTileDeviceModule.SignatureStatus.Valid);
        expect(merged.deviceID).toEqual(system.deviceID);
        expect(merged.readingIDRange[0]).toEqual(1);
        expect(merged.readingIDRange[1]).toEqual(200);
    });
});