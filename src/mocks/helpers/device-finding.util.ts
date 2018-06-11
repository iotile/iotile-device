/**
 * Helper functions for finding specific mock devices to test with
 */
import {IOTileAdvertisement} from "../../device/iotile-advert-serv";

export function findByDeviceID(id: number, devices: IOTileAdvertisement[]) {
    let i = 0;

    for (i = 0; i < devices.length; ++i) {
      if (devices[i].deviceID === id) {
        return devices[i];
      }
    }

    if (i == devices.length) {
      return null;
    }
}
