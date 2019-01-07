import { DecodedWaveformInfo } from "./types";
import { SignedListReport } from "../../common/iotile-reports";
import { UTCAssigner } from "../../common/utc-assigner";
import { catUTCAssigner } from "../../config";
import { START_STREAM, END_STREAM } from "./constants";

export function ensureUTCTimestamps(waveforms: DecodedWaveformInfo, reports: SignedListReport[]) {
    let waveIDMap = createWaveMap(reports);
    let timeMap = new UTCAssigner({
        allowImprecise: true
    });

    timeMap.markAnchorStream(START_STREAM, "epoch");
    timeMap.markAnchorStream(END_STREAM, "epoch");

    for (let report of reports) {
        timeMap.addAnchorsFromReport(report);
    }

    for (let waveID in waveforms) {
        let wave = waveforms[waveID];

        if (!(waveID in waveIDMap)) {
            catUTCAssigner.warn(`Dropping waveform ${waveID} that was not present in controller reports`);
            continue;
        } 

        if (wave.utcTimestamp != null) continue;
        
        let readingID = waveIDMap[waveID];
        
        try {
            wave.utcTimestamp = timeMap.assignUTCTimestamp(readingID, wave.deviceTimestamp);
            catUTCAssigner.debug(`Assigned ${wave.utcTimestamp} to waveform id ${waveID} with controller ID ${readingID}`);
        } catch (err) {
            catUTCAssigner.warn(`Could not assign UTC timestamp to waveform ${waveID} with controller ID ${readingID} and timestamp 0x${wave.deviceTimestamp.toString(16)}`);
        }
    }
}

export function dropNonUTCTimestamps(waveforms: DecodedWaveformInfo): number {
    let dropCount = 0;

    for (let waveID in waveforms) {
        let wave = waveforms[waveID];

        if (wave.utcTimestamp == null) {
            delete waveforms[waveID];
            dropCount += 1;
        }
    }

    return dropCount;
}

// {x.value: x.reading_id for x in user_report.visible_readings if x.stream == 0x5020}
function createWaveMap(reports: SignedListReport[]): {[key: number]: number} {
    let waveMap: {[key: number]: number} = {};

    for (let report of reports) {
        catUTCAssigner.debug(`Adding waveforms from report streamer ${report.streamer} id range ${report.readingIDRange[0]}, ${report.readingIDRange[1]} with ${report.readings.length} readings.`);

        if (report.streamer == 0) {
            for (let reading of report.readings) {
                if (reading.stream == 0x5020) {
                    waveMap[reading.value] = reading.id;
                }
            }
        }
    } 
    return waveMap;
}
