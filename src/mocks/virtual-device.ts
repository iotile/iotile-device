import { ArgumentError, packArrayBuffer, unpackArrayBuffer } from "iotile-common";
import { RPCNotFound } from "./errors";
import { BasicControllerTile } from "./tiles/basic-controller";

export type RPCResponse = Promise<(number | string)[]> | (number | string)[];

export interface VersionInfo {
    osTag: number,
    osVersion: string,
    appTag: number,
    appVersion: string
};

export interface RPCDescriptor {
    argFormat: string,
    respFormat: string,
    thisObject: object,
    handler: (...args: any[]) => RPCResponse
};

/**
 * Decorator factory that marks a function as a callable RPC with the given metadata.
 * 
 * @param address The address at which the RPC should appear
 * @param rpcID The 16-bit ID of the RPC
 * @param argFormat A format string compatible with unpackArrayBuffer to unpack arguments
 * @param respFormat A format string compatbile with packArrayBuffer to pack the return value
 */
export function rpc(address: number, rpcID: number, argFormat: string, respFormat: string) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        target.rpcData = {
            argFormat: argFormat,
            respFormat: respFormat,
            rpcID: rpcID,
            address: address
        }
    }
}

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
export function tileRPC(rpcID: number, argFormat: string, respFormat: string) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        target[propertyKey].rpcData = {
            argFormat: argFormat,
            respFormat: respFormat,
            rpcID: rpcID
        }
    }
}


export class BaseRPCDispatcher {
    // need to define class index signature for findRPCHandlers
    [key: string]: any;

    protected rpcTable: {[key: number]: {[key: number]: RPCDescriptor}};
    public address: number | undefined;

    constructor(defaultAddress?: number) {
        this.rpcTable = {};
        this.address = defaultAddress;

        this.findRPCHandlers(this);
    }

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
    protected addRPC(address: number, rpcID: number, argFormat: string, respFormat: string, handler: (...args: any[]) => RPCResponse, thisObject: object) {
        let desc: RPCDescriptor = {
            argFormat: argFormat,
            respFormat: respFormat,
            handler: handler,
            thisObject: thisObject
        };

        if (!(address in this.rpcTable))
            this.rpcTable[address] = {}

        if (rpcID in this.rpcTable[address])
            throw new ArgumentError(`Attempted to add the same RPC ID twice, address: ${address}, rpcID: ${rpcID}`);
        
        this.rpcTable[address][rpcID] = desc;
    }

    public async rpc(address: number, rpcID: number, args?: ArrayBuffer): Promise<ArrayBuffer> {
        if (!(address in this.rpcTable) || !(rpcID in this.rpcTable[address])) {
            throw new RPCNotFound(address, rpcID);
        }

        let desc = this.rpcTable[address][rpcID];
        let parsedArgs = [];

        if (args != null && desc.argFormat.length > 0) {
            parsedArgs = unpackArrayBuffer(desc.argFormat, args);
        }

        let response: RPCResponse = desc.handler.apply(desc.thisObject, parsedArgs);

        if (response instanceof Promise) {
            response = await response;
        }

        return packArrayBuffer(desc.respFormat, ...response);
    }

    public hasRPC(address: number, rpcID: number): boolean {
        if (!(address in this.rpcTable) || !(rpcID in this.rpcTable[address])) {
            return false;
        }

        return true;
    }

    protected findRPCHandlers(obj: object) {
        let prototype = obj;
        let methods: string[] = [];

        while (prototype != null) {
            let ownMethods = Object.getOwnPropertyNames(prototype);
            methods = methods.concat(ownMethods);

            prototype = Object.getPrototypeOf(prototype);
        }

        for (let methodName of methods) {
            let method = this[methodName];
            if (method == null) {
                continue;
            }

            if (method.rpcData != null) {
                let address = method.rpcData.address;
                if (address == null) {
                    if (this.address == null) {
                        throw new ArgumentError("Attempted to add an RPC without an address in a context with no default address");
                    }
                 
                    address = this.address;
                }

                this.addRPC(address, method.rpcData.rpcID, method.rpcData.argFormat, method.rpcData.respFormat, method, obj);
            }
        }
    }
}


export class VirtualTile extends BaseRPCDispatcher {
    protected name: string;
    protected firmwareVersion: string;

    constructor(address: number, name: string, firmwareVersion: string) {
        super(address);

        this.name = name;
        this.firmwareVersion = firmwareVersion;
    }

    @tileRPC(0x0004, "", "H6sBBBB")
    public tile_status(): RPCResponse {
        return [0xFFFF, this.name, 1, 0, 0, 0];
    }
}


export class VirtualDevice extends BaseRPCDispatcher {
    protected tiles: VirtualTile[];
    public iotileID: number;
    public controller: BasicControllerTile | undefined;

    constructor(iotileID: number, tiles: VirtualTile[]) {
        super();

        this.tiles = tiles;
        this.iotileID = iotileID;

        for (let tile of tiles) {
            if (tile.address == 8) {
                this.controller = <BasicControllerTile>tile;
            }
        }
    }

    public async rpc(address: number, rpcID: number, args?: ArrayBuffer): Promise<ArrayBuffer> {
        if (this.hasRPC(address, rpcID)) {
            return super.rpc(address, rpcID, args);
        }

        for (let tile of this.tiles) {
            if (tile.hasRPC(address, rpcID)) {
                return await tile.rpc(address, rpcID, args);
            }
        }

        throw new RPCNotFound(address, rpcID); 
    }
}

/**
 * Pack a 32-bit error code the same way an embedded device does it.
 * 
 * @param subsystem The subsystem ID that this error came from
 * @param errorCode The actual error code
 */
export function packError(subsystem: number, errorCode: number) {
    return (subsystem << 16) | errorCode;
}