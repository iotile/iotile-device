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
//See https://github.com/Microsoft/TypeScript/issues/13965 for why we can't extend from Error
var BaseError = /** @class */ (function () {
    function BaseError(message) {
        this.message = message;
    }
    return BaseError;
}());
exports.BaseError = BaseError;
var RPCNotFound = /** @class */ (function (_super) {
    __extends(RPCNotFound, _super);
    function RPCNotFound(address, rpcID) {
        var _this = _super.call(this, "Cannot find RPC (address: " + address + " and id: " + rpcID + ")") || this;
        _this.address = address;
        _this.rpcID = rpcID;
        return _this;
    }
    return RPCNotFound;
}(BaseError));
exports.RPCNotFound = RPCNotFound;
var RPCArgumentsIncorrect = /** @class */ (function (_super) {
    __extends(RPCArgumentsIncorrect, _super);
    function RPCArgumentsIncorrect(address, rpcID, expectedFormat, args) {
        var _this = _super.call(this, "Attempted to call RPC (address: " + address + ", id: " + rpcID + ") with incompatible arguments, expected " + expectedFormat) || this;
        _this.address = address;
        _this.rpcID = rpcID;
        _this.expectedFormat = expectedFormat;
        _this.args = args;
        return _this;
    }
    return RPCArgumentsIncorrect;
}(BaseError));
exports.RPCArgumentsIncorrect = RPCArgumentsIncorrect;
var RPCResponseIncorrect = /** @class */ (function (_super) {
    __extends(RPCResponseIncorrect, _super);
    function RPCResponseIncorrect(address, rpcID, expectedFormat, response) {
        var _this = _super.call(this, "RPC implementation (address: " + address + ", id: " + rpcID + ") returned an incompatible response, expected " + expectedFormat) || this;
        _this.address = address;
        _this.rpcID = rpcID;
        _this.expectedFormat = expectedFormat;
        _this.response = response;
        return _this;
    }
    return RPCResponseIncorrect;
}(BaseError));
exports.RPCResponseIncorrect = RPCResponseIncorrect;
//# sourceMappingURL=errors.js.map