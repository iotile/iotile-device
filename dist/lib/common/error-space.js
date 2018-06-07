"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
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
var iotile_common_1 = require("iotile-common");
/**
 * Types of RPC errors that a device can return.  These are not errors thrown by the IOTileAdapter
 * because there was an issue with the phone's bluetooth stack, but rather errors that come from
 * the IOTile device itself because, e.g. it was not able to find the tile requested or the RPC
 * id didn't exist.
 */
var RPCProtocolError;
(function (RPCProtocolError) {
    RPCProtocolError[RPCProtocolError["CommandNotFound"] = 2] = "CommandNotFound";
})(RPCProtocolError = exports.RPCProtocolError || (exports.RPCProtocolError = {}));
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
var RPCError = /** @class */ (function (_super) {
    __extends(RPCError, _super);
    function RPCError(address, rpcID, errorCode) {
        var _this = this;
        var message = 'Error sending RPC to Tile ' + address + ' with ID ' + rpcID + ', code was ' + errorCode;
        _this = _super.call(this, 'RPCError', message) || this;
        _this.address = address;
        _this.rpcID = rpcID;
        _this.errorCode = errorCode;
        return _this;
    }
    return RPCError;
}(iotile_common_1.BaseError));
exports.RPCError = RPCError;
var StreamingError = /** @class */ (function (_super) {
    __extends(StreamingError, _super);
    function StreamingError(name, message) {
        return _super.call(this, name, message) || this;
    }
    return StreamingError;
}(iotile_common_1.BaseError));
exports.StreamingError = StreamingError;
/**
 * @ngdoc object
 * @name Errors.type:ReportParsingStoppedError
 * @description
 * Report parsing has been stopped due to a previous unrecoverable error.
 * No more reports will be processed from the IOTile device until you reconnect to
 * it to in order to reset the ReportParser.
 */
var ReportParsingStoppedError = /** @class */ (function (_super) {
    __extends(ReportParsingStoppedError, _super);
    function ReportParsingStoppedError(message) {
        return _super.call(this, 'ReportParsingStoppedError', message) || this;
    }
    return ReportParsingStoppedError;
}(StreamingError));
exports.ReportParsingStoppedError = ReportParsingStoppedError;
var StreamingTimeoutError = /** @class */ (function (_super) {
    __extends(StreamingTimeoutError, _super);
    function StreamingTimeoutError(message) {
        return _super.call(this, 'StreamingTimeoutError', message) || this;
    }
    return StreamingTimeoutError;
}(StreamingError));
exports.StreamingTimeoutError = StreamingTimeoutError;
/**
 * @ngdoc object
 * @name Errors.type:ReportParsingError
 * @description
 * A fatal error has occurs processing report data received from the IOTile device.
 * No further data will be accepted from the device since it cannot be parsed correctly
 * after this error.  You will need to disconnect and reconnect to the device before
 * more data will be accepted.
 */
var ReportParsingError = /** @class */ (function (_super) {
    __extends(ReportParsingError, _super);
    function ReportParsingError(message) {
        return _super.call(this, 'ReportParsingError', message) || this;
    }
    return ReportParsingError;
}(StreamingError));
exports.ReportParsingError = ReportParsingError;
/**
 * @ngdoc object
 * @name Errors.type:RingBufferEmptyError
 * @description
 * You requested to pop/peek at more data than was currrently present in the ring buffer.
 * Depending on your use case, this may not be a fatal error and you should catch it and
 * try again later.
 */
var RingBufferEmptyError = /** @class */ (function (_super) {
    __extends(RingBufferEmptyError, _super);
    function RingBufferEmptyError(message) {
        return _super.call(this, 'RingBufferEmptyError', message) || this;
    }
    return RingBufferEmptyError;
}(StreamingError));
exports.RingBufferEmptyError = RingBufferEmptyError;
var BluetoothError = /** @class */ (function (_super) {
    __extends(BluetoothError, _super);
    function BluetoothError(name, message) {
        return _super.call(this, name, message) || this;
    }
    return BluetoothError;
}(iotile_common_1.BaseError));
exports.BluetoothError = BluetoothError;
/**
 * @ngdoc object
 * @name Errors.type:ConnectionError
 * @description
 * There was an error connecting to the IOTile device
 */
var ConnectionError = /** @class */ (function (_super) {
    __extends(ConnectionError, _super);
    function ConnectionError(message) {
        return _super.call(this, 'ConnectionError', message) || this;
    }
    return ConnectionError;
}(BluetoothError));
exports.ConnectionError = ConnectionError;
/**
 * @ngdoc object
 * @name Errors.type:ConnectionCancelledError
 * @description
 * The connection attempt to a device was canceled due to either a
 * user action or a preconnection hook indicating that connection
 * was not desired.  The info property has more details about what
 * should be done.
 */
var ConnectionCancelledError = /** @class */ (function (_super) {
    __extends(ConnectionCancelledError, _super);
    function ConnectionCancelledError(redirect) {
        var _this = _super.call(this, 'ConnectionCancelledError', redirect.reason) || this;
        _this.info = redirect;
        return _this;
    }
    return ConnectionCancelledError;
}(BluetoothError));
exports.ConnectionCancelledError = ConnectionCancelledError;
/**
 * @ngdoc object
 * @name Errors.type:ConnectionFailedError
 * @description
 * The connection attempt to a device was canceled due to either a
 * user action or a preconnection hook indicating that connection
 * was not desired.  The info property has more details about what
 * should be done.
 */
var ConnectionFailedError = /** @class */ (function (_super) {
    __extends(ConnectionFailedError, _super);
    function ConnectionFailedError(err) {
        var _this = _super.call(this, 'ConnectionFailedError', "Connection attempt failed.  This occassionally happens, please try connecting again.") || this;
        _this.rawError = err;
        return _this;
    }
    return ConnectionFailedError;
}(BluetoothError));
exports.ConnectionFailedError = ConnectionFailedError;
/**
 * @ngdoc object
 * @name Errors.type:WriteError
 * @description
 * There was an error writing data to the IOTile device over
 * Bluetooth, this is a low level fatal error that it unrecoverable.
 */
var WriteError = /** @class */ (function (_super) {
    __extends(WriteError, _super);
    function WriteError(message) {
        return _super.call(this, 'WriteError', message) || this;
    }
    return WriteError;
}(BluetoothError));
exports.WriteError = WriteError;
/**
 * @ngdoc object
 * @name Errors.type:BluetoothDisabledError
 * @description
 * You attempted to complete a bluetooth related operation that failed
 * because Bluetooth is not enabled on the user's device.
 */
var BluetoothDisabledError = /** @class */ (function (_super) {
    __extends(BluetoothDisabledError, _super);
    function BluetoothDisabledError(message) {
        return _super.call(this, 'BluetoothDisabledError', message) || this;
    }
    return BluetoothDisabledError;
}(BluetoothError));
exports.BluetoothDisabledError = BluetoothDisabledError;
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
var OperationAtInvalidTimeError = /** @class */ (function (_super) {
    __extends(OperationAtInvalidTimeError, _super);
    function OperationAtInvalidTimeError(message, state, userMessage) {
        var _this = _super.call(this, 'OperationAtInvalidTimeError', message) || this;
        _this.state = state;
        _this.userMessage = userMessage || "";
        return _this;
    }
    return OperationAtInvalidTimeError;
}(BluetoothError));
exports.OperationAtInvalidTimeError = OperationAtInvalidTimeError;
/**
 * @ngdoc object
 * @name Errors.type:ScriptSentAtInvalidTime
 * @description
 * You attempted to send a script to an IOTile device while another script was
 * in the process of running.  You have to wait until a script finishes before
 * sending another one.
 */
var ScriptSentAtInvalidTime = /** @class */ (function (_super) {
    __extends(ScriptSentAtInvalidTime, _super);
    function ScriptSentAtInvalidTime(message) {
        return _super.call(this, 'ScriptSentAtInvalidTime', message) || this;
    }
    return ScriptSentAtInvalidTime;
}(BluetoothError));
exports.ScriptSentAtInvalidTime = ScriptSentAtInvalidTime;
/**
 * @ngdoc object
 * @name Errors.type:InvalidAdvertisingData
 * @description
 * An advertising packet was received from a non IOTile device.  This error is Typically
 * not unexpected or fatal.  It just means that you should ignore the device that sent this
 * advertising packet because it is not an IOTile device.
 */
var InvalidAdvertisingData = /** @class */ (function (_super) {
    __extends(InvalidAdvertisingData, _super);
    function InvalidAdvertisingData(message) {
        return _super.call(this, 'InvalidAdvertisingData', message) || this;
    }
    return InvalidAdvertisingData;
}(BluetoothError));
exports.InvalidAdvertisingData = InvalidAdvertisingData;
//# sourceMappingURL=error-space.js.map