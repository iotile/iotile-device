import { BasicControllerTile } from "./tiles/basic-controller";
export declare type RPCResponse = Promise<(number | string)[]> | (number | string)[];
export interface VersionInfo {
    osTag: number;
    osVersion: string;
    appTag: number;
    appVersion: string;
}
export interface RPCDescriptor {
    argFormat: string;
    respFormat: string;
    thisObject: object;
    handler: (...args: any[]) => RPCResponse;
}
/**
 * Decorator factory that marks a function as a callable RPC with the given metadata.
 *
 * @param address The address at which the RPC should appear
 * @param rpcID The 16-bit ID of the RPC
 * @param argFormat A format string compatible with unpackArrayBuffer to unpack arguments
 * @param respFormat A format string compatbile with packArrayBuffer to pack the return value
 */
export declare function rpc(address: number, rpcID: number, argFormat: string, respFormat: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
/**
 * Decorator factory that marks a function as a callable RPC with the given metadata.
 *
 * This function does not explicitly encode the RPC's address so it is suitable to use
 * within a VirtualTile declaration that does not know its address in advance.
 *
 * @param address The address at which the RPC should appear
 * @param rpcID The 16-bit ID of the RPC
 * @param argFormat A format string compatible with unpackArrayBuffer to unpack arguments
 * @param respFormat A format string compatbile with packArrayBuffer to pack the return value
 */
export declare function tileRPC(rpcID: number, argFormat: string, respFormat: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare class BaseRPCDispatcher {
    [key: string]: any;
    protected rpcTable: {
        [key: number]: {
            [key: number]: RPCDescriptor;
        };
    };
    address: number | undefined;
    constructor(defaultAddress?: number);
    /**
     * Add an RPC to this RPCDispatcher.
     *
     * The RPC handler is stored for later use and can be called using the public method
     * rpc(address, rpcID, packedArguments: ArrayBuffer)
     *
     * @param address The address of the tile where we want to add this RPC
     * @param rpcID  The 16-bit RPC id of the RPC, something like 0x8000
     * @param argFormat A format string compatible with unpackArrayBuffer to unpack arguments
     * @param respFormat A format string compatbile with packArrayBuffer to pack the return value
     * @param handler A handler function that is called with bind(this, handler)
     * @param thisObject The object that should be used for the this parameter to handler
     */
    protected addRPC(address: number, rpcID: number, argFormat: string, respFormat: string, handler: (...args: any[]) => RPCResponse, thisObject: object): void;
    rpc(address: number, rpcID: number, args?: ArrayBuffer): Promise<ArrayBuffer>;
    hasRPC(address: number, rpcID: number): boolean;
    protected findRPCHandlers(obj: object): void;
}
export declare class VirtualTile extends BaseRPCDispatcher {
    protected name: string;
    protected firmwareVersion: string;
    constructor(address: number, name: string, firmwareVersion: string);
    tile_status(): RPCResponse;
}
export declare class VirtualDevice extends BaseRPCDispatcher {
    protected tiles: VirtualTile[];
    iotileID: number;
    controller: BasicControllerTile | undefined;
    constructor(iotileID: number, tiles: VirtualTile[]);
    rpc(address: number, rpcID: number, args?: ArrayBuffer): Promise<ArrayBuffer>;
}
/**
 * Pack a 32-bit error code the same way an embedded device does it.
 *
 * @param subsystem The subsystem ID that this error came from
 * @param errorCode The actual error code
 */
export declare function packError(subsystem: number, errorCode: number): number;
