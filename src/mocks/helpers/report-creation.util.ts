/**
 * Helper functions for creating and testing binary reports received from IOTile Devices
 */

import {ArgumentError} from "iotile-common";
import * as Utilities from "iotile-common";
import {IndividualReport, SignatureStatus, SignedListReport, SignedReportSelectors } from "../../iotile-device";


export function createIndividualReport (uuid: number, stream: string, value: number, sentTime: any, rawTime: any) {
    //The second byte parameter is reserved and set to zero
    return Utilities.packArrayBuffer('BBHLLLL', 0, 0, Utilities.mapStreamName(stream), uuid, sentTime, rawTime, value);
}

export function expectIndividual(inReport: any, uuid: number, stream: string, value: number, sentTime: any, rawTime: any) {
    expect(inReport.constructor.name).toBe('IndividualReport');

    let report = inReport as IndividualReport;
    expect(report.deviceID).toBe(uuid);

    if (uuid !== report.deviceID) {
        debugger;
    }

    expect(report.reading.stream).toBe(Utilities.mapStreamName(stream));
    expect(report.reading.value).toBe(value);
    expect(report.reading.timestamp).toBe(rawTime);
    expect(report.sentTimestamp).toBe(sentTime);
}

export function expectSequential(inReport: any, uuid: number, stream: string, count: number, streamer: number) {
    expect(inReport.constructor.name).toBe('SignedListReport');

    let report = inReport as SignedListReport;
    let header = report.header;

    expect(report.validity).toEqual(SignatureStatus.Valid);
    expect(header.uuid).toEqual(uuid);
    expect(header.streamer).toEqual(streamer);
    expect(report.readings.length).toEqual(count);

    for (let i = 0; i < count; ++i) {
        let reading = report.readings[i];

        expect(reading.id).toEqual(i+1);
        expect(reading.value).toEqual(i);
        expect(reading.timestamp).toEqual(i);
        expect(reading.stream).toEqual(Utilities.mapStreamName(stream));
    }
}

export function feedInPieces(report: ArrayBuffer, handler: (ArrayBuffer: ArrayBuffer) => void, size: number) {
    for (let i = 0; i < report.byteLength; i += size) {
        handler(report.slice(i, i+size));
    }
}

export function createReading (stream: string, timestamp: any, value: number, id: any) {
    return {
        'stream': Utilities.mapStreamName(stream),
        'timestamp': timestamp,
        'value': value,
        'id': id
    };
}

export function createSequentialReport(uuid: number, stream: string, count: number, streamer: number, start?: number) {
    let readings = [];

    if (start == null) {
        start = 0;
    }

    for (let i = start; i < (start + count); ++i) {
        readings.push(createReading(stream, i, i, i+1));
    }

    return createHashListReport(uuid, count+1, streamer, count + start, readings);
}

export function createHashListReport (uuid: number, reportID: number, streamer: any, sentTime: any, readings: any, selector?: number) {
    var length = 20 + 24 + readings.length * 16;
    var report = new ArrayBuffer(length);
    var lowestID = 0xFFFFFFFF;
    var highestID = 0;

    //If no explicit selector is given, choose one based on what streamer index was given
    if (selector == null) {
        if (streamer == 0) {
            selector = SignedReportSelectors.UserOutputs;
        } else if (streamer == 1) {
            selector = SignedReportSelectors.SystemOutputs;
        } else {
            throw new ArgumentError("No selector specified and a streamer was given that was not 'well-known'");
        }
    }

    var header = Utilities.packArrayBuffer('BBHLLLBBH', 1, length & 0xFF, length >> 8, uuid, reportID, sentTime, 0, streamer, selector);
    Utilities.copyArrayBuffer(report, header, 0, 0, header.byteLength);

    for (var i = 0; i < readings.length; ++i) {
        var data = readings[i];
        var reading = Utilities.packArrayBuffer('HHLLL', data.stream, 0, data.id, data.timestamp, data.value);
        
        Utilities.copyArrayBuffer(report, reading, 0, (20 + 16*i), reading.byteLength);

        if (data.id < lowestID) {
            lowestID = data.id;
        }

        if (data.id > highestID) {
            highestID = data.id;
        }
    }

    let footer = Utilities.packArrayBuffer('LLLLLL', lowestID, highestID, 0, 0, 0, 0);
    Utilities.copyArrayBuffer(report, footer, 0, 20 + (readings.length * 16), footer.byteLength);

    //Calculate and paste in the correct signature
    let calc = new Utilities.SHA256Calculator();
    let sig = calc.calculateSignature(report.slice(0, report.byteLength - 16));
    
    Utilities.copyArrayBuffer(report, sig, 0, report.byteLength - 16, 16);
    return report;
}