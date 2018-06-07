import { SignedListReport } from "./iotile-reports";
/**
 * A class that can merge two signed list reports into one.  This
 * is used to create a combined report from a separate user and system
 * report before uploading to iotile.cloud.  This class attempts to
 * check as best it can that the reports are valid and both a user
 * and system report before merging them.
 */
export declare class SignedListReportMerger {
    mergeReports(user: SignedListReport, system: SignedListReport): SignedListReport;
    private checkReportsForMerging(user, system);
    private insertMergedHeader(merged, user, system);
    /**
     * Merge two reports together, keeping all of their readings in order.
     */
    private mergeReadings(merged, user, system);
    private pickNextReading(user, userI, system, systemI);
    private insertReading(merged, offset, timestamp, stream, value, readingID);
    private insertMergedFooter(merged, lowest, highest);
}
