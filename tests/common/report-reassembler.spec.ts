import {ReportReassembler} from "../../src/common/report-reassembler";
import {SignedListReport, SignatureStatus} from "../../src/common/iotile-reports";
import {copyArrayBuffer} from "@iotile/iotile-common";


function duplicateBuffer(input: ArrayBuffer): ArrayBuffer {
    let output = new ArrayBuffer(input.byteLength);

    copyArrayBuffer(output, input, 0, 0, input.byteLength);
    return output
}

function convertErrorList(errors: any[]): any {
    let out = [];

    for (let [src, dst] of errors) {
        out.push({
            src: src,
            dst: dst
        });
    }

    return out;
}

function checkReport(data: ArrayBuffer, errors: any[]) {
        let fixer = new ReportReassembler(data);
        expect(fixer.isValid()).toBeFalsy();

        let result = fixer.fixOutOfOrderChunks();
        let trans = fixer.getTranspositions();

        expect(trans).toEqual(convertErrorList(errors));
        expect(result).toBeTruthy();
        expect(fixer.isValid()).toBeTruthy();
}

describe('class: ReportReassembler', () => {
    it('should fix invalid report 1', () => {
        let testReportData = require("./test-data/2018-07-26T12_57_21.728491Z--kale.b64");
        testReportData = duplicateBuffer(testReportData);

        let testReportErrors = [[21, 18], [22, 19], [23, 20], [24, 21], [25, 22], [26, 23], [27, 24], [61, 60], [62, 61]];
        checkReport(testReportData, testReportErrors);
    });

    it('should fix invalid report 2', () => {
        let testReportData = require("./test-data/2018-07-19T06_36_43Z.b64");
        testReportData = duplicateBuffer(testReportData);

        let testReportErrors = [[121, 120], [122, 121], [123, 122], [124, 123], [125, 124], [126, 125], [127, 126], [128, 127], [129, 128], [130, 129], [131, 130], [132, 131], [133, 132]];
        checkReport(testReportData, testReportErrors);
    });

    it('reports should fix themselves', () => {
        let testReportData = require("./test-data/2018-07-26T12_57_21.728491Z--kale.b64");
        testReportData = duplicateBuffer(testReportData);

        let report = new SignedListReport(1, 0, testReportData, new Date());
        expect(report.validity).toEqual(SignatureStatus.Valid);
        expect(report.readings.length).toEqual(98);

        expect(report.readingIDRange).toEqual([35, 278]);
    });
});