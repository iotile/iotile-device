/**
 * @ngdoc object
 * @name Errors
 *
 * @description
 * The errors namespace contains all exceptions thrown by methods or functions
 * in the iotile.* services.
 * 
 * All exceptions derive from the base exception class {@link Errors.type:BaseError BaseError} and 
 * all have the `name` property set to the name of their class, so you can check for which error 
 * type was thrown by using:
 * 
 * <pre>
 * try {
 *   methodThatThrows();
 * } catch (err) {
 *   if (err.name == 'ArgumentError') {
 *     //Handle argument error
 *   }
 * }
 * </pre>
 * 
 * ## Notes
 * 
 * - All methods that throw errors must throw an appropriate subclass of Errors.BaseError.  
 * - All functions and methods must not throw primitive types like strings, objects or numbers.
 *   If those objects need to be included in an exception, they should be passed as parameters
 *   to the appropriate Error subclass.
 */
import {BaseError} from "@iotile/iotile-common";
import {UserRedirectionInfo, AdapterState} from "./iotile-types";

/**
 * Types of RPC errors that a device can return.  These are not errors thrown by the IOTileAdapter 
 * because there was an issue with the phone's bluetooth stack, but rather errors that come from
 * the IOTile device itself because, e.g. it was not able to find the tile requested or the RPC
 * id didn't exist.
 */

 export enum RPCProtocolError {
    CommandNotFound = 2
 }

/**
 * @ngdoc object
 * @name Errors.type:RPCError
 * @description
 * There was an error executing an RPC on an IOTile Device.  Information
 * about the error is contained in the attached properties.
 * 
 * @property {number} address The address of the tile that the RPC was directed toward
 * @property {number} rpcID the 16-bit ID of the RPC that we were trying to
 * @property {number} errorCode the numeric error code that was returned during RPC processing
 */
export class RPCError extends BaseError {
    public address: number;
    public rpcID: number;
    public errorCode: number;

    constructor(address: number, rpcID: number, errorCode: number) {
        let message = 'Error sending RPC to Tile ' + address + ' with ID ' + rpcID + ', code was ' + errorCode;
        // @ts-ignore
        super('RPCError', message);

        this.address = address;
        this.rpcID = rpcID;
        this.errorCode = errorCode;
    }
}

export class StreamingError extends BaseError {
    constructor(name: string, message: string) {
        // @ts-ignore
        super(name, message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ReportParsingStoppedError
 * @description
 * Report parsing has been stopped due to a previous unrecoverable error.
 * No more reports will be processed from the IOTile device until you reconnect to
 * it to in order to reset the ReportParser.
 */
export class ReportParsingStoppedError extends StreamingError {
    constructor(message: string) {
        super('ReportParsingStoppedError', message);
    }
}

export class StreamingTimeoutError extends StreamingError {
    constructor(message: string) {
        super('StreamingTimeoutError', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ReportParsingError
 * @description
 * A fatal error has occurs processing report data received from the IOTile device.
 * No further data will be accepted from the device since it cannot be parsed correctly
 * after this error.  You will need to disconnect and reconnect to the device before
 * more data will be accepted.
 */
export class ReportParsingError extends StreamingError {
    constructor(message: string) {
        super('ReportParsingError', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:RingBufferEmptyError
 * @description
 * You requested to pop/peek at more data than was currrently present in the ring buffer.
 * Depending on your use case, this may not be a fatal error and you should catch it and 
 * try again later.
 */
export class RingBufferEmptyError extends StreamingError {
    constructor(message: string) {
        super('RingBufferEmptyError', message);
    }
}

export class BluetoothError extends BaseError {
    constructor(name: string, message: string) {
        // @ts-ignore
        super(name, message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ConnectionError
 * @description 
 * There was an error connecting to the IOTile device
 */
export class ConnectionError extends BluetoothError {
    constructor(message: string) {
        super('ConnectionError', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ConnectionCancelledError
 * @description 
 * The connection attempt to a device was canceled due to either a
 * user action or a preconnection hook indicating that connection
 * was not desired.  The info property has more details about what
 * should be done. 
 */
export class ConnectionCancelledError extends BluetoothError {
    public info : UserRedirectionInfo;

    constructor(redirect: UserRedirectionInfo) {
        super('ConnectionCancelledError', redirect.reason);
        this.info = redirect;
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ConnectionFailedError
 * @description 
 * The connection attempt to a device was canceled due to either a
 * user action or a preconnection hook indicating that connection
 * was not desired.  The info property has more details about what
 * should be done. 
 */
export class ConnectionFailedError extends BluetoothError {
    public rawError: {};
    constructor(err: {}) {
        super('ConnectionFailedError', "Connection attempt failed.  This occassionally happens, please try connecting again.");
        this.rawError = err;
    }
}

/**
 * @ngdoc object
 * @name Errors.type:WriteError
 * @description 
 * There was an error writing data to the IOTile device over 
 * Bluetooth, this is a low level fatal error that it unrecoverable.
 */
export class WriteError extends BluetoothError {
    constructor(message: string) {
        super('WriteError', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:BluetoothDisabledError
 * @description 
 * You attempted to complete a bluetooth related operation that failed
 * because Bluetooth is not enabled on the user's device.
 */
export class BluetoothDisabledError extends BluetoothError {
    constructor(message: string) {
        super('BluetoothDisabledError', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:OperationAtInvalidTimeError
 * @description 
 * You attempted to perform an operation over bluetooth that could not 
 * be completed because the IOTile device is in the wrong state.  For example,
 * you cannot send an RPC until after you connect to a device.  The message
 * field will have more information on what went wrong.
 * 
 * @property {number} state The state that we expected to be in for this operation
 *   to be possible.
 */
export class OperationAtInvalidTimeError extends BluetoothError {
    public state: AdapterState;
    public userMessage: string;

    constructor(message: string, state: AdapterState, userMessage?: string) {
        super('OperationAtInvalidTimeError', message);
        this.state = state;
        this.userMessage = userMessage || "";
    }
}

/**
 * @ngdoc object
 * @name Errors.type:ScriptSentAtInvalidTime
 * @description 
 * You attempted to send a script to an IOTile device while another script was
 * in the process of running.  You have to wait until a script finishes before
 * sending another one.
 */
export class ScriptSentAtInvalidTime extends BluetoothError {
    constructor(message: string) {
        super('ScriptSentAtInvalidTime', message);
    }
}

/**
 * @ngdoc object
 * @name Errors.type:InvalidAdvertisingData
 * @description
 * An advertising packet was received from a non IOTile device.  This error is Typically
 * not unexpected or fatal.  It just means that you should ignore the device that sent this
 * advertising packet because it is not an IOTile device.
 */
export class InvalidAdvertisingData extends BluetoothError {
    constructor(message: string) {
        super('InvalidAdvertisingData', message);
    }
}

