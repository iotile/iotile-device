import {RingBuffer} from "../../src/common/ring-buffer";
import {StreamingTimeoutError} from "../../src";
import {IOTileCharacteristic} from "../../src/common/iotile-types";
import {IOTileTracingInterface} from "../../src/device/iotile-iface-tracing";
import {setupMockBLE} from "../helpers/mock-ble-setup";

describe('module: iotile.device, class: IOTileTracingInterface', function () {
	let iface: IOTileTracingInterface;
	let channel: any;

	let streamingHandler: (ArrayBuffer) => void;

	beforeEach(function () {
        setupMockBLE({});
	});

	beforeEach(function() {
		streamingHandler = null;

		iface = new IOTileTracingInterface();
		channel = {
            write: async function (char, value) {

            },

            subscribe: async function(char, handler) {
                if (char === IOTileCharacteristic.Tracing) {
                    streamingHandler = handler;
                } else {
                    console.log('Char in subscribe: ' + char);
                    console.log('handler in subscribe: ' + handler);
                }
            },

            notify: jasmine.createSpy('NotifyEvent')
		};

		iface.open(channel);
    });

    it('should have a functioning watchdog timeout', async (done) => {
        try {
            await iface.waitForData(100, 1);
            done.fail("Watchdog timeout was not triggered");
        } catch (err) {
            if (err instanceof StreamingTimeoutError) {
                done();
            } else {
                console.log("Wrong error type thrown during timeout")
                done.fail(err);
            }
        }
    });

    it('should correctly return data', async (done) => {
        try {
            let data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

            let prom = iface.waitForData(4);
            streamingHandler(data);
            
            let seg = await prom;
            expect(seg.byteLength).toEqual(4);
            expect(new Uint8Array(seg)).toEqual(new Uint8Array([0, 1, 2, 3]));

            seg = await iface.waitForData(6);
            expect(seg.byteLength).toEqual(6);
            expect(new Uint8Array(seg)).toEqual(new Uint8Array([4, 5, 6, 7, 8, 9]));
            done();
        } catch (err) {
            done.fail(err);
        }
    });
});