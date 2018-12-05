import { SignedListReport, RawReading } from "./iotile-reports";
import { ArgumentError, InvalidOperationError } from "iotile-common";

let SECONDS_AT_2000 = Date.UTC(2000, 0, 1).valueOf() / 1000;

export interface UTCAssignerOptions {
    allowExtrapolation: boolean,
    allowImprecise: boolean
}

export interface AnchorPoint {
    readingId: number,
    localTime: number | undefined,
    utcTime: Date
}

export type AnchorValueProcessor = (streamID: number, readingID: number, uptime: number, value: number) => number;


export class TimeSegment {
    public firstReadingId: number;
    public lastReadingId: number;
    public anchorPoint: AnchorPoint | undefined;
    public placeholder: boolean;

    constructor(firstReadingId: number, lastReadingId: number, placeholder: boolean = false){
        this.firstReadingId = firstReadingId;
        this.lastReadingId = lastReadingId;
        this.placeholder = placeholder;
    }
}


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
 * If allowExtrapolation is passed, this class should assume that the final TimeSegment extends to
 * infinity with no additional resets.
 * 
 * If allowImprecise is passed, this class should still try to assign a UTC time to a reading even
 * if it occurs in a segment with no anchor points by finding the first subsequent segment that does
 * have an anchor point and back-calculating from there assuming that all breaks between segments 
 * were infinitely short.
 */
export class UTCAssigner {
    private extrapolation: boolean;
    private imprecise: boolean;
    public timeSegments: TimeSegment[] = [];
    private segmentStartId: number = 0;
    private lastId: number = 0;
    private anchorStreams: {[key: number]: AnchorValueProcessor} = {};

    constructor(options: UTCAssignerOptions) {
        this.extrapolation = options.allowExtrapolation;
        this.imprecise = options.allowImprecise;
        this.timeSegments.push(new TimeSegment(this.segmentStartId, Infinity, true));
    }

    /**
     * Assign a UTC date to a reading based on all previously added anchor and break
     * points.  If a UTC time cannot be assigned because there is insufficient data
     * or because one of the options passed to the constructor does not allow it,
     * throw an ArgumentError. 
     */
    public assignUTCTimestamp(readingID: number, readingTime: number): Date {
        this.closeSegments();
        let segment = this.getTimeSegment(readingID);

        if (segment.anchorPoint){
            return this.assignUTCFromAnchor(readingTime, segment.anchorPoint);
        } else if (this.imprecise) {
            let relativeTime = readingTime;
            while (!segment.anchorPoint){
                relativeTime -= (readingID - segment.lastReadingId);
                segment = this.getTimeSegment(segment.firstReadingId - 1);
            }
            return this.assignUTCFromAnchor(relativeTime, segment.anchorPoint);
        } else {
            throw new ArgumentError("Could not assign precise UTC Timestamp");
        }
    }

    private getTimeSegment(readingID: number): TimeSegment {
        let timeSegment: TimeSegment = this.timeSegments[this.timeSegments.length -1];
        for (let segment of this.timeSegments){
            if (readingID >= segment.firstReadingId && readingID <= segment.lastReadingId) {
                timeSegment = segment;
            }
        }
        return timeSegment;
    }

    private assignUTCFromAnchor(readingTime: number, anchor: AnchorPoint): Date {
        let anchorOffset: number;
        if (anchor.localTime){
            anchorOffset = readingTime - anchor.localTime;
        } else {
            let nextAnchor;
            let nextSegment;
            let increment = anchor.readingId;
            while (!nextAnchor || !(nextAnchor.localTime)){
                nextSegment = this.getTimeSegment(increment);
                nextAnchor = nextSegment.anchorPoint;
                if (nextSegment.lastReadingId === Infinity && (!(nextAnchor) || !(nextAnchor.localTime))){
                    throw new ArgumentError('Cannot assign UTC from anchorpoint: no local time reference');
                } else {
                    increment = nextSegment.lastReadingId + 1;
                }
            }
            anchor.localTime = nextAnchor.localTime - (Math.ceil((nextAnchor.utcTime.valueOf() - anchor.utcTime.valueOf()) / 1000));
            anchorOffset = readingTime - anchor.localTime;
        }
        
        let utcTime = new Date(anchor.utcTime.valueOf() + (anchorOffset * 1000));
        return utcTime;
    }

    /*
     * Explicitly inform the UTCAssigner that we know a specific 
     * correspondence between a local time (the device's uptime) and
     * utc time.  It is these anchor points that are used as ground
     * truth values to assign utc times to all other points.
     */
    public addAnchorPoint(readingID: number, localTime: number | undefined, utc: Date) {
        if (localTime && !!(localTime & (1 << 31)) === true){
            localTime = undefined;
        }

        let anchorPoint: AnchorPoint = {
            readingId: readingID,
            localTime: localTime,
            utcTime: utc
        }
        let segment = this.getTimeSegment(readingID);
        segment.anchorPoint = anchorPoint;
    }

    /**
     * Inform the UTCAssigner that local times before and after the given
     * readingID are not comparable.  This is usually due to a device reset
     * that causes its local time to be cleared by to 0, however it could
     * also be because the device had its clock explicitly reset.
     */
    public addTimeBreak(readingID: number) {
        let segment = new TimeSegment(this.segmentStartId, readingID - 1);
        
        let last = this.timeSegments.pop();
        // keep anchorPoints in the appropriate segment
        if (last && last.anchorPoint && (last.anchorPoint.readingId < readingID) && (last.anchorPoint.readingId > this.segmentStartId)){
            segment.anchorPoint = last.anchorPoint;
            last.anchorPoint = undefined;
        }
        this.timeSegments.push(segment);
        this.segmentStartId = readingID;

        if (last && last.placeholder){
            last.firstReadingId = readingID;
            last.lastReadingId = Infinity;
            last.anchorPoint = last.anchorPoint;
            last.placeholder = true;
            this.timeSegments.push(last);
        }          
    }

    // If we're not extrapolating, replace the [placeholder] final time segment last id (infinity) with known last reading id
    private closeSegments(){
        if (!this.extrapolation){
            let finalSegment = this.timeSegments.pop();
            let newFinalSegment = new TimeSegment(this.segmentStartId, this.lastId);
            if (finalSegment && finalSegment.anchorPoint){
                newFinalSegment.anchorPoint = finalSegment.anchorPoint;
            }  
            this.timeSegments.push(newFinalSegment);
        }
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
     */
    public markAnchorStream(streamID: number, valueProcessor?: AnchorValueProcessor) {
        if (!valueProcessor){
            valueProcessor = function(streamID: number, readingID: number, uptime: number, value: number) {
                // assume value can be interpreted as-is as seconds since 2000
                return value;
            }
        }
        this.anchorStreams[streamID] = valueProcessor;

    }

    /**
     * Automatically call addAnchorPoint for all values found in
     * a stream previously passed to markAnchorStream.
     */
    public addAnchorsFromReport(report: SignedListReport) {
        for (let reading of report.readings){
            if (reading.stream in Object.keys(this.anchorStreams)){
                let utc = this.anchorStreams[reading.stream](reading.stream, reading.id, reading.timestamp, reading.value)
                this.addAnchorPoint(reading.id, reading.timestamp, new Date((utc + SECONDS_AT_2000) * 1000));
            }
        }
        this.addAnchorPoint(report.header.reportID, report.header.sentTime, report.receivedTime);
    }

    /**
     * Automatically call addTimeBreak for all reset readings found 
     * in this report.  Reset readings are those with stream id: 0x5C00.
     */
    public addBreaksFromReport(report: SignedListReport) {
        let lastReadingTime = 0;
        for (let reading of report.readings){
            if (reading.stream == 0x5C00){
                this.addTimeBreak(reading.id);
            }
            // check for time dropping to 0
            if (reading.timestamp < lastReadingTime){
                this.addTimeBreak(reading.id);
                lastReadingTime = 0;
            } else {
                lastReadingTime = reading.timestamp;
            }
            if (reading.id > this.lastId){
                this.lastId = reading.id;
            }
        }
    }
}