"use strict";
///<reference path="../../typings/cordova_plugins.d.ts"/>
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
var IOTileTypes = require("../common/iotile-types");
var iotile_report_parser_1 = require("./iotile-report-parser");
var IOTileStreamingInterface = /** @class */ (function () {
    function IOTileStreamingInterface(bufferSize, expand) {
        if (expand === void 0) { expand = false; }
        this.removeStreamingHandler = null;
        this.reportParser = new iotile_report_parser_1.ReportParser(bufferSize, expand);
    }
    IOTileStreamingInterface.prototype.open = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var that, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.channel = channel;
                        this.reportParser.reset();
                        that = this;
                        _a = this;
                        return [4 /*yield*/, this.channel.subscribe(IOTileTypes.IOTileCharacteristic.Streaming, function (value) {
                                that.receiveStreamingData(value);
                            })];
                    case 1:
                        _a.removeStreamingHandler = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    IOTileStreamingInterface.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.removeStreamingHandler !== null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.removeStreamingHandler()];
                    case 1:
                        _a.sent();
                        this.removeStreamingHandler = null;
                        this.reportParser.reset();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    IOTileStreamingInterface.prototype.stop = function () {
        this.reportParser.stop();
    };
    IOTileStreamingInterface.prototype.receiveStreamingData = function (value) {
        if (this.channel) {
            try {
                var reports = this.reportParser.pushData(value);
                var event_1 = this.reportParser.popLastEvent();
                if (event_1 !== null) {
                    switch (event_1.name) {
                        case 'ReportStartedEvent':
                            this.channel.notify(IOTileTypes.AdapterEvent.RobustReportStarted, event_1);
                            break;
                        case 'ReportStalledEvent':
                            this.channel.notify(IOTileTypes.AdapterEvent.RobustReportStalled, event_1);
                            break;
                        case 'ReportProgressEvent':
                            this.channel.notify(IOTileTypes.AdapterEvent.RobustReportProgress, event_1);
                            break;
                        case 'ReportFinishedEvent':
                            this.channel.notify(IOTileTypes.AdapterEvent.RobustReportFinished, event_1);
                            break;
                    }
                }
                for (var i = 0; i < reports.length; ++i) {
                    var report = reports[i];
                    if (report.constructor.name === 'IndividualReport') {
                        this.channel.notify(IOTileTypes.AdapterEvent.RawRealtimeReading, report);
                    }
                    else if (report.constructor.name === 'SignedListReport') {
                        this.channel.notify(IOTileTypes.AdapterEvent.RawRobustReport, report);
                    }
                    else {
                        //There should not be any other type of report that can be returned
                        //by the report parser but at least log a warning about this
                        console.warn('Unknown report type received from ReportParser, ignoring it.  Type: ' + report.constructor.name);
                    }
                }
            }
            catch (err) {
                if (err.name === 'ReportParsingError' || err.name === 'InsufficientSpaceError') {
                    this.channel.notify(IOTileTypes.AdapterEvent.UnrecoverableStreamingError, err);
                }
                else if (err.name === 'ReportParsingStoppedError') {
                    //Ignore further errors if we've already reported that streaming has been stopped
                    //due to an error.
                }
            }
        }
    };
    return IOTileStreamingInterface;
}());
exports.IOTileStreamingInterface = IOTileStreamingInterface;
//# sourceMappingURL=iotile-iface-streaming.js.map