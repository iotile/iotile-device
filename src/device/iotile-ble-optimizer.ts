/**
 * An automated connection plugin that searches for the best BLE connection
 * interval to use for each phone model.  It runs on connection with all
 * ble devices and tries to find the fastest connection interval that the
 * phone will support.
 * 
 * This will only work on devices with firmware that support the ble_query
 * and ble_update 
 */

import {IOTileDevice, BLEConnectionInfo} from "./iotile-device";
import {AbstractIOTileAdapter} from "./iotile-base-types";
import {delay} from "@iotile/iotile-common";
import {UserRedirectionInfo, Platform} from "../common/iotile-types";
import {catBLEOptimizer} from "../config";

interface ConnectionUpdate {
    minInterval: number; // ms
    maxInterval: number; // ms
    timeout: number;     // ms
};

interface ConnectionUpdateStep {
    preupdateWait: number; // ms
    update: ConnectionUpdate;
}

interface PlatformStrategy {
    steps: ConnectionUpdateStep[];
}

type MobilePlatform = "ios" | "android";

const IOS_STRATEGY: PlatformStrategy = {
    steps: [
        {
            preupdateWait: 180,
            update: {
                minInterval: 15,
                maxInterval: 15,
                timeout: 1000
            }
        }
    ]
};

const ANDROID_STRATEGY: PlatformStrategy = {
    steps: [
        {
            preupdateWait: 300,
            update: {
                minInterval: 7.5,
                maxInterval: 10,
                timeout: 1000
            }
        },

        {
            preupdateWait: 0,
            update: {
                minInterval: 7.5,
                maxInterval: 15,
                timeout: 1000
            }
        },

        {
            preupdateWait: 0,
            update: {
                minInterval: 7.5,
                maxInterval: 30,
                timeout: 1000
            }
        }
    ]
};

const UPDATE_STRATEGIES: {[key: number]: PlatformStrategy} = {
    [Platform.IOS]: IOS_STRATEGY,
    [Platform.Android]: ANDROID_STRATEGY
 };

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
export class BLEConnectionOptimizer {
    private platform: Platform;
    private attempt: number;

    constructor(platform: Platform) {
        this.platform = platform;
        this.attempt = 0;
    }

    public async optimizeConnection(device: IOTileDevice, adapter: AbstractIOTileAdapter, maxAttempts: number = 4): Promise<any> {
        let info: BLEConnectionInfo;
        this.attempt = 0;

        if (!(this.platform in UPDATE_STRATEGIES)) {
            catBLEOptimizer.warn(`Unknown platform '${this.platform}' in optimizeConnection, not optimizing`);
            return null;
        }

        try {
            info = await device.queryBLEConnectionInfo();
        } catch (err) {
            catBLEOptimizer.info("Not optimizing BLE connection on old device that does not support the required RPCs.");
            catBLEOptimizer.info(JSON.stringify(err));
            return null;
        }

        let strategy: PlatformStrategy = UPDATE_STRATEGIES[this.platform];

        if (strategy.steps.length > 0 && info.intervalMS <= strategy.steps[0].update.maxInterval) {
            catBLEOptimizer.info(`No optimization required, default interval: ${info.intervalMS} ms`);
            return null;
        }

        catBLEOptimizer.info(`Running ${this.platform} strategy, starting interval: ${info.intervalMS} ms`);

        try {
            for (let step of strategy.steps) {
                if (step.preupdateWait > 0) {
                    await delay(step.preupdateWait);
                }

                catBLEOptimizer.info(`Attempting to set interval [${step.update.minInterval}, ${step.update.maxInterval}], attempt: ${this.attempt}`);
                let updateErr = await device.updateBLEParams(step.update.minInterval, step.update.maxInterval, step.update.timeout);
                this.attempt += 1;
                await delay(300);  //Make sure we have time for the update take effect

                // If the BLE stack is too busy, back off and try again
                if (updateErr == 17) {
                    catBLEOptimizer.warn(`BLE stack busy, trying step again. Interval [${step.update.minInterval}, ${step.update.maxInterval}], attempt: ${this.attempt}`);
                    await delay(300);
                    let updateErr = await device.updateBLEParams(step.update.minInterval, step.update.maxInterval, step.update.timeout);
                    this.attempt += 1;

                    if (updateErr !== 0) {
                        catBLEOptimizer.error(`Could not update ble connection after backing off 300 ms due to a busy BLE stack: error = ${updateErr}`, null);
                        return null;
                    }
                } else if (updateErr) {
                    catBLEOptimizer.error(`Unexpected error optimizing BLE connection: error code = ${updateErr}`, null);
                    return null;
                }

                info = await device.queryBLEConnectionInfo();

                if (info.intervalMS <= step.update.maxInterval) {
                    catBLEOptimizer.info(`Successfully optimized BLE connection interval to ${info.intervalMS} ms`);
                    return null;
                }
            }
        } catch (err) {
            catBLEOptimizer.error(`Unexpected error optimizing BLE connection ${err}`, err);
            return null;
        }

        // If we got here we exhausted all of our ble update strategy steps
        // This is not necessarily unexpected on some devices.  In particular on some iphones,
        // they will not allow BLE connection intervals < 30 ms no matter what unless you are
        // a HID device.
        catBLEOptimizer.warn(`Unable to achieve target BLE interval range, final interval: ${info.intervalMS} ms`);
        return null;
    }
}