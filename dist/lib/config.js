"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_logging_1 = require("typescript-logging");
// Optionally change default settings, in this example set default logging to Info.
// Without changing configuration, categories will log to Error.
typescript_logging_1.CategoryServiceFactory.setDefaultConfiguration(new typescript_logging_1.CategoryConfiguration(typescript_logging_1.LogLevel.Info));
// Create categories, they will autoregister themselves, one category without parent (root) and a child category.
exports.catService = new typescript_logging_1.Category("iotile.device");
exports.catAdapter = new typescript_logging_1.Category("IOTileAdapter", exports.catService);
exports.catBLEOptimizer = new typescript_logging_1.Category("BLEOptimizer", exports.catService);
exports.catMockBLE = new typescript_logging_1.Category("MockBLE", exports.catService);
//# sourceMappingURL=config.js.map