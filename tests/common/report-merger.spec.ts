import {ReportParser} from "../../src/device/iotile-report-parser";
import {createSequentialReport} from "../../src/mocks/helpers/report-creation.util";
import {SignedListReportMerger} from "../../src/common/report-merger";
import {SignedListReport, SignatureStatus} from "../../src/common/iotile-reports";

describe('module: iotile.common, class: SignedListReportMerger', function () {
    let reportParser: ReportParser;
    let merger: SignedListReportMerger;

    beforeEach(function () {
        reportParser = new ReportParser(192*1024);
        merger = new SignedListReportMerger();
    });

    it('should merge two reports', function () {
        let userBinary = createSequentialReport(1, 'output 1', 100, 0);
        let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 100);

        let [user]: [SignedListReport] = reportParser.pushData(userBinary);
        let [system]: [SignedListReport] = reportParser.pushData(systemBinary);

        let merged = merger.mergeReports(user, system);

        expect(merged.readings.length).toEqual(200);

        for (let i = 0; i < 200; ++i) {
            expect(merged.readings[i].id == i);
        };

        expect(merged.validity).toEqual(SignatureStatus.Valid);
        expect(merged.deviceID).toEqual(system.deviceID);
        expect(merged.readingIDRange[0]).toEqual(1);
        expect(merged.readingIDRange[1]).toEqual(200);
    });
});