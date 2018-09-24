import { IndividualReport, RawReading } from "../../src/common/iotile-reports";
import { unpackArrayBuffer, packArrayBuffer } from "iotile-common";

describe('IndividualReport', function() {

    it('should decode a negative number reading value', function(){
        // Get same value, packed with 'L' and 'l'
        let [signed] = unpackArrayBuffer('l', packArrayBuffer('l', -45));
        let unsigned = (new Uint32Array([-45]))[0];

        let rawReading = new RawReading(1, unsigned, 1, new Date(), 1);
        let report = new IndividualReport(1, 1, rawReading);
        expect(report.reading.value).toBe(unsigned);

        report.decodeUsingFormat('<L');
        expect(report.reading.value).toBe(unsigned);

        report.decodeUsingFormat('<l');
        expect(report.reading.value).toBe(signed);
        expect(signed).toBe(-45);
    });
})

describe('SignedListReport', function() {
    it('should be able to correct a report received out of order', function(){
        // TODO: define a good test
        expect(true).toBeTruthy();
        let testReportData = require("./test-data/2018-07-26T12_57_21.728491Z--kale.b64");
    });
})