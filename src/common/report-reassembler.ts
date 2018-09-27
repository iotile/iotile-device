/**
 * Helper class that is able to rearrange the bluetooth notitications inside a SignedListReport.
 * 
 * This class is necessary because some bluetooth stacks, notably Android, don't push notifications
 * in order to applications when they come in very near to each other in time.  This causes 
 * reports that span multiple notification packets (20 bytes each) to be corrupted since the
 * chunks of the report are reassembled out of order.  
 * 
 * ReportReassembler uses heuristics and other knowledge of the internal structure and invariants
 * of a SignedListReport to detect when out-of-order packets are received and place them back
 * into the correct order.
 * 
 * It works by recognizing that the individual readings in a report are 16 bytes long
 * whereas the reports are chunked into 20-byte packets.  So every packet contains at
 * least part of 2 readings including the majority or all of 1 reading.  By looking
 * at if readings that cross packet boundaries make sense we can infer what order the
 * packets should have been received in.  There are 4 main criteria we use to determine
 * if a reading makes sense:
 * 
 * 1. The stream id must be selected by the report selector.  Each report has specific
 *    criteria for what readings are included so every stream id must match the selector
 *    included in the report header.
 * 2. The reading id must be monotonically increasing.
 * 3. The reading timestamp can only decrease if there has been a reboot (included as
 *    a reboot stream event).
 * 4. There is a 16-bit reserved field in each reading for alignment purposes that must be
 *    0.
 * 
 * If there are multiple potential chunks that match all of those 4 criteria, then the one
 * with the lowest reading id is chosen.  In practice we have found that this reliably fixes
 * out of order packets with near 100% success.
 */

import { SignedReportHeader, StreamSelector, SignedListReport } from "./iotile-reports";
import { SHA256Calculator, unpackArrayBuffer, copyArrayBuffer, ArgumentError, InvalidOperationError } from "iotile-common";

export interface DecodedChunk {
    streams: (number | null)[],
    reserved: (number | null)[],
    ids: (number | null)[],
    timestamps: (number | null)[],
    values: (number | null)[],
    offset: number,
    index: number
}

export interface Transposition {
    src: number,
    dst: number
}


export class ReportReassembler {
    private currentReport: ArrayBuffer;
    private header: SignedReportHeader;
    private originalSignature: ArrayBuffer;
    private sigCalculator: SHA256Calculator;

    private errors: Transposition[];
    
    constructor(report: ArrayBuffer) {
        this.currentReport = report;
        this.header = SignedListReport.extractHeader(report);
        this.sigCalculator = new SHA256Calculator();
        this.errors = [];

        this.originalSignature = this.currentReport.slice(this.currentReport.byteLength - 16);
    }

    public isValid(): boolean {
        return this.checkSignature();
    }

    public getTranspositions(): Transposition[] {
        return this.errors;
    }

    public getFixedReport(): ArrayBuffer {
        if (this.checkSignature()){
            return this.currentReport;
        } else {
            throw new InvalidOperationError("Report has invalid signature");
        }
    }

    public fixOutOfOrderChunks(): boolean {
        let startI = 1;
        let totalChunks = Math.floor(this.currentReport.byteLength / 20);
        let endI = totalChunks - 1;
        let offset = 0;

        let lastStream: number | null = null;
        let lastTS: number | null = null;
        let lastID: number | null = null;

        while (startI < endI) {
            //console.log(`Searching for chunk ${startI}: ` + this.dumpChunk(startI));
            let candidates = this.findCandidates(startI, totalChunks, offset, lastStream, lastTS, lastID);
            let bestCandidate = null;

            if (candidates.length === 1)
                bestCandidate = candidates[0];
            else if (candidates.length > 1) {
                this.sortCandidates(candidates);
                bestCandidate = candidates[0];
            }

            // If we could not find a candidate for this chunk of the report, we cannot fix it.
            if (bestCandidate == null)
                return false;

            if (bestCandidate.index !== startI) {
                //console.log(`Moving chunk ${bestCandidate.index} to ${startI}`);
                this.errors.push({src: bestCandidate.index, dst: startI});
                this.moveChunk(startI, bestCandidate.index);
            }

            [lastStream, lastID, lastTS] = this.extractLatest(bestCandidate);

            offset = (offset + 20) % 16;
            startI += 1;
        }

        //Now that we have finished fixing everything, we should have a matching 
        return this.isValid();
    }

    private sortCandidates(candidates: DecodedChunk[]) {
        /*
         * Return the first ID that is contained in this chunk and not filled
         * in by the lastID for sequential comparison.  We know what the correct
         * ID is by looking at the offset and comparing with what is returned
         * by decodeChunk
         */
        function extractID(candidate: DecodedChunk): number {
            if (candidate.offset === 4 || candidate.offset === 0)
                return <number>candidate.ids[0];
            
            return <number>candidate.ids[1]; 
        }

        function compareIDs(a: DecodedChunk, b: DecodedChunk) {
            return extractID(a) - extractID(b);
        }

        candidates.sort(compareIDs);
    }

    private moveChunk(destIndex: number, srcIndex: number) {
        let tmp = new Uint8Array(20);

        if (destIndex >= srcIndex)
            throw new ArgumentError("Attempting to move chunk later rather than earlier in report.");

        for(let curr=srcIndex; curr > destIndex; --curr) {
            let swapDst = new Uint8Array(this.currentReport, (curr - 1)*20, 20);
            let swapSrc = new Uint8Array(this.currentReport, (curr)*20, 20);
            tmp.set(swapDst);

            swapDst.set(swapSrc);
            swapSrc.set(tmp);
        }
    }

    private extractLatest(chunk: DecodedChunk): [number , number, number] {
        let stream: number | null = chunk.streams[0];
        let id: number | null = chunk.ids[0];
        let ts: number | null = chunk.timestamps[0];

        if (chunk.streams[1] !== null)
            stream = chunk.streams[1];
        
        if (chunk.ids[1] !== null)
            id = chunk.ids[1];
        
        if (chunk.timestamps[1] !== null)
            ts = chunk.timestamps[1];

        return [<number>stream, <number>id, <number>ts];
    }

    private fillChunk(chunk: DecodedChunk, lastStream: number | null, lastTS: number | null, lastID: number | null): void {
        if (chunk.streams[0] == null)
            chunk.streams[0] = lastStream;
        
        if (chunk.reserved[0] == null)
            chunk.reserved[0] = 0;
        
        if (chunk.timestamps[0] == null)
            chunk.timestamps[0] = lastTS;
        
        if (chunk.ids[0] == null)
            chunk.ids[0] = lastID;
    }

    private decodeChunk(startI: number, offset: number): DecodedChunk {
        let chunkData = this.currentReport.slice(startI*20, startI*20 + 20);

        let [stream1, stream2]: (number | null)[] = [null, null];
        let [id1, id2]: (number | null)[] = [null, null];
        let [res1, res2]: (number | null)[] = [null, null];
        let [ts1, ts2]: (number | null)[] = [null, null];
        let [val1, val2]: (number | null)[] = [null, null];

        if (offset === 0) {
            [stream1, res1, id1, ts1, val1, stream2, res2] = <any>unpackArrayBuffer("HHLLLHH", chunkData);
        } else if (offset === 4) {
            [id1, ts1, val1, stream2, res2, id2] = <any>unpackArrayBuffer("LLLHHL", chunkData);
        } else if (offset === 8) {
            [ts1, val1, stream2, res2, id2, ts2] = <any>unpackArrayBuffer("LLHHLL", chunkData);
        } else { // (offset == 12)
            [val1, stream2, res2, id2, ts2, val2] = <any>unpackArrayBuffer("LHHLLL", chunkData);
        }

        return {streams: [stream1, stream2], reserved: [res1, res2], ids: [id1, id2], timestamps: [ts1, ts2], values: [val1, val2], index: startI, offset: offset};
    }

    private dumpChunk(index: number): string {
        let data = new Uint8Array(this.currentReport, index*20, 20);

        return Array.prototype.map.call(data, (x:number) => ('00' + x.toString(16)).slice(-2)).join(' ');
    }

    private maskChunk(chunk: DecodedChunk) {
        if (chunk.offset === 12)
            return chunk;
        
        chunk.streams[1] = null;
        chunk.ids[1] = null;
        chunk.reserved[1] = null;
        chunk.timestamps[1] = null;
        chunk.values[1] = null;
    }

    private validateChunk(chunk: DecodedChunk, lastStream: number | null, lastTS: number | null, lastID: number | null): boolean {
        //console.log("potential chunk: " + JSON.stringify(chunk));

        for (let stream of chunk.streams) {
            if (stream !== null && !this.header.decodedSelector.matches(stream)) {
                //console.log(" - stream not selected");
                return false;
            }
        }

        for (let res of chunk.reserved) {
            if (res !== null && res !== 0) {
                //console.log(" - reserved not 0");
                return false;
            }
        }

        if (chunk.ids[1] !== null && <any>chunk.ids[1] <= <any>chunk.ids[0]) {
            //console.log(" - ids not monotonic");
            return false;
        }

        // Timestamp can only decrease if there has been a reset
        if (chunk.timestamps[1] !== null && <any>chunk.timestamps[1] < <any>chunk.timestamps[0] && chunk.streams[1] !== StreamSelector.REBOOT_STREAM) {
            //console.log(" - timestamps not monotonic (except reboot)");
            return false;
        }

        //For chunks that contain an ID in the first slot (so it's not filled in from lastID)
        //make sure it is monotonic
        if ((chunk.offset === 0 || chunk.offset === 4) && <any>chunk.ids[0] <= <any>lastID) {
            //console.log(" - reading ID not greater than lastID");
            return false;
        }

        //console.log(" - VALID!");
        return true;
    }

    private findCandidates(startI: number, totalChunks: number, offset: number, lastStream: number | null, lastTS: number | null, lastID: number | null): DecodedChunk[] {
        let candidates: DecodedChunk[] = [];

        for (let i = 0; i < 4; ++i) {
            if (startI + i >= totalChunks)
                continue;

            let chunk = this.decodeChunk(startI + i, offset);

            if (startI === totalChunks - 2)
                this.maskChunk(chunk);
            
            this.fillChunk(chunk, lastStream, lastTS, lastID);

            if (this.validateChunk(chunk, lastStream, lastTS, lastID))
                candidates.push(chunk);
        }

        return candidates;
    }

    private calculateSignature(): ArrayBuffer {
        let signedData = this.currentReport.slice(0, this.currentReport.byteLength - 16);
        return this.sigCalculator.calculateSignature(signedData);
    }

    private checkSignature(prefix?: number): boolean {
        if (prefix == null)
            prefix = 16;

        let actual = this.calculateSignature();

        return this.sigCalculator.compareSignatures(this.originalSignature.slice(0, prefix), actual);
    }
}