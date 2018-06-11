import { AdapterEvent, IOTileCharacteristic} from "../../src/common/iotile-types";
import {IOTileStreamingInterface} from "../../src/device/iotile-iface-streaming";
import {setupMockBLE} from "../../src/mocks/helpers/mock-ble-setup";
import {feedInPieces, createIndividualReport, expectIndividual, createSequentialReport, createHashListReport, createReading, expectSequential} from "../../src/mocks/helpers/report-creation.util";

describe('module: iotile.device, class: IOTileStreamingInterface', function () {
	let iface: IOTileStreamingInterface;
	let channel: any;

	let streamingHandler;

	beforeEach(function () {
        setupMockBLE({});
	});

	beforeEach(function() {
		streamingHandler = null;

		iface = new IOTileStreamingInterface(64*1024);
		channel = {
            write: async function (char, value) {

            },

            subscribe: async function(char, handler) {
                if (char === IOTileCharacteristic.Streaming) {
                    streamingHandler = handler;
                } else {
                    console.log('Char in subscribe: ' + char);
                    console.log('handler in subscribe: ' + handler);
                }
            },

            notify: jasmine.createSpy('NotifyEvent')
		};

		iface.open(channel);
	})

	it('should subscribe on open', function () {
		expect(streamingHandler).not.toBeNull();
	})

	it('should emit individual report events', function () {
        var report = createIndividualReport(1, 'output 1', 2, 10, 1);
        streamingHandler(report);

        expect(channel.notify).toHaveBeenCalledTimes(1);
        expect(channel.notify.calls.mostRecent().args[0]).toBe(AdapterEvent.RawRealtimeReading);
        expectIndividual(channel.notify.calls.mostRecent().args[1], 1, 'output 1', 2, 10, 1)
	})

    it('should emit robust report events', function () {
        var report = createSequentialReport(1, 'output 1', 100, 0);
        feedInPieces(report, streamingHandler, 20);

        //We should get 1 start and ended event, 19 progress events and 1 complete report event
        expect(channel.notify).toHaveBeenCalledTimes(22);
        expect(channel.notify.calls.argsFor(0)[0]).toBe(AdapterEvent.RobustReportStarted);
        
        for (let i = 1; i < 20; ++i) {
            expect(channel.notify.calls.argsFor(i)[0]).toBe(AdapterEvent.RobustReportProgress);
            expect(channel.notify.calls.argsFor(i)[1].finishedPercentage).toBe(i*5);
        }

        expect(channel.notify.calls.argsFor(20)[0]).toBe(AdapterEvent.RobustReportFinished);
        expect(channel.notify.calls.argsFor(21)[0]).toBe(AdapterEvent.RawRobustReport);
        expectSequential(channel.notify.calls.argsFor(21)[1], 1, 'output 1', 100, 0);
	})

    it('should not emit progress events for reports received in a single shot', function () {
        var report = createSequentialReport(1, 'output 1', 100, 0);
        streamingHandler(report);

        //We should get no progress events, just 1 complete report event
        expect(channel.notify).toHaveBeenCalledTimes(1);
        expect(channel.notify.calls.argsFor(0)[0]).toBe(AdapterEvent.RawRobustReport);
        expectSequential(channel.notify.calls.argsFor(0)[1], 1, 'output 1', 100, 0);
	})
})