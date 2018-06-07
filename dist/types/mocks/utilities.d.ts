export declare function buildIndividualReport(uuid: number, streamID: number, value: number): ArrayBuffer;
export interface Reading {
    stream: number;
    id: number;
    timestamp: number;
    value: number;
}
export declare function createHashListReport(uuid: number, reportID: number, streamer: number, sentTime: number, readings: Reading[]): ArrayBuffer | SharedArrayBuffer;
