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
var iotile_common_1 = require("iotile-common");
var AbstractNotificationService = /** @class */ (function () {
    function AbstractNotificationService() {
    }
    return AbstractNotificationService;
}());
exports.AbstractNotificationService = AbstractNotificationService;
var EventManager = /** @class */ (function () {
    function EventManager(event) {
        this.callbacks = {};
    }
    EventManager.prototype.addCallback = function (callback) {
        var id = iotile_common_1.guid();
        this.callbacks[id] = callback;
        return id;
    };
    EventManager.prototype.triggerCallback = function (event, args) {
        for (var callback in this.callbacks) {
            this.callbacks[callback](event, args);
        }
    };
    EventManager.prototype.removeAll = function () {
        this.callbacks = {};
    };
    EventManager.prototype.removeCallback = function (handlerId) {
        if (handlerId in this.callbacks) {
            delete this.callbacks[handlerId];
        }
        else {
            throw new iotile_common_1.UnknownKeyError('Unknown event handler key: ' + handlerId);
        }
    };
    return EventManager;
}());
exports.EventManager = EventManager;
var BasicNotificationService = /** @class */ (function (_super) {
    __extends(BasicNotificationService, _super);
    function BasicNotificationService() {
        var _this = _super.call(this) || this;
        _this.events = {};
        return _this;
    }
    BasicNotificationService.prototype.subscribe = function (event, callback) {
        if (!(event in this.events)) {
            this.events[event] = new EventManager(event);
        }
        var handlerId = this.events[event].addCallback(callback);
        var that = this;
        var handler = function () {
            that.events[event].removeCallback(handlerId);
        };
        return handler;
    };
    ;
    BasicNotificationService.prototype.notify = function (event, args) {
        if (event in this.events) {
            var manager = this.events[event];
            manager.triggerCallback(event, args);
        }
    };
    ;
    BasicNotificationService.prototype.removeAll = function () {
        for (var event_1 in this.events) {
            this.events[event_1].removeAll();
        }
        this.events = {};
    };
    return BasicNotificationService;
}(AbstractNotificationService));
exports.BasicNotificationService = BasicNotificationService;
//# sourceMappingURL=notification-service.js.map