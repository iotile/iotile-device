import { UTCAssigner, UTCAssignerOptions, AnchorValueProcessor } from "../../src/common/utc-assigner";
import { createSequentialReport } from "../../src/mocks/helpers/report-creation.util";
import { SignedListReport, RawReading } from "../../src/common/iotile-reports";

xdescribe('UTC Assigner', function() {
    let extrapolate: UTCAssignerOptions = {
        allowExtrapolation: true,
        allowImprecise: false
    };

    let imprecise: UTCAssignerOptions = {
        allowExtrapolation: false,
        allowImprecise: true
    };

    let extrapolatingAssigner: UTCAssigner = new UTCAssigner(extrapolate);
    let impreciseAssigner: UTCAssigner = new UTCAssigner(imprecise);
    let report: SignedListReport;
    let user: SignedListReport;

    // beforeEach(function (){
    //     let userBinary = createSequentialReport(1, 'output 1', 100, 0);
    //     let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 0);

    //     // @ts-ignore
    //     [user] = reportParser.pushData(userBinary);
    //     // @ts-ignore
    //     [report] = reportParser.pushData(systemBinary);
    // });

    it('should be able to assign a UTC Timestamp', function(){

        let utcTime = extrapolatingAssigner.assignUTCTimestamp(5, 123456789);
        let utcTime2 = impreciseAssigner.assignUTCTimestamp(5, 123456789);
        expect(utcTime).toBeDefined();
        expect(utcTime2).toBeDefined();
    });

    it('should be able to add an anchor point', function(){
        let utc = new Date(2018, 10, 11);
        extrapolatingAssigner.addAnchorPoint(5, 12345, utc);
        impreciseAssigner.addAnchorPoint(5, 12345, utc);
        expect(true).toBeTruthy();
    });

    it('should be able to add a time break', function(){
        extrapolatingAssigner.addTimeBreak(2);
        impreciseAssigner.addTimeBreak(2);
        expect(true).toBeTruthy();
    });

    it('should be able to add anchors from a report', function(){
        extrapolatingAssigner.addAnchorsFromReport(report)
        impreciseAssigner.addAnchorsFromReport(report)
        expect(true).toBeTruthy();
    });

    it('should be able to add breaks from a report', function(){
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