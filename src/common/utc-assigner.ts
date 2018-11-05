import { SignedListReport } from "./iotile-reports";

export interface UTCAssignerOptions {
    allowExtrapolation: boolean,
    allowImprecise: boolean
}

export type AnchorValueProcessor = (streamID: number, readingID: number, uptime: number, value: number) => number;

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
    // lasrReadingSeen?
    // lastKnownTime?
    // lastTimeBreak?
    // lastAnchorPoint?

    constructor(options: UTCAssignerOptions) {
        this.extrapolation = options.allowExtrapolation;
        this.imprecise = options.allowImprecise;
    }

    /**
     * Assign a UTC date to a reading based on all previously added anchor and break
     * points.  If a UTC time cannot be assigned because there is insufficient data
     * or becaues one of the options passed to the constructor does not allow it,
     * throw an ArgumentError. 
     */
    public assignUTCTimestamp(readingID: number, readingTime: number): Date {

    }

    /*
     * Explicitly inform the UTCAssigner that we know a specific 
     * correspondence between a local time (the device's uptime) and
     * utc time.  It is these anchor points that are used as ground
     * truth values to assign utc times to all other points.
     */
    public addAnchorPoint(readingID: number, localTime: number, utc: Date) {

    }

    /**
     * Inform the UTCAssigner that local times before and after the given
     * readingID are not comparable.  This is usually due to a device reset
     * that causes its local time to be cleared by to 0, however it could
     * also be because the device had its clock explicitly reset.
     */
    public addTimeBreak(readingID: number) {

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

    }

    /**
     * Automatically call addAnchorPoint for all values found in
     * a stream previously passed to markAnchorStream.
     */
    public addAnchorsFromReport(report: SignedListReport) {

    }

    /**
     * Automatically call addTimeBreak for all reset readings found 
     * in this report.  Reset readings are those with stream id: 0x5C00.
     */
    public addBreaksFromReport(report: SignedListReport) {

    }
}