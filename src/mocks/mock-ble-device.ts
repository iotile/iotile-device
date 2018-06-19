import { VirtualDevice } from "./virtual-device";
import { RPCNotFound } from "./errors";

let RSSI = -50;
let VOLTAGE = 3.8;

export interface MockDeviceArgs {
  "appVersion": string,
  "appTag": number,
  "osTag": number,
  "osVersion": string,
  "hwVersion": string,
  "connected"?: boolean
}

export class MockBLEDevice {
  private advertising: ArrayBuffer | SharedArrayBuffer;
  public rssi: number;
  public connected: boolean;
  public id: number;
  private subscriptions: any;
  protected rpcs: any;
  private payload: ArrayBuffer;

  public device: VirtualDevice;
  
  public constructor(device: VirtualDevice, connected: boolean) {
    this.rssi = RSSI;
    this.device = device;

    this.subscriptions = {};
    this.rpcs = {};
    this.connected = connected;
    this.advertising = this.buildAdvertising(device.iotileID, VOLTAGE);
    this.id = device.iotileID;

    this.payload = new ArrayBuffer(0);
  }

  private buildAdvertising(uuid: number, voltage: number) {
    var adv = new Uint8Array(62);

    //BLE Flags
    adv[ 0] = 0x02;
    adv[ 1] = 0x01;
    adv[ 2] = 0x06;

    adv[ 3] = 0x11;
    adv[ 4] = 0x06;

    //16 byte service UUID
    adv[ 5] = 0x63;
    adv[ 6] = 0x0F;
    adv[ 7] = 0xF6;
    adv[ 8] = 0x0F;
    adv[ 9] = 0x2C;
    adv[10] = 0x13;
    adv[11] = 0x11;
    adv[12] = 0xE6;
    adv[13] = 0xBA;
    adv[14] = 0x53;
    adv[15] = 0xF7;
    adv[16] = 0x3F;
    adv[17] = 0x00;
    adv[18] = 0x20;
    adv[19] = 0x00;
    adv[20] = 0x00;

    //Company ID: 0x03C0
    adv[21] = 0x09;
    adv[22] = 0xFF;
    adv[23] = 0xC0;
    adv[24] = 0x03;

    //UUID
    adv[25] = (uuid >>  0) & 0xFF;
    adv[26] = (uuid >>  8) & 0xFF;
    adv[27] = (uuid >> 16) & 0xFF;
    adv[28] = (uuid >> 24) & 0xFF;

    //Flags
    adv[29] = 0;
    adv[30] = 0;

    if (this.connected) {
      adv[29] |= (1 << 2);
    }

    //Scan response data
    adv[31] = 0x1E;
    adv[32] = 0xFF;
    adv[33] = 0xC0;
    adv[34] = 0x03;
    adv[35] = Math.floor((voltage - Math.floor(voltage)) * 256);
    adv[36] = Math.floor(voltage);

    return adv.buffer;
  }

  public unsubscribe(serviceID: string, charID: string, success: any, failure: any) {
    if (!(serviceID in this.subscriptions)) {
      failure("Unknown service ID: " + serviceID);
    }

    if (!(charID in this.subscriptions[serviceID])) {
      failure("Unknown characteristic ID: " + charID);
    }

    if (charID === '2005') {
      if (this.device.controller){
        this.device.controller.disableStreaming();
      }
    }

    delete this.subscriptions[serviceID][charID];
    success();
  }

  public subscribe(serviceID: string, charID: string, success: any, failure: any) {
    if (!(serviceID in this.subscriptions)) {
      this.subscriptions[serviceID] = {};
    }

    if (!(charID in this.subscriptions[serviceID])) {
      this.subscriptions[serviceID][charID] = [];
    }

    this.subscriptions[serviceID][charID].push({'success': success, 'failure': failure});
    //If they subscribed to the streaming characteristic, start streaming
    if (charID === '2005') {
      if (this.device.controller){
        this.device.controller.enableStreaming(success);
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  public disconnect (success: any) {
    if (this.device.controller){
      this.device.controller.disableStreaming();
    }

    //Remove all subscriptions
    this.subscriptions = {};

    setTimeout(success, 0);
  }

  private notify (packet: any, charID: string) {
    if ('00002000-3FF7-53BA-E611-132C0FF60F63' in this.subscriptions) {
      var serv = this.subscriptions['00002000-3FF7-53BA-E611-132C0FF60F63'];

      if (charID in serv) {
        setTimeout(function () {
          for (var i = 0; i < serv[charID].length; ++i) {
            serv[charID][i].success(packet);
          }
        }, 0);
      }
    }
  }

  public write (serviceID: string, charID: string, value: ArrayBuffer, success: any, failure: any) {
    if ((serviceID !== '00002000-3FF7-53BA-E611-132C0FF60F63')) {
      failure('Unknown service in ble write' + serviceID);
      return;
    }

    success();

    if (charID === '2004') {
      this.payload = value;
      //Handle RPC command payload write
    }
    else if (charID === '2003') {
      this.rpc(value, this.payload);
    }
  }

  private async rpc (headerData: ArrayBuffer, payloadData: ArrayBuffer) {
    var header = new DataView(headerData);
    var parsedHeader = {
      address: header.getUint8(4),
      length: header.getUint8(0),
      sender: header.getUint8(1),
      command: header.getUint16(2, true)
    };

    var payload = payloadData.slice(0, parsedHeader.length);

    var status = 0xFF;
    let respPayload = new ArrayBuffer(0);

    try {
        respPayload = await this.device.rpc(parsedHeader.address, parsedHeader.command, payloadData);

        //Status is app defined so set app defined bit and set has data bit if we have data
        status = (1 << 6);
        if (respPayload.byteLength > 0) {
            status |= (1 << 7);
        }
    } catch (err) {
        //FIXME: Also catch other exceptions thrown during RPC execution
        if (err instanceof RPCNotFound) {
            status = 1;
        } else {
            throw err;
        }
    }


    var respHeaderData = new ArrayBuffer(4);
    var respHeader = new DataView(respHeaderData);

    respHeader.setUint8(0, status);
    respHeader.setUint8(3, respPayload.byteLength);
    this.notify(respHeaderData, '2001');

    if (respPayload.byteLength > 0) {
      this.notify(respPayload, '2002');
    }
  }
}
