import {delay} from "iotile-common";
import {IOTileAdapter, AdapterState, catAdapter} from "../../src/iotile-device";
import  {Platform, AdapterEvent, IOTileCharacteristic} from "../../src/common/iotile-types";
import {setupMockBLE, findByDeviceID} from "../../src/iotile-device";
import {createIndividualReport, expectIndividual, createSequentialReport, createHashListReport, createReading, expectSequential} from "../../src/iotile-device";
import { BasicNotificationService } from "../../src/common/notification-service";

describe('module: iotile.device, service: IOTileDeviceService', function () {
  let Adapter: IOTileAdapter;
  let Config;

  beforeEach(function () {
    let config = {
        BUILD: {
            VERSION: "1.1.0"
        },

        ENV: {
            DB_NAME: "test"
        }
    }
    
    Config = config;

    setupMockBLE(config);

    spyOn(catAdapter, 'info').and.returnValue('');
    spyOn(catAdapter, 'error').and.returnValue('');
    spyOn(catAdapter, 'debug').and.returnValue('');

    let notification = new BasicNotificationService();

    Adapter = new IOTileAdapter(config, notification, Platform.Android);
  });

  it('should scan for a fixed period of time', async function (done) {
    let start = new Date().getTime() / 1000;
    let devices = await Adapter.scan(1.1);
    let end = new Date().getTime() / 1000;

    expect(end-start).toBeGreaterThan(1);
    expect(devices.length).toBeGreaterThan(0);

    done();
  })

  it('should broadcast start and stop scanning events', async function (done) {
    //Make sure the proper events are broadcast
    spyOn(Adapter.notification, 'notify').and.callThrough();

    let startedHandler = Adapter.subscribe(AdapterEvent.ScanStarted, function(event: string, data: any) {
      expect(data).toBeUndefined;
    });

    let finishedHandler = Adapter.subscribe(AdapterEvent.ScanFinished, function(event: string, data: any) {
      expect(data.count).toBe(7);
    });

    let devices = await Adapter.scan(0);
    expect(devices.length).toBe(7);

    let dev1 = devices[0];
    let dev2 = devices[5];
    expect(dev1.deviceID).toBe(3);
    expect(dev1.flags.otherConnected).toBe(false);

    expect(dev2.deviceID).toBe(8);
    expect(dev2.flags.otherConnected).toBe(true);

    expect(Adapter.notification.notify).toHaveBeenCalledWith('adapter_scanstarted', {});
    expect(Adapter.notification.notify).toHaveBeenCalledWith('adapter_scanfinished', {count: 7});

    startedHandler();
    finishedHandler();

    done();
  })

  it('should connect to a device', async function (done) {
    let devices = await Adapter.scan(0);

    let dev1 = devices[0];
    let connectedDevice = await Adapter.connect(dev1, {noStreamInterface: true, noRPCInterface: true});
    expect(connectedDevice).toBeDefined();
    expect(Adapter.state).toBe(AdapterState.Connected);

    done();
  })

  it('should not connect to a device that has another connected', async function (done) {
    let devices = await Adapter.scan(0);
    let dev2 = devices[5];

    try {
      let connectedDevice = await Adapter.connect(dev2, {noStreamInterface: true, noRPCInterface: true});
      expect(false).toBe(true);
    } catch(err) {
      expect(err).toBeDefined();
    }

    done();
  })

  it('should notify on connection successful', async function (done) {
    let devices = await Adapter.scan(0);

    spyOn(Adapter.notification, 'notify').and.callThrough();

    let connectedHandler = Adapter.subscribe(AdapterEvent.Connected, function(event: string, data: any) {
      expect(data.device).toBeDefined();
      expect(data.device.advertisement).toBe(devices[0]);
    });

    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});

    expect(Adapter.notification.notify).toHaveBeenCalledWith('adapter_connected', {device: Adapter.connectedDevice});

    connectedHandler();
    done();
  })

  it('should disconnect synchronously', async function (done) {
    let devices = await Adapter.scan(0);

    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});
    await Adapter.disconnect();

    expect(Adapter.state).toBe(AdapterState.Idle);

    done();
  })

  it ('should allow disconnecting gratuitously', async function (done) {
    await Adapter.disconnect();

    done();
  })

  it ('should propagate unexpected disconnect events', async function (done) {
    let devices = await Adapter.scan(0);

    spyOn(Adapter.notification, 'notify').and.callThrough();

    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});

    window.ble.force_disconnect();
    await delay(50);

    expect(Adapter.notification.notify).toHaveBeenCalledWith('adapter_disconnected', {device: connectedDevice});
    expect(Adapter.state).toBe(AdapterState.Idle);

    done();
  })

  it ('should allow callbacks to be registered on a characteristic', async function (done) {
    let devices = await Adapter.scan(0);
    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});
    
    let handler1ID = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
      //This should be done after 1 second since our test devices send a 1 second streaming update
      expect(data.byteLength).toBe(20);
      done();
    });
  })

  it ('should allow multiple callbacks to be registered on a characteristic', async function (done) {
    let devices = await Adapter.scan(0);
    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});

    let handler1ID = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
      //This should be done after 1 second since our test devices send a 1 second streaming update
      expect(data.byteLength).toBe(20);
    });

    let handler2ID = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
      //This should be done after 1 second since our test devices send a 1 second streaming update
      expect(data.byteLength).toBe(20);
      done();
    });
  })

  it ('should allow removing callbacks registered on a characteristic', async function (done) {
    let devices = await Adapter.scan(0);
    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});

    let removeHandler1 = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
    });

    let removeHandler2 = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
      //This should be done after 1 second since our test devices send a 1 second streaming update
      expect(data.byteLength).toBe(20);
      done();
    });

    await removeHandler1();
  })

  it ('should unsubscribe when no callbacks are registered', async function (done) {
    spyOn(window.ble, 'startNotification').and.callThrough();
    spyOn(window.ble, 'stopNotification').and.callThrough();

    let devices = await Adapter.scan(0);
    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true, noRPCInterface: true});

    
    let removeHandler1 = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
    });

    let removeHandler2 = await Adapter.addNotificationListener(IOTileCharacteristic.Streaming, function (data) {
    });

    await removeHandler1();
    await removeHandler2();

    expect(window.ble.startNotification).toHaveBeenCalledTimes(1);
    expect(window.ble.stopNotification).toHaveBeenCalledTimes(1);

    done();
  })

  it ('should open the RPC interface on connect', async function (done) {
    spyOn(window.ble, 'startNotification').and.callThrough();
    spyOn(window.ble, 'stopNotification').and.callThrough();

    let devices = await Adapter.scan(0);
    let connectedDevice = await Adapter.connect(devices[0], {noStreamInterface: true});

    expect(window.ble.startNotification).toHaveBeenCalledTimes(2);

    done();
  })

  /**
   * stream_test device streams two items on connect: 1 individual reading and 1 robust report 
   */
  it ('should broadcast events on receiving stream data', async function (done) {
    let devices = await Adapter.scan(0);
    let receivedRobust = false;

   let readingHandler = Adapter.subscribe(AdapterEvent.RawRealtimeReading, function(event: string, data: any) {
      expectIndividual(data, 9, 'unbuffered node 11', 1, 0, 0);
      
      if (receivedRobust) {
        done();
      } else {
        done.fail("Expected a robust report and did not receive it before receiving an individual one");
      }
    });

    let reportHandler = Adapter.subscribe(AdapterEvent.RawRobustReport, function(event: string, data: any) {
      receivedRobust = true;
    });

    let dev = findByDeviceID(9, devices);

    if (dev === null) {
      done.fail("Could not find stream test device to run event broadcast test");
      return;
    }
    
    try {
        let connectedDevice = await Adapter.connect(dev, null);
    } catch (err) {
      done.fail(err);
    }

    readingHandler();
    reportHandler();
  })
});
