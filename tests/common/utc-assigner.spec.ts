import { UTCAssigner, UTCAssignerOptions } from "../../src/common/utc-assigner";
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

        let userBinary = createSequentialReport(1, 'output 1', 100, 0);
        let systemBinary = createSequentialReport(1, 'system output 10', 100, 1, 0);

        // @ts-ignore
        [user] = reportParser.pushData(userBinary);
        // @ts-ignore
        [report] = reportParser.pushData(systemBinary);
    });

    it('should be able to assign a UTC Timestamp', function(){

        // extrapolatingAssigner.assignUTCTimestamp()
        // impreciseAssigner.assignUTCTimestamp()
        expect(true).toBeTruthy();
    });

    it('should be able to add an anchor point', function(){
        // extrapolatingAssigner.addAnchorPoint()
        // impreciseAssigner.addAnchorPoint()
        expect(true).toBeTruthy();
    });

    it('should be able to add a time break', function(){
        // extrapolatingAssigner.addTimeBreak()
        // impreciseAssigner.addTimeBreak()
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
        // extrapolatingAssigner.markAnchorStream()
        // impreciseAssigner.markAnchorStream()
        expect(true).toBeTruthy();
    });
    
})