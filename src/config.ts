import {Category,CategoryServiceFactory,
    CategoryConfiguration,LogLevel} from "typescript-logging";
 
// Optionally change default settings, in this example set default logging to Info.
// Without changing configuration, categories will log to Error.
CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Info));
 
// Create categories, they will autoregister themselves, one category without parent (root) and a child category.
export const catService = new Category("iotile.device");
export const catAdapter = new Category("IOTileAdapter", catService);
export const catUTCAssigner = new Category('UTCAssigner', catService);
export const catBLEOptimizer = new Category("BLEOptimizer", catService);
export const catMockBLE = new Category("MockBLE", catService);
export const catPOD1M = new Category("POD1M", catService);
