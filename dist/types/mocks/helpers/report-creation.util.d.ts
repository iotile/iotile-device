export declare function createIndividualReport(uuid: number, stream: string, value: number, sentTime: any, rawTime: any): any;
export declare function expectIndividual(inReport: any, uuid: number, stream: string, value: number, sentTime: any, rawTime: any): void;
export declare function expectSequential(inReport: any, uuid: number, stream: string, count: number, streamer: number): void;
export declare function feedInPieces(report: ArrayBuffer, handler: (ArrayBuffer: ArrayBuffer) => void, size: number): void;
export declare function createReading(stream: string, timestamp: any, value: number, id: any): {
    'stream': any;
    'timestamp': any;
    'value': number;
    'id': any;
};
export declare function createSequentialReport(uuid: number, stream: string, count: number, streamer: number, start?: number): ArrayBuffer;
export declare function createHashListReport(uuid: number, reportID: number, streamer: any, sentTime: any, readings: any, selector?: number): ArrayBuffer;
