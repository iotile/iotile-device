import { DecodedWaveformInfo } from "./types";
import { SignedListReport } from "../../common/iotile-reports";

export function ensureUTCTimestamps(waveforms: DecodedWaveformInfo, reports: SignedListReport[]) {
    let waveIDMap = createWaveMap(reports);

    for (let waveID in waveforms) {
        let wave = waveforms[waveID];

        if (!(waveID in waveIDMap))
            continue;
        
        if (wave.utcTimestamp != null)
            continue;
        
        //FIXME: Actually do the reconstruction here.
    }
}

// {x.value: x.reading_id for x in user_report.visible_readings if x.stream == 0x5020}
function createWaveMap(reports: SignedListReport[]): {[key: number]: number} {
    let waveMap: {[key: number]: number} = {};

    for (let report of reports) {
        if (report.streamer == 0){
            for (let reading of report.readings) {
                if (reading.stream == 0x5020){
                    waveMap[reading.value] = reading.id;
                }
            }
        }
    } 
    return waveMap;
}
