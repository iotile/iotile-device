export declare class BaseError {
    message: string;
    constructor(message: string);
}
export declare class RPCNotFound extends BaseError {
    address: number;
    rpcID: number;
    constructor(address: number, rpcID: number);
}
export declare class RPCArgumentsIncorrect extends BaseError {
    address: number;
    rpcID: number;
    expectedFormat: string;
    args: any;
    constructor(address: number, rpcID: number, expectedFormat: string, args: any);
}
export declare class RPCResponseIncorrect extends BaseError {
    address: number;
    rpcID: number;
    expectedFormat: string;
    response: any;
    constructor(address: number, rpcID: number, expectedFormat: string, response: any);
}
