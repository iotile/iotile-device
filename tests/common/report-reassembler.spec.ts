import {ReportReassembler} from "../../src/common/report-reassembler";

function createArrayBuffer(base64Data: string): ArrayBuffer {
    var raw = window.atob(base64Data);
    var rawLength = raw.length;
    var buffer = new ArrayBuffer(rawLength);
    var array = new Uint8Array(buffer);

    for(let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    return buffer;
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
        let testReportErrors = [[21, 18], [22, 19], [23, 20], [24, 21], [25, 22], [26, 23], [27, 24], [61, 60], [62, 61]];
        checkReport(testReportData, testReportErrors);
    });

    it('should fix invalid report 2', () => {
        let testReportData = require("./test-data/2018-07-19T06_36_43Z.b64");
        let testReportErrors = [[121, 120], [122, 121], [123, 122], [124, 123], [125, 124], [126, 125], [127, 126], [128, 127], [129, 128], [130, 129], [131, 130], [132, 131], [133, 132]];
        checkReport(testReportData, testReportErrors);
        
    });
});