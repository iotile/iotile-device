export declare function createIndividualReport(uuid: any, stream: any, value: any, sentTime: any, rawTime: any): any;
export declare function expectIndividual(inReport: any, uuid: any, stream: any, value: any, sentTime: any, rawTime: any): void;
export declare function expectSequential(inReport: any, uuid: any, stream: string, count: any, streamer: any): void;
export declare function feedInPieces(report: ArrayBuffer, handler: (ArrayBuffer) => void, size: number): void;
export declare function createReading(stream: any, timestamp: any, value: any, id: any): {
    'stream': any;
    'timestamp': any;
    'value': any;
    'id': any;
};
export declare function createSequentialReport(uuid: number, stream: string, count: number, streamer: number, start?: number): ArrayBuffer;
export declare function createHashListReport(uuid: any, reportID: any, streamer: any, sentTime: any, readings: any, selector?: number): ArrayBuffer;
