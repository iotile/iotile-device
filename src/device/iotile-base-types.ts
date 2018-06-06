export abstract class AbstractIOTileAdapter {
    public abstract async rpc(address: number, rpcID: number, payload: ArrayBuffer, timeout?: number): Promise<ArrayBuffer>;
    public abstract async errorHandlingRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (number | string)[], timeout?: number): Promise<any>;
    public abstract async typedRPC(address: number, rpcID: number, callFormat: string, respFormat: string, args: (string | number)[], timeout?: number) : Promise<any>;
}