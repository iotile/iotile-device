import {SignedListReport, SignedReportSelectors, SignatureStatus, RawReading, COMBINED_REPORT_STREAMER} from "./iotile-reports";
import {ArgumentError, packArrayBuffer, copyArrayBuffer, SHA256Calculator} from "@iotile/iotile-common";

interface ReadingList {
    readings: RawReading[];
    lowestID: number;
    highestID: number;
}

/**
 * A class that can merge two signed list reports into one.  This
 * is used to create a combined report from a separate user and system
 * report before uploading to iotile.cloud.  This class attempts to
 * check as best it can that the reports are valid and both a user
 * and system report before merging them.
 */
export class SignedListReportMerger {
    public mergeReports(user: SignedListReport, system: SignedListReport): SignedListReport {
        this.checkReportsForMerging(user, system);

        let mergedLength = 20 + (16 * (user.readings.length + system.readings.length)) + 24;
        let merged = new ArrayBuffer(mergedLength);

        this.insertMergedHeader(merged, user, system);
        let readings = this.mergeReadings(merged, user, system);
        
        this.insertMergedFooter(merged, readings.lowestID, readings.highestID);
        
        return new SignedListReport(system.header.uuid, COMBINED_REPORT_STREAMER, merged, system.receivedTime);
    }

    private checkReportsForMerging(user: SignedListReport, system: SignedListReport) {
        let userHeader = user.header;
        let systemHeader = system.header;

        if (user.validity != SignatureStatus.Valid || system.validity != SignatureStatus.Valid) {
            throw new ArgumentError("You can only merge reports that have valid signatures");
        }

        if (userHeader.uuid != systemHeader.uuid) {
            throw new ArgumentError("Reports did not come from the same device");
        }

        if (userHeader.selector != SignedReportSelectors.UserOutputs) {
            throw new ArgumentError("User report did not select user readings");
        }

        if (systemHeader.selector != SignedReportSelectors.SystemOutputs) {
            throw new ArgumentError("System report did not select system readings");
        }

        if (systemHeader.sentTime < userHeader.sentTime) {
            throw new ArgumentError("System report was sent before user report");
        }

        if (systemHeader.reportID < userHeader.reportID) {
            throw new ArgumentError("System report ID was lower than user report");
        }
    }

    private insertMergedHeader(merged: ArrayBuffer, user: SignedListReport, system: SignedListReport) {
        let userHeader = user.header;
        let systemHeader = system.header;
        
        /**
         * Generating this header is a bit of delecate operation since we want to ensure the same
         * invariants that are guaranteed by the devices themselves when they generate reports.
         * 
         * 1. The report ID is higher than all readings IDs (so use the system id) 
         * 2. The report sent time is higher than all of the reading sent times
         * 3. The selector accurately describes the contents of the report
         * 4. The streamer must be a special virtual streamer number (255 in this case) that we handle when
         *    we acknowledge back to the device and ack both system and user streamers.
         */
        let header = packArrayBuffer('BBHLLLBBH', 1, merged.byteLength & 0xFF, merged.byteLength >> 8, userHeader.uuid, systemHeader.reportID, systemHeader.sentTime, 0, COMBINED_REPORT_STREAMER, SignedReportSelectors.CombinedOutputs);
        copyArrayBuffer(merged, header, 0, 0, header.byteLength);
    }

    /**
     * Merge two reports together, keeping all of their readings in order.
     */
    private mergeReadings(merged: ArrayBuffer, user: SignedListReport, system: SignedListReport): ReadingList {
        let userI: number = 0;
        let systemI: number = 0;
        let totalReadings = user.readings.length + system.readings.length;
        let insertI: number = 0;
        let lowest: number = 0xFFFFFFFF;
        let highest: number = 0;
        let readings: RawReading[] = [];

        let now = new Date();
        let onTime = new Date(now.valueOf() - (system.header.sentTime*1000));

        while (insertI < totalReadings) {
            let pickSystem = this.pickNextReading(user, userI, system, systemI);
            let reading: RawReading;

            if (pickSystem) {
                reading = system.readings[systemI++];
            } else {
                reading = user.readings[userI++];
            }

            if (reading.id != 0 && reading.id < lowest) {
                lowest = reading.id;
            }

            if (reading.id !=0 && reading.id > highest) {
                highest = reading.id;
            }

            readings.push(new RawReading(reading.stream, reading.value, reading.timestamp, onTime, reading.id));
            this.insertReading(merged, (20 + 16*insertI), reading.timestamp, reading.stream, reading.value, reading.id);
            insertI += 1;
        }

        return {
            lowestID: lowest,
            highestID: highest,
            readings: readings
        };
    }

    private pickNextReading(user: SignedListReport, userI: number, system: SignedListReport, systemI: number): boolean {
        if (userI == user.readings.length && systemI == system.readings.length) {
            throw new ArgumentError("Both reports have been exhausted, no more readings to pick");
        }

        if (userI == user.readings.length) {
            return true;
        } else if (systemI == system.readings.length) {
            return false;
        }

        let userReading = user.readings[userI];
        let systemReading = system.readings[systemI];

        if (userReading.id < systemReading.id) {
            return false;
        } else {
            return true;
        }
    }

    private insertReading(merged: ArrayBuffer, offset: number, timestamp: number, stream: number, value: number, readingID: number) {
        let reading = packArrayBuffer('HHLLL', stream, 0, readingID, timestamp, value);
        copyArrayBuffer(merged, reading, 0, offset, reading.byteLength);
    }

    private insertMergedFooter(merged: ArrayBuffer, lowest: number, highest: number) {
        let footerStart = merged.byteLength - 24;
        let idRange = packArrayBuffer("LL", lowest, highest);

        copyArrayBuffer(merged, idRange, 0, footerStart, idRange.byteLength);

        //Now insert a proper checksum for the merged report
        let calc = new SHA256Calculator();
        let signedData = merged.slice(0, merged.byteLength - 16);
        let signature = calc.calculateSignature(signedData);
        
        copyArrayBuffer(merged, signature, 0, merged.byteLength - 16, 16);
    }
}