import * as Devices from "./devices";
import {MockBLEDevice} from "./mock-ble-device";
import {catMockBLE} from "../config";

export class MockBleService {
  devices: MockBLEDevice[];
  scanInfo: {inProgress: boolean, discoveryTimer: any};
  connectionInfo: any;
  Config: any;

  constructor (Config: any) {
    /* Implementation */
    this.devices = [];
    this.Config = Config; 

    catMockBLE.info(Config.BLE.MOCK_BLE_DEVICES);
    for (var devID in Config.BLE.MOCK_BLE_DEVICES) {
      let knownDevices: {[key: string]: any} = {
        'nfc300': Devices.NFC300,
        'soilmoisture': Devices.SoilMoisturePOD,
        'temperature': Devices.TemperaturePOD, 
        'stream_test': Devices.StreamTestDevice
      }

      let constructor = knownDevices[Config.BLE.MOCK_BLE_DEVICES[devID].type];
      let device: MockBLEDevice = new constructor(devID, Config.BLE.MOCK_BLE_DEVICES[devID].args);
      this.devices.push(device);
    }

    catMockBLE.info('Created ' + this.devices.length + ' fake devices');

    this.scanInfo = {'inProgress': false, 'discoveryTimer': null};
    this.connectionInfo = {'inProgress': false, 'connected': false, 'device': null};
  }

  // eslint-disable-next-line no-unused-vars
  public isEnabled (yesCallback: any, noCallback: any) {
    setTimeout(yesCallback, 0);
  }

  /* Call the success function every 500 ms with a device from the devices list */
  public startScan (services: any, success: any, failure: any) {
    var i = 0;

    if (this.scanInfo.inProgress) {
      catMockBLE.error('startScan called twice without stopScan being called in between', Error);
      setTimeout(failure, 10);
      return;
    }

    this.scanInfo.inProgress = true;
    var that = this;

    function discoverFunction () {
      that.scanInfo.discoveryTimer = null;

      if (!that.scanInfo.inProgress) {
        catMockBLE.error('discover callback triggered outside of scanning period.  This is probably a race condition.', Error);
        return;
      }

      for(i=0; i<that.devices.length; ++i) {
        success(that.devices[i]);
      }
    }

    this.scanInfo.discoveryTimer = setTimeout(discoverFunction, this.Config.BLE.MOCK_BLE_SCAN_DELAY);
  }

  // eslint-disable-next-line no-unused-vars
  public stopScan (success: any, failure: any) {
    if (!this.scanInfo.inProgress) {
      catMockBLE.error('stopScan called without startScan first being called.', Error);
      return;
    }

    if (this.scanInfo.discoveryTimer !== null) {
      clearTimeout(this.scanInfo.discoveryTimer);
      this.scanInfo.discoveryTimer = null;
    }

    this.scanInfo.inProgress = false;

    if (success) {
      setTimeout(success, 0);
    }
  }

  public connect (deviceID: number, success: any, failure: any) {
    if (this.connectionInfo.connected || this.connectionInfo.inProgress) {
      catMockBLE.error('Connect called twice', Error);
      setTimeout(function () {
        failure('Connect called twice to id: ' + deviceID);
      }, 20);

      return;
    }

    for (var i = 0; i < this.devices.length; ++i)  {
      if (this.devices[i].device.iotileID === deviceID) {
        if (this.devices[i].connected) {
          setTimeout(function () {failure('Connect called on device with other connected: ' + deviceID);}, 20);
        } else {
          var that = this;
          setTimeout(function () {that.finishConnection(success);}, that.Config.BLE.MOCK_BLE_SCAN_DELAY);

          this.connectionInfo.inProgress = true;
          this.connectionInfo.device = this.devices[i];
          this.connectionInfo.disconnected = failure;
        }
        break;
      }
    }

    //If none of our devices matched, notify that we couldn't find the device
    if (!this.connectionInfo.inProgress) {
      setTimeout(function () {
        failure('Could not find device by id: ' + deviceID);
      }, 20);
    }
  }

  public finishConnection (callback: any) {
    if (!this.connectionInfo.inProgress) {
      catMockBLE.error('finishConnection called in invalid state.', Error);
    }

    this.connectionInfo.inProgress = false;
    this.connectionInfo.connected = true;

    callback(this.connectionInfo.device);
  }

  public isConnected (deviceID: number, success: any, failure: any) {
    if (this.connectionInfo.connected && this.connectionInfo.device.id === deviceID) {
      setTimeout(success, 0);
    }
    else {
      setTimeout(failure, 0);
    }
  }

  public disconnect (deviceID: number, success: any, failure: any) {
    if (this.connectionInfo.connected && this.connectionInfo.device.id === deviceID) {
      this.connectionInfo.device.disconnect(success);
      this.connectionInfo.connected = false;
      this.connectionInfo.device = null;
    }
    else {
      setTimeout(failure, 0);
    }
  }

  public force_disconnect() {
    if (this.connectionInfo.connected) {
      this.connectionInfo.disconnected("Unexpected disconnection");

      this.disconnect(this.connectionInfo.device.id, function () {}, function () {});
    }
  }

  public write (deviceID: number, serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any) {
    if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
      setTimeout(failure, 10);
      return;
    }

    this.connectionInfo.device.write(serviceID, charID, value, success, failure);
  }

  public writeWithoutResponse (deviceID: number, serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any) {
    if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
      setTimeout(failure, 10);
      return;
    }

    this.connectionInfo.device.write(serviceID, charID, value, success, failure);
  }

  public startNotification (deviceID: number, serviceID: string, charID: string, success: any, failure: any) {
    if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
      setTimeout(failure, 10);
      return;
    }

    this.connectionInfo.device.subscribe(serviceID, charID, success, failure);
  }

  public stopNotification (deviceID: number, serviceID: string, charID: string, success: any, failure: any) {
    if ((!this.connectionInfo.connected) || this.connectionInfo.device.id !== deviceID) {
      setTimeout(failure, 10);
      return;
    }

    this.connectionInfo.device.unsubscribe(serviceID, charID, success, failure);
  }
}
