

//See https://github.com/Microsoft/TypeScript/issues/13965 for why we can't extend from Error
export class BaseError {
    constructor(public message: string) {

    }
}

export class RPCNotFound extends BaseError {
    constructor(public address: number, public rpcID: number) {
        super(`Cannot find RPC (address: ${address} and id: ${rpcID})`);
    }
}

export class RPCArgumentsIncorrect extends BaseError {
    constructor(public address: number, public rpcID: number, public expectedFormat: string, public args: any) {
        super(`Attempted to call RPC (address: ${address}, id: ${rpcID}) with incompatible arguments, expected ${expectedFormat}`);
    }
}

export class RPCResponseIncorrect extends BaseError {
    constructor(public address: number, public rpcID: number, public expectedFormat: string, public response: any) {
        super(`RPC implementation (address: ${address}, id: ${rpcID}) returned an incompatible response, expected ${expectedFormat}`);
    }
}
