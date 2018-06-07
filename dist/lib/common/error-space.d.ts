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
import { BaseError } from "iotile-common";
import { UserRedirectionInfo, AdapterState } from "./iotile-types";
/**
 * Types of RPC errors that a device can return.  These are not errors thrown by the IOTileAdapter
 * because there was an issue with the phone's bluetooth stack, but rather errors that come from
 * the IOTile device itself because, e.g. it was not able to find the tile requested or the RPC
 * id didn't exist.
 */
export declare enum RPCProtocolError {
    CommandNotFound = 2,
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
export declare class RPCError extends BaseError {
    address: number;
    rpcID: number;
    errorCode: number;
    constructor(address: number, rpcID: number, errorCode: number);
}
export declare class StreamingError extends BaseError {
    constructor(name: string, message: string);
}
/**
 * @ngdoc object
 * @name Errors.type:ReportParsingStoppedError
 * @description
 * Report parsing has been stopped due to a previous unrecoverable error.
 * No more reports will be processed from the IOTile device until you reconnect to
 * it to in order to reset the ReportParser.
 */
export declare class ReportParsingStoppedError extends StreamingError {
    constructor(message: string);
}
export declare class StreamingTimeoutError extends StreamingError {
    constructor(message: string);
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
export declare class ReportParsingError extends StreamingError {
    constructor(message: string);
}
/**
 * @ngdoc object
 * @name Errors.type:RingBufferEmptyError
 * @description
 * You requested to pop/peek at more data than was currrently present in the ring buffer.
 * Depending on your use case, this may not be a fatal error and you should catch it and
 * try again later.
 */
export declare class RingBufferEmptyError extends StreamingError {
    constructor(message: string);
}
export declare class BluetoothError extends BaseError {
    constructor(name: string, message: string);
}
/**
 * @ngdoc object
 * @name Errors.type:ConnectionError
 * @description
 * There was an error connecting to the IOTile device
 */
export declare class ConnectionError extends BluetoothError {
    constructor(message: string);
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
export declare class ConnectionCancelledError extends BluetoothError {
    info: UserRedirectionInfo;
    constructor(redirect: UserRedirectionInfo);
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
export declare class ConnectionFailedError extends BluetoothError {
    rawError: {};
    constructor(err: {});
}
/**
 * @ngdoc object
 * @name Errors.type:WriteError
 * @description
 * There was an error writing data to the IOTile device over
 * Bluetooth, this is a low level fatal error that it unrecoverable.
 */
export declare class WriteError extends BluetoothError {
    constructor(message: string);
}
/**
 * @ngdoc object
 * @name Errors.type:BluetoothDisabledError
 * @description
 * You attempted to complete a bluetooth related operation that failed
 * because Bluetooth is not enabled on the user's device.
 */
export declare class BluetoothDisabledError extends BluetoothError {
    constructor(message: string);
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
export declare class OperationAtInvalidTimeError extends BluetoothError {
    state: AdapterState;
    userMessage: string;
    constructor(message: string, state: AdapterState, userMessage?: string);
}
/**
 * @ngdoc object
 * @name Errors.type:ScriptSentAtInvalidTime
 * @description
 * You attempted to send a script to an IOTile device while another script was
 * in the process of running.  You have to wait until a script finishes before
 * sending another one.
 */
export declare class ScriptSentAtInvalidTime extends BluetoothError {
    constructor(message: string);
}
/**
 * @ngdoc object
 * @name Errors.type:InvalidAdvertisingData
 * @description
 * An advertising packet was received from a non IOTile device.  This error is Typically
 * not unexpected or fatal.  It just means that you should ignore the device that sent this
 * advertising packet because it is not an IOTile device.
 */
export declare class InvalidAdvertisingData extends BluetoothError {
    constructor(message: string);
}
