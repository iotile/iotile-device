/**
 * An automated connection plugin that searches for the best BLE connection
 * interval to use for each phone model.  It runs on connection with all
 * ble devices and tries to find the fastest connection interval that the
 * phone will support.
 *
 * This will only work on devices with firmware that support the ble_query
 * and ble_update
 */
import { IOTileDevice } from "./iotile-device";
import { AbstractIOTileAdapter } from "./iotile-base-types";
import { Platform } from "../common/iotile-types";
/**
 * Attempt to find the fastest BLE connection interval.
 *
 * See https://github.com/iotile/iotile-mobile-ionic/issues/804 for significant discussion
 * but basically, phones default to rather slow connection intervals and the peripheral needs
 * to request faster ones if it wants.  However, the rules for each platform are slightly
 * different in terms of what they will accept so we use a platform dependent strategy to
 * hopefully narrow in on the best interval.
 *
 * In particular, android appears to always pick the highest value in your range and iOS only
 * really allows you pick 15 ms or 30 ms and then sometimes still just gives you 30 ms.
 *
 * Test Results:
 * - Moto X 2nd Gen (Android 5): Rejects [7.5, 10], accepts [7.5, 15] at 15 ms.
 *   Requires a delay between updating the parameter and querying it for the change to take effect.
 */
export declare class BLEConnectionOptimizer {
    private platform;
    private attempt;
    constructor(platform: Platform);
    optimizeConnection(device: IOTileDevice, adapter: AbstractIOTileAdapter, maxAttempts?: number): Promise<any>;
}
