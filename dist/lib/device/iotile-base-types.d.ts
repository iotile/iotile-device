export declare abstract class AbstractIOTileAdapter {
    abstract rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer>;
    abstract errorHandlingRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (number | string)[], timeout?: number): Promise<any>;
    abstract typedRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (string | number)[], timeout?: number): Promise<any>;
}
