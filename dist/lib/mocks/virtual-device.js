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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_common_1 = require("iotile-common");
var errors_1 = require("./errors");
;
;
/**
 * Decorator factory that marks a function as a callable RPC with the given metadata.
 *
 * @param address The address at which the RPC should appear
 * @param rpcID The 16-bit ID of the RPC
 * @param argFormat A format string compatible with unpackArrayBuffer to unpack arguments
 * @param respFormat A format string compatbile with packArrayBuffer to pack the return value
 */
function rpc(address, rpcID, argFormat, respFormat) {
    return function (target, propertyKey, descriptor) {
        target.rpcData = {
            argFormat: argFormat,
            respFormat: respFormat,
            rpcID: rpcID,
            address: address
        };
    };
}
exports.rpc = rpc;
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
function tileRPC(rpcID, argFormat, respFormat) {
    return function (target, propertyKey, descriptor) {
        target[propertyKey].rpcData = {
            argFormat: argFormat,
            respFormat: respFormat,
            rpcID: rpcID
        };
    };
}
exports.tileRPC = tileRPC;
var BaseRPCDispatcher = /** @class */ (function () {
    function BaseRPCDispatcher(defaultAddress) {
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
    BaseRPCDispatcher.prototype.addRPC = function (address, rpcID, argFormat, respFormat, handler, thisObject) {
        var desc = {
            argFormat: argFormat,
            respFormat: respFormat,
            handler: handler,
            thisObject: thisObject
        };
        if (!(address in this.rpcTable))
            this.rpcTable[address] = {};
        if (rpcID in this.rpcTable[address])
            throw new iotile_common_1.ArgumentError("Attempted to add the same RPC ID twice, address: " + address + ", rpcID: " + rpcID);
        this.rpcTable[address][rpcID] = desc;
    };
    BaseRPCDispatcher.prototype.rpc = function (address, rpcID, args) {
        return __awaiter(this, void 0, void 0, function () {
            var desc, parsedArgs, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(address in this.rpcTable) || !(rpcID in this.rpcTable[address])) {
                            throw new errors_1.RPCNotFound(address, rpcID);
                        }
                        desc = this.rpcTable[address][rpcID];
                        parsedArgs = [];
                        if (args != null && desc.argFormat.length > 0) {
                            parsedArgs = iotile_common_1.unpackArrayBuffer(desc.argFormat, args);
                        }
                        response = desc.handler.apply(desc.thisObject, parsedArgs);
                        if (!(response instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, response];
                    case 1:
                        response = _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, iotile_common_1.packArrayBuffer.apply(void 0, [desc.respFormat].concat(response))];
                }
            });
        });
    };
    BaseRPCDispatcher.prototype.hasRPC = function (address, rpcID) {
        if (!(address in this.rpcTable) || !(rpcID in this.rpcTable[address])) {
            return false;
        }
        return true;
    };
    BaseRPCDispatcher.prototype.findRPCHandlers = function (obj) {
        var prototype = obj;
        var methods = [];
        while (prototype != null) {
            var ownMethods = Object.getOwnPropertyNames(prototype);
            methods = methods.concat(ownMethods);
            prototype = Object.getPrototypeOf(prototype);
        }
        for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
            var methodName = methods_1[_i];
            var method = this[methodName];
            if (method == null) {
                continue;
            }
            if (method.rpcData != null) {
                var address = method.rpcData.address;
                if (address == null) {
                    if (this.address == null) {
                        throw new iotile_common_1.ArgumentError("Attempted to add an RPC without an address in a context with no default address");
                    }
                    address = this.address;
                }
                this.addRPC(address, method.rpcData.rpcID, method.rpcData.argFormat, method.rpcData.respFormat, method, obj);
            }
        }
    };
    return BaseRPCDispatcher;
}());
exports.BaseRPCDispatcher = BaseRPCDispatcher;
var VirtualTile = /** @class */ (function (_super) {
    __extends(VirtualTile, _super);
    function VirtualTile(address, name, firmwareVersion) {
        var _this = _super.call(this, address) || this;
        _this.name = name;
        _this.firmwareVersion = firmwareVersion;
        return _this;
    }
    VirtualTile.prototype.tile_status = function () {
        return [0xFFFF, this.name, 1, 0, 0, 0];
    };
    __decorate([
        tileRPC(0x0004, "", "H6sBBBB"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Object)
    ], VirtualTile.prototype, "tile_status", null);
    return VirtualTile;
}(BaseRPCDispatcher));
exports.VirtualTile = VirtualTile;
var VirtualDevice = /** @class */ (function (_super) {
    __extends(VirtualDevice, _super);
    function VirtualDevice(iotileID, tiles) {
        var _this = _super.call(this) || this;
        _this.tiles = tiles;
        _this.iotileID = iotileID;
        for (var _i = 0, tiles_1 = tiles; _i < tiles_1.length; _i++) {
            var tile = tiles_1[_i];
            if (tile.address == 8) {
                _this.controller = tile;
            }
        }
        return _this;
    }
    VirtualDevice.prototype.rpc = function (address, rpcID, args) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, tile;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.hasRPC(address, rpcID)) {
                            return [2 /*return*/, _super.prototype.rpc.call(this, address, rpcID, args)];
                        }
                        _i = 0, _a = this.tiles;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        tile = _a[_i];
                        if (!tile.hasRPC(address, rpcID)) return [3 /*break*/, 3];
                        return [4 /*yield*/, tile.rpc(address, rpcID, args)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: throw new errors_1.RPCNotFound(address, rpcID);
                }
            });
        });
    };
    return VirtualDevice;
}(BaseRPCDispatcher));
exports.VirtualDevice = VirtualDevice;
/**
 * Pack a 32-bit error code the same way an embedded device does it.
 *
 * @param subsystem The subsystem ID that this error came from
 * @param errorCode The actual error code
 */
function packError(subsystem, errorCode) {
    return (subsystem << 16) | errorCode;
}
exports.packError = packError;
//# sourceMappingURL=virtual-device.js.map