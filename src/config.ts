import {Category,CategoryServiceFactory,
    CategoryConfiguration,LogLevel,CategoryLogFormat, CategoryLogMessage, MessageFormatUtils} from "typescript-logging";
 
// Optionally change default settings, in this example set default logging to Info.
// Without changing configuration, categories will log to Error.

let categoryConfig = new CategoryConfiguration(LogLevel.Info,
    undefined, new CategoryLogFormat(undefined, false, true));

categoryConfig.formatterLogMessage = (msg: CategoryLogMessage) => {
    return MessageFormatUtils.renderDefaultMessage(msg, false)
};

CategoryServiceFactory.setDefaultConfiguration(categoryConfig);
 
// Create categories, they will autoregister themselves, one category without parent (root) and a child category.
export const catService = new Category("iotile.device");
export const catAdapter = new Category("IOTileAdapter", catService);
export const catReports = new Category("Reports", catService);
export const catUTCAssigner = new Category('UTCAssigner', catService);
export const catBLEOptimizer = new Category("BLEOptimizer", catService);
export const catMockBLE = new Category("MockBLE", catService);
export const catPOD1M = new Category("POD1M", catService);
export const catStreaming = new Category("Streaming", catService);
export const catNotify = new Category("Notifications", catService);
