import { UTCAssigner, UTCAssignerOptions, AnchorValueProcessor } from "../../src/common/utc-assigner";
import { createSequentialReport } from "../../src/mocks/helpers/report-creation.util";
import { SignedListReport, RawReading } from "../../src/common/iotile-reports";

describe('UTC Assigner', function() {
    let regular: UTCAssignerOptions = {
        allowImprecise: false
    };

    let imprecise: UTCAssignerOptions = {
        allowImprecise: true
    };

    let extrapolatingAssigner: UTCAssigner;
    let impreciseAssigner: UTCAssigner;
    let report: SignedListReport;
    let user: SignedListReport;

    beforeEach(function (){
        extrapolatingAssigner = new UTCAssigner(regular);
        impreciseAssigner = new UTCAssigner(imprecise);

        // let userBinary = createSequentialReport(1, 'output 1', 100, 0);
        // let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 0);

        // // @ts-ignore
        // [user] = reportParser.pushData(userBinary);
        // // @ts-ignore
        // [report] = reportParser.pushData(systemBinary);
    });

    it('should be able to assign an imprecise UTC Timestamp', function(){
        /* Segments: 
        [0 --{Anchor: 3}-- 4] <break: 5> [5 --{Anchor: 7}--10][10 --- ?]
        */
        let newUTC = new Date(2018, 10, 11);
        let newerUTC = new Date(2018, 10, 11, 1, 0);
        
        impreciseAssigner.addAnchorPoint(3, 12345, newUTC);
        impreciseAssigner.addAnchorPoint(5, 0, null, true);
        impreciseAssigner.addAnchorPoint(7, 123, newerUTC);

        let approxTime = impreciseAssigner.assignUTCTimestamp(1, 12300);
        let approxTime2 = impreciseAssigner.assignUTCTimestamp(5, 12);
        
        expect(approxTime).toBeDefined();
        expect(approxTime2).toBeDefined();
        
        expect(approxTime2.getTime()).toBeGreaterThan(approxTime.getTime());
    });

    it('should be able to add an anchor point', function(){
        // should be able to add anchor points with no explicit timebreaks
        let utc = new Date(2018, 10, 11);
        extrapolatingAssigner.addAnchorPoint(1, 12345, utc);
        impreciseAssigner.addAnchorPoint(1, 12345, utc);

        // should be able to handle additional anchor point within same timesegment (replaces)
        let newUTC = new Date(2018, 10, 11, 0, 0, 2);
        extrapolatingAssigner.addAnchorPoint(3, 1234567, newUTC);
        impreciseAssigner.addAnchorPoint(3, 1234567, newUTC);
    });

    it('should be able to mark an anchor stream', function(){
        extrapolatingAssigner.markAnchorStream(5001);
        impreciseAssigner.markAnchorStream(5001);
        expect(true).toBeTruthy();

        let processor: AnchorValueProcessor = function(streamId, readingId, uptime, value) {
            return new Date(uptime);
        }

        extrapolatingAssigner.markAnchorStream(5001, processor);
        impreciseAssigner.markAnchorStream(5001, processor);
    });
    
})