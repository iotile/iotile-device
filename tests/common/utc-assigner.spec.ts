import { UTCAssigner, UTCAssignerOptions, AnchorValueProcessor } from "../../src/common/utc-assigner";
import { createSequentialReport } from "../../src/mocks/helpers/report-creation.util";
import { SignedListReport, RawReading } from "../../src/common/iotile-reports";

describe('UTC Assigner', function() {
    let extrapolate: UTCAssignerOptions = {
        allowExtrapolation: true,
        allowImprecise: false
    };

    let imprecise: UTCAssignerOptions = {
        allowExtrapolation: false,
        allowImprecise: true
    };

    let extrapolatingAssigner: UTCAssigner;
    let impreciseAssigner: UTCAssigner;
    let report: SignedListReport;
    let user: SignedListReport;

    beforeEach(function (){
        extrapolatingAssigner = new UTCAssigner(extrapolate);
        impreciseAssigner = new UTCAssigner(imprecise);

        // let userBinary = createSequentialReport(1, 'output 1', 100, 0);
        // let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 0);

        // // @ts-ignore
        // [user] = reportParser.pushData(userBinary);
        // // @ts-ignore
        // [report] = reportParser.pushData(systemBinary);
    });

    it('should be able to assign an imprecise UTC Timestamp', function(){
        /* Sements: 
        [0 --{Anchor: 3}-- 4] <break: 5> [5 --{Anchor: 7}--Infinity]
        */
        let newUTC = new Date(2018, 10, 11);
        let newerUTC = new Date(2018, 10, 11, 1, 0);
        
        impreciseAssigner.addAnchorPoint(3, 12345, newUTC);
        impreciseAssigner.addTimeBreak(5);
        impreciseAssigner.addAnchorPoint(7, 123, newerUTC);

        console.log(JSON.stringify(impreciseAssigner.timeSegments));

        let approxTime = impreciseAssigner.assignUTCTimestamp(1, 12300);
        let approxTime2 = impreciseAssigner.assignUTCTimestamp(5, 12);
        let approxTime3 = impreciseAssigner.assignUTCTimestamp(8, 123);
        
        console.log("APPROXIMATE");
        console.log(JSON.stringify(approxTime));
        console.log(JSON.stringify(approxTime2));
        console.log(JSON.stringify(approxTime3));
        
        expect(approxTime).toBeDefined();
        expect(approxTime2).toBeDefined();
        expect(approxTime3).toBeDefined();

        // FIXME: add check for argument error [no extrapolation]
        
        // expect(approxTime2.getTime()).toBeGreaterThan(approxTime.getTime());
        // expect(approxTime3.getTime()).toBeGreaterThan(approxTime2.getTime());
    });

    it('should be able to assign an extrapolated UTC Timestamp', function(){
        /* Sements: 
        [0 --{Anchor: 3}-- 4] <break: 5> [5 --{Anchor: 7}--Infinity]
        */
        let newUTC = new Date(2018, 10, 11);
        let newerUTC = new Date(2018, 10, 11, 1, 0);

        extrapolatingAssigner.addAnchorPoint(3, 12345, newUTC);
        extrapolatingAssigner.addTimeBreak(5);
        extrapolatingAssigner.addAnchorPoint(7, 123, newerUTC);
        
        let extraTime = extrapolatingAssigner.assignUTCTimestamp(1, 12300); 

        let extraTime2 = extrapolatingAssigner.assignUTCTimestamp(5, 12); 
        let extraTime3 = extrapolatingAssigner.assignUTCTimestamp(8, 123);
        
        console.log(JSON.stringify(extraTime));
        console.log(JSON.stringify(extraTime2));
        console.log(JSON.stringify(extraTime3));

        expect(extraTime).toBeDefined();
        expect(extraTime2).toBeDefined();
        expect(extraTime3).toBeDefined();
        // expect(extraTime2.getTime()).toBeGreaterThan(extraTime.getTime());
        // expect(extraTime3.getTime()).toBeGreaterThan(extraTime2.getTime());
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

        extrapolatingAssigner.addTimeBreak(5);
        impreciseAssigner.addTimeBreak(5);

        // should be able to add additional anchorpoints after timebreak
        let newerUTC = new Date(2018, 10, 11, 3, 4);
        extrapolatingAssigner.addAnchorPoint(1, 123456789, newerUTC);
        impreciseAssigner.addAnchorPoint(1, 123456789, newerUTC);

    });

    it('should be able to add a time break', function(){
        expect(extrapolatingAssigner.timeSegments).toBeDefined();
        expect(impreciseAssigner.timeSegments).toBeDefined();
        expect(extrapolatingAssigner.timeSegments.length).toEqual(1);
        expect(impreciseAssigner.timeSegments.length).toEqual(1);

        extrapolatingAssigner.addTimeBreak(2);
        impreciseAssigner.addTimeBreak(2);

        expect(extrapolatingAssigner.timeSegments).toBeDefined();
        expect(impreciseAssigner.timeSegments).toBeDefined();
        expect(extrapolatingAssigner.timeSegments.length).toEqual(2);
        expect(impreciseAssigner.timeSegments.length).toEqual(2);

        expect(extrapolatingAssigner.timeSegments[0].lastReadingId).toEqual(1);
        expect(impreciseAssigner.timeSegments[0].lastReadingId).toEqual(1);
        expect(extrapolatingAssigner.timeSegments[1].lastReadingId).toEqual(Infinity);
        expect(impreciseAssigner.timeSegments[1].lastReadingId).toEqual(Infinity);
        expect(extrapolatingAssigner.timeSegments[1].firstReadingId).toEqual(2);
        expect(impreciseAssigner.timeSegments[1].firstReadingId).toEqual(2);
        expect(extrapolatingAssigner.timeSegments[1].placeholder).toBeTruthy();
        expect(impreciseAssigner.timeSegments[1].placeholder).toBeTruthy();
    });

    // TODO
    xit('should be able to add anchors from a report', function(){
        extrapolatingAssigner.addAnchorsFromReport(report)
        impreciseAssigner.addAnchorsFromReport(report)
        expect(true).toBeTruthy();
    });

    // TODO: hard to make reports with breaks
    xit('should be able to add breaks from a report', function(){
        extrapolatingAssigner.addBreaksFromReport(report)
        impreciseAssigner.addBreaksFromReport(report)
        expect(true).toBeTruthy();
    });


    it('should be able to mark an anchor stream', function(){
        extrapolatingAssigner.markAnchorStream(5001);
        impreciseAssigner.markAnchorStream(5001);
        expect(true).toBeTruthy();

        let processor: AnchorValueProcessor = function(streamId, readingId, uptime, value){
            return uptime + 12345;
        }
        extrapolatingAssigner.markAnchorStream(5001, processor);
        impreciseAssigner.markAnchorStream(5001, processor);
    });
    
})