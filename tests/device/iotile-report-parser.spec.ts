import * as Utilities from "iotile-common";
import {ReportParser, ReceiveStatus, ReportParserEvent, ReportProgressEvent} from "../../src/device/iotile-report-parser";
import {createIndividualReport, expectIndividual, createSequentialReport, createReading, expectSequential} from "../../src/mocks/helpers/report-creation.util";
import {createHashListReport} from "../../src/mocks/utilities";

describe('module: iotile.device, class: ReportParser', function () {
    let reportParser: ReportParser;

    beforeEach(function () {
        reportParser = new ReportParser(16*1024);
    });

    it('should parse a single individual report', function () {
        var report = createIndividualReport(1, 'output 1', 2, 10, 1);

        let parsed = reportParser.pushData(report);
        
        expect(parsed.length).toBe(1);

        //We should have exactly one individual report
        expectIndividual(parsed[0], 1, 'output 1', 2, 10, 1);
    });

    it('should parse multiple individual reports', function () {
        var report1 = createIndividualReport(1, 'output 1', 2, 10, 1);
        var report2 = createIndividualReport(1, 'output 2', 3, 11, 2);

        var combined = new ArrayBuffer(report1.byteLength + report2.byteLength);
        Utilities.copyArrayBuffer(combined, report1, 0, 0, report1.byteLength);
        Utilities.copyArrayBuffer(combined, report2, 0, report1.byteLength, report2.byteLength);

        let parsed = reportParser.pushData(combined);
        
        expect(parsed.length).toBe(2);

        //We should have two individual reports
        expectIndividual(parsed[0], 1, 'output 1', 2, 10, 1);
        expectIndividual(parsed[1], 1, 'output 2', 3, 11, 2);
    });

    it('should handle reports received in chunks', function () {
        var report1 = createIndividualReport(1, 'output 1', 2, 10, 1);
        var report2 = createIndividualReport(1, 'output 2', 3, 11, 2);

        var combined = new ArrayBuffer(report1.byteLength + report2.byteLength);
        Utilities.copyArrayBuffer(combined, report1, 0, 0, report1.byteLength);
        Utilities.copyArrayBuffer(combined, report2, 0, report1.byteLength, report2.byteLength);

        //We should handle receiving reports that are not on exact boundaries
        let parsed = reportParser.pushData(combined.slice(0, 19));
        expect(parsed.length).toBe(0);

        parsed = reportParser.pushData(combined.slice(19,));
        expect(parsed.length).toBe(2);

        //We should have two individual reports
        expectIndividual(parsed[0], 1, 'output 1', 2, 10, 1);
        expectIndividual(parsed[1], 1, 'output 2', 3, 11, 2);
    });

    it('should handle receiving a list report', function () {
        let report = createSequentialReport(1, 'output 1', 100, 0);

        let parsed = reportParser.pushData(report);
        
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 1, 'output 1', 100, 0);
    })

    it('should handle receiving multiple list reports', function () {
        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let report2 = createSequentialReport(1, 'output 2', 100, 1);

        var combined = new ArrayBuffer(report1.byteLength + report2.byteLength);
        Utilities.copyArrayBuffer(combined, report1, 0, 0, report1.byteLength);
        Utilities.copyArrayBuffer(combined, report2, 0, report1.byteLength, report2.byteLength);

        let parsed = reportParser.pushData(combined);
        
        expect(parsed.length).toBe(2);
        expectSequential(parsed[0], 1, 'output 1', 100, 0);
        expectSequential(parsed[1], 1, 'output 2', 100, 1);
    })

    it('should handle receiving list reports in chunks', function () {
        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let report2 = createSequentialReport(1, 'output 2', 100, 1);

        var combined = new ArrayBuffer(report1.byteLength + report2.byteLength);
        Utilities.copyArrayBuffer(combined, report1, 0, 0, report1.byteLength);
        Utilities.copyArrayBuffer(combined, report2, 0, report1.byteLength, report2.byteLength);

        /**
         * Push in 2 reports making sure we cross report boundaries in multiple ways
         * - Part of a report
         * - Finishing a report and starting another one
         * - Completing a report that has previously been started
         * 
         * Make sure that the in progress state is also updated appropriately 
         */

        expect(reportParser.state).toBe(ReceiveStatus.Idle);
        let parsed = reportParser.pushData(combined.slice(0, 50));
        expect(parsed.length).toBe(0);
        expect(reportParser.state).toBe(ReceiveStatus.InProgress);
        expect(reportParser.inProgressReceived).toBe(50);
        expect(reportParser.inProgressTotal).toBe(report1.byteLength);

        parsed = reportParser.pushData(combined.slice(50, report1.byteLength+50));
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 1, 'output 1', 100, 0);
        expect(reportParser.state).toBe(ReceiveStatus.InProgress);
        expect(reportParser.inProgressReceived).toBe(50);
        expect(reportParser.inProgressTotal).toBe(report2.byteLength);

        parsed = reportParser.pushData(combined.slice(report1.byteLength+50, ));
        expect(reportParser.state).toBe(ReceiveStatus.Idle);
        expect(reportParser.inProgressReceived).toBe(0);
        expect(reportParser.inProgressTotal).toBe(0);
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 1, 'output 2', 100, 1);
    })

    it('should emit events while receiving long reports', function () {
        let events = [];

        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let progressEvents = 0;
        let percentages = []

        for (let i = 0; i < report1.byteLength; i += 20) {
            let slice = report1.slice(i, i+20);

            reportParser.pushData(slice);
            let event = reportParser.popLastEvent();

            if (i == 0) {
                expect(event).not.toBeNull();

                let event2 = event as ReportParserEvent;
                expect(event2.name).toBe('ReportStartedEvent');
            } else if ((report1.byteLength - i) < 20) {
                expect(event).not.toBeNull();

                let event2 = event as ReportParserEvent;
                expect(event2.name).toBe('ReportFinishedEvent');
            } else if (event !== null) {
                let event2 = event as ReportProgressEvent;
                expect(event2.name).toBe('ReportProgressEvent');
                expect(event2.finishedPercentage % 5).toBe(0); //Expect to get a progress update every 5% done
                percentages.push(event2.finishedPercentage);

                progressEvents += 1;
            }
        }

        //We should get progress updates from [5, 95] percent in 5% increments
        expect(progressEvents).toBe(19);
    })

    it('should emit events after resetting', function () {
        let events = [];

        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let progressEvents = 0;
        let percentages = []

        reportParser.pushData(report1.slice(0, 100));
        reportParser.reset();

        for (let i = 0; i < report1.byteLength; i += 20) {
            let slice = report1.slice(i, i+20);

            reportParser.pushData(slice);
            let event = reportParser.popLastEvent();

            if (i == 0) {
                expect(event).not.toBeNull();

                let event2 = event as ReportParserEvent;
                expect(event2.name).toBe('ReportStartedEvent');
            } else if ((report1.byteLength - i) < 20) {
                expect(event).not.toBeNull();

                let event2 = event as ReportParserEvent;
                expect(event2.name).toBe('ReportFinishedEvent');
            } else if (event !== null) {
                let event2 = event as ReportProgressEvent;
                expect(event2.name).toBe('ReportProgressEvent');
                expect(event2.finishedPercentage % 5).toBe(0); //Expect to get a progress update every 5% done
                percentages.push(event2.finishedPercentage);

                progressEvents += 1;
            }
        }

        //We should get progress updates from [5, 95] percent in 5% increments
        expect(progressEvents).toBe(19);
    })

    it('should handle receiving individual reports after signed lists', function () {
        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let report2 = createSequentialReport(1, 'output 2', 100, 1);
        let report3 = createIndividualReport(1, 'output 3', 2, 10, 1);

        let parsed = reportParser.pushData(report1);
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 1, 'output 1', 100, 0);

        parsed = reportParser.pushData(report2);
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 1, 'output 2', 100, 1);

        parsed = reportParser.pushData(report3);
        expect(parsed.length).toBe(1);
        expectIndividual(parsed[0], 1, 'output 3', 2, 10, 1);
    })

    it('should be able to process 10,000 reports without breaking', function () {
        var report1 = createIndividualReport(1, 'output 1', 2, 10, 1);
        
        for (let i = 0; i < 10000; ++i) {
            let parsed = reportParser.pushData(report1);

            expect(parsed.length).toBe(1);
            expectIndividual(parsed[0], 1, 'output 1', 2, 10, 1);
        }
    })

    it('should throw when you give it invalid data', function (done) {
        let report1 = createSequentialReport(15, 'output 2', 100, 1);

        try {
            let parsed = reportParser.pushData(report1.slice(20, ));
            done.fail('Should have thrown error on invalid data');
        } catch (err) {
            expect(err.name).toBe('ReportParsingError');
        }

        try {
            let parsed = reportParser.pushData(report1);
            done.fail('Should have thrown error on because we are stopped');
        } catch (err) {
            expect(err.name).toBe('ReportParsingStoppedError');
        }

        reportParser.reset();
        let parsed = reportParser.pushData(report1);
        expect(parsed.length).toBe(1);
        expectSequential(parsed[0], 15, 'output 2', 100, 1);

        done();
    })
})
