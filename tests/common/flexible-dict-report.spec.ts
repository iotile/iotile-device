import {FlexibleDictionaryReport, IOTileEvent} from "../../src/common/flexible-dict-report";
import {decode} from "msgpack-lite";

const CORRECT_REPORT: object = {
    "format": "v100",
    "device": 10,
    "streamer_index": 256,
    "streamer_selector": 65535,
    "incremental_id": 0,
    "device_sent_timestamp": 4294967295,
    "events": [
      {
        "stream": 20512,
        "device_timestamp": 0,
        "streamer_local_id": 1,
        "timestamp": null,
        "data": {
          "accel": [
            
          ]
        },
        "extra_data": {
          "test": 1
        }
      },
      {
        "stream": 20512,
        "device_timestamp": 0,
        "streamer_local_id": 2,
        "timestamp": null,
        "data": {
          "accel": [
            
          ]
        },
        "extra_data": {
          "test": 2
        }
      }
    ],
    "data": [
      
    ],
    "lowest_id": 1,
    "highest_id": 2
};

describe("FlexibleDictionaryReport", () => {
    let event1 = new IOTileEvent(0x5020, 0, {'test': 1}, {'accel': []}, 1);
    let event2 = new IOTileEvent(0x5020, 0, {'test': 2}, {'accel': []}, 2);

    it("should construct correctly", () => {
        let report = new FlexibleDictionaryReport(10, [], [event2, event1]);

        expect(report.toObject()).toEqual(<any>CORRECT_REPORT);
    });

    it("should encode to msgpack correctly", () => {
        let report = new FlexibleDictionaryReport(10, [], [event2, event1]);

        let encoded = report.toMsgpack();

        let obj = decode(new Uint8Array(encoded));
        expect(obj).toEqual(CORRECT_REPORT);
    });
});