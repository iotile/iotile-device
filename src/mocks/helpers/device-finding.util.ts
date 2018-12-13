/**
 * Helper functions for finding specific mock devices to test with
 */
import {IOTileAdvertisement} from "../../device/iotile-advert-serv";

export function findByDeviceID(id: number, devices: IOTileAdvertisement[]): IOTileAdvertisement | null {
    let i = 0;

    for (i = 0; i < devices.length; ++i) {
      if (devices[i].deviceID === id) {
        return devices[i];
      }
    }
    
    return null;
}
