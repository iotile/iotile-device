import { SignedListReport, RawReading } from "./iotile-reports";
import { ArgumentError } from "@iotile/iotile-common";
import { Category } from "typescript-logging";
import { catUTCAssigner } from "../config";

let SECONDS_AT_2000 = Date.UTC(2000, 0, 1).valueOf() / 1000;

export interface UTCAssignerOptions {
    allowImprecise: boolean
}

export interface AnchorPoint {
    readingId: number,
    uptime: number | null,
    utcTime: Date | null,
    isBreak: boolean
}

/**
 * A conversion function that takes the value of a reading in a given stream and turns it into a utc date.
 */
export type AnchorValueProcessor = (streamID: number, readingID: number, uptime: number, value: number) => Date;


/**
 * This class assigns UTC dates to readings based on their sequential reading ID and local time.
 * 
 * Internally it works based on the following principle.  It knows that the sequential reading ID
 * is monotonically increasing but the local time can reset to 0 every time there is a timeBreak
 * in the data (e.g. the device reboots).  So it constructs a series of TimeSegments which are
 * ranges of reading IDs where there are not breaks.  This means that each break ends the previous
 * segment and starts the next segment.  
 * 
 * Inside each segment there needs to be at least one anchor point where the UTC time and local time
 * are both known.  Once there is an anchor point in a given segment, all other readings in that
 * segment can be assigned UTC times by looking at their local time offset from the anchor point.
 * 
 * If allowImprecise is passed, this class should still try to assign a UTC time to a reading even
 * if it occurs in a segment with no anchor points by finding the first subsequent segment that does
 * have an anchor point and back-calculating from there assuming that all breaks between segments 
 * were infinitely short.
 */
export class UTCAssigner {
    private imprecise: boolean;
    private anchorPoints: AnchorPoint[];
    private addedIDSet: {[key: number]: boolean};
    private anchorPointsSorted: boolean;

    private logger: Category;

    private anchorStreams: {[key: number]: AnchorValueProcessor};
    private breakStreams: {[key: number]: boolean};

    constructor(options: UTCAssignerOptions) {
        this.imprecise = options.allowImprecise;
        this.logger = catUTCAssigner;

        this.anchorPoints = [];
        this.addedIDSet = {};
        this.anchorPointsSorted = false;

        this.anchorStreams = {};
        this.breakStreams = {};

        this.initBreakStreams();
    }

    private initBreakStreams() {
        this.breakStreams[0x5c00] = true;
    }

    /**
     * Assign a UTC date to a reading based on all previously added anchor and break
     * points.  If a UTC time cannot be assigned because there is insufficient data
     * or because one of the options passed to the constructor does not allow it,
     * throw an ArgumentError. 
     */
    public assignUTCTimestamp(readingID: number, uptime: number | null): Date {        
        /**
         * uptimes embedded in the accelerometer tile are stored as placeholders with the
         * fixed value 0xFFFFFFFF, which should be interpreted as "I don't know the uptime"
         */
        if (uptime === 0xFFFFFFFF) uptime = null;

        if (this.anchorPoints.length === 0) throw new ArgumentError("Cannot assign timestamp because there are no anchor points");
        if (readingID > this.anchorPoints[this.anchorPoints.length - 1].readingId) throw new ArgumentError("Extrapolation of UTC times is not yet supported");

        let i = this.bisectLeftAnchors(readingID);
        let last: AnchorPoint = copyAnchor(this.anchorPoints[i]);

        if (uptime != null) last.uptime = uptime;

        let exact = true;
        let accumDelta: number = 0;

        if (last.readingId === readingID && last.utcTime != null) return last.utcTime;
        
        i += 1;
        while (i < this.anchorPoints.length) {
            let curr = this.anchorPoints[i];

            if (last.uptime == null || curr.uptime == null) {
                exact = false;
            } else if (curr.isBreak || curr.uptime < last.uptime) {
                exact = false;
            } else {
                accumDelta += curr.uptime - last.uptime;
            }

            last = curr;
            if (curr.utcTime != null) break;

            i += 1;
        }

        if (last.utcTime == null) throw new ArgumentError("There were no points with a UTC reference after the designed reading id");
        if (this.imprecise === false && !exact) throw new ArgumentError("Could not assign precise UTC Timestamp");

        return new Date(last.utcTime.valueOf() - (accumDelta * 1000));
    }

    private bisectLeftAnchors(readingID: number): number {
        let low = 0;
        let high = this.anchorPoints.length;

        this.ensureAnchorPointsSorted();

        while (low < high) {
            let mid = low + high >>> 1;
            if (this.anchorPoints[mid].readingId < readingID) {
                low = mid + 1;
            } else {
                high = mid;
            }    
        }

        return low;
    }

    private ensureAnchorPointsSorted() {
        if (this.anchorPointsSorted) return;

        this.anchorPoints.sort((a, b) => {
            return a.readingId - b.readingId;
        });

        this.anchorPointsSorted = true;
    }

    /*
     * Explicitly inform the UTCAssigner that we know a specific 
     * correspondence between a local time (the device's uptime) and
     * utc time.  It is these anchor points that are used as ground
     * truth values to assign utc times to all other points.
     */
    public addAnchorPoint(readingID: number, uptime: number | null, utc: Date | null, isBreak: boolean = false) {
        if (readingID === 0) return;
        if (uptime == null && utc == null) return;
        if (readingID in this.addedIDSet) return;

        /**
         * If the uptime itself is specified as a UTC time rather than an uptime,
         * convert it to a UTC time and null out the uptime since we don't know
         * what the uptime was (since the timestamp was in UTC rather than uptime).
         * 
         * If an explicit UTC time was also passed, ignore this anchor point and return
         * since we would know which utc to trust, the uptime interpreted as UTC or the
         * one that was explicitly passed.
         */
        if (uptime != null && uptime & ( 1 << 31)) {
            if (utc != null) return;

            //Mask out high bit to get the actual seconds since 2000
            uptime &= (1 << 31) - 1;
            utc = rtcTimestampToDate(uptime);
            uptime = null;
        }


        let anchorPoint: AnchorPoint = {
            readingId: readingID,
            uptime: uptime,
            utcTime: utc,
            isBreak: isBreak
        }

        this.anchorPoints.push(anchorPoint);
        this.addedIDSet[readingID] = true;
        this.anchorPointsSorted = false;
    }

    public addReading(reading: RawReading) {
        let isBreak = false;
        let utc: Date | null = null;

        if (reading.stream in this.breakStreams) isBreak = true;

        if (reading.stream in this.anchorStreams) {
            utc = this.anchorStreams[reading.stream](reading.stream, reading.id, reading.timestamp, reading.value);
        }

        this.addAnchorPoint(reading.id, reading.timestamp, utc, isBreak);
    }

    /**
     * Inform the UTCAssigner that whenever it sees a value in the given
     * stream, it can infer that its value is explicitly a UTC timestamp.
     * This allows the UTCAssigner to automatically call addAnchorPoint
     * when it processes a streamer report that contains streams that could
     * act as anchors.
     * 
     * If the value of the stream cannot be directly interpreted as the number
     * of seconds since the year 2000, you can pass an optional callable that
     * will be called to determine the correct UTC timestamp.
     * 
     * You can pass a literal string "rtc" or "epoch" for valueProcessor if you want
     * the value to be treated as seconds since 1/1/2000 or seconds since 1/1/1970 respectively.
     * 
     * Alternatively, you can pass a function that returns a Date.
     */
    public markAnchorStream(streamID: number, valueProcessor?: AnchorValueProcessor | "rtc" | "epoch") {
        if (valueProcessor == null || valueProcessor === "rtc") {
            valueProcessor = function(_streamID: number, _readingID: number, _uptime: number, value: number) {
                // assume value can be interpreted as-is as seconds since 2000
                return rtcTimestampToDate(value);
            }
        } else if (valueProcessor === "epoch") {
            valueProcessor = function(_streamID: number, _readingID: number, _uptime: number, value: number) {
                // assume value can be interpreted as-is as seconds since 2000
                return new Date(value * 1000);
            }
        }

        this.anchorStreams[streamID] = valueProcessor;

    }

    /**
     * Automatically call addAnchorPoint for all values found in
     * a stream previously passed to markAnchorStream.
     */
    public addAnchorsFromReport(report: SignedListReport) {
        for (let reading of report.readings) {
            this.addReading(reading);
        }

        this.addAnchorPoint(report.header.reportID, report.header.sentTime, report.receivedTime);
    }
}

function rtcTimestampToDate(seconds: number): Date {
    return new Date((seconds + SECONDS_AT_2000) * 1000);
}

function copyAnchor(src: AnchorPoint): AnchorPoint {
    return {
        readingId: src.readingId,
        uptime: src.uptime,
        utcTime: src.utcTime,
        isBreak: src.isBreak
    }
}