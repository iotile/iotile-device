import * as Errors from "iotile-common";
import * as Utilities from "iotile-common";
import * as IOTileDeviceModule from "../../src/iotile-device";
import * as IOTileTypes from "../../src/common/iotile-types";
import {IOTileRPCInterface} from "../../src/device/iotile-iface-rpc";
import {createIndividualReport, expectIndividual, createSequentialReport, createHashListReport, createReading, expectSequential} from "../../src";

describe('module: iotile.device, class: IOTileRPCInterface', function () {
  let iface: IOTileRPCInterface;
  let channel: any;
  let autoResponseChannel: any;
  let fatalErrorChannel: any;

  let lastHeader: ArrayBuffer;
  let lastPayload: ArrayBuffer;

  let payloadHandler;
  let headerHandler;


  beforeEach(function() {
    payloadHandler = null;
    headerHandler = null;

    iface = new IOTileRPCInterface();
    channel = {
        write: async function (char, value) {

        },

        subscribe: async function(char, handler) {
            if (char === IOTileTypes.IOTileCharacteristic.ReceivePayload) {
                payloadHandler = handler;
            } else if (char === IOTileTypes.IOTileCharacteristic.ReceiveHeader) {
                headerHandler = handler;
            } else {
                console.log('Char in subscribe: ' + char);
                console.log('handler in subscribe: ' + handler);
            }
        },

        notify: jasmine.createSpy('NotifyEvent')
    };

    //Auto response to all RPCs with success and no data
    autoResponseChannel = {
        write: async function (char, value) {
          if (char == IOTileTypes.IOTileCharacteristic.SendHeader) {
            headerHandler(Utilities.packArrayBuffer("BBBB", 1 << 6, 0, 0, 0));
          }
        },

        subscribe: async function(char, handler) {
            if (char === IOTileTypes.IOTileCharacteristic.ReceivePayload) {
                payloadHandler = handler;
            } else if (char === IOTileTypes.IOTileCharacteristic.ReceiveHeader) {
                headerHandler = handler;
            } else {
                console.log('Char in subscribe: ' + char);
                console.log('handler in subscribe: ' + handler);
            }
        },

        notify: jasmine.createSpy('NotifyEvent')
    };

    //Auto response to all RPCs with a fatal error
    fatalErrorChannel = {
        write: async function (char, value) {
          if (char == IOTileTypes.IOTileCharacteristic.SendHeader) {
            headerHandler(Utilities.packArrayBuffer("BBB", 1 << 6, 0, 0));
          }
        },

        subscribe: async function(char, handler) {
            if (char === IOTileTypes.IOTileCharacteristic.ReceivePayload) {
                payloadHandler = handler;
            } else if (char === IOTileTypes.IOTileCharacteristic.ReceiveHeader) {
                headerHandler = handler;
            } else {
                console.log('Char in subscribe: ' + char);
                console.log('handler in subscribe: ' + handler);
            }
        },
        
        notify: jasmine.createSpy('NotifyEvent')
    };
  });

  it('should subscribe on open', async function(done) {
    spyOn(channel, 'subscribe').and.callThrough();

    await iface.open(channel);
    expect(channel.subscribe).toHaveBeenCalledTimes(2);
    expect(channel.subscribe).toHaveBeenCalledWith(IOTileTypes.IOTileCharacteristic.ReceivePayload, jasmine.any(Function));
    expect(channel.subscribe).toHaveBeenCalledWith(IOTileTypes.IOTileCharacteristic.ReceiveHeader, jasmine.any(Function));

    expect(typeof headerHandler).toBe('function');
    expect(typeof payloadHandler).toBe('function');
    done();
  });

  it ('should correctly return a payload', async function (done) {
      await iface.open(channel);

      let responsePromise = iface.rpc(8, 0x1000, new ArrayBuffer(0));
      headerHandler(Utilities.packArrayBuffer("BBBB", 1 << 7 | 1 << 6, 0, 0, 8));
      payloadHandler(Utilities.packArrayBuffer("LL", 1, 2));

      responsePromise.then(function (payload) {
          expect(payload.byteLength).toBe(8);
          let values = Utilities.unpackArrayBuffer("LL", payload);
          expect(values[0]).toBe(1);
          expect(values[1]).toBe(2);

          done();
      }).catch(function (err) {
          done.fail(err.message);
      });
  })

  it ('should truncate the payload to the encoded length', async function (done) {
      await iface.open(channel);

      let responsePromise = iface.rpc(8, 0x1000, new ArrayBuffer(0));
      headerHandler(Utilities.packArrayBuffer("BBBB", 1 << 7 | 1 << 6, 0, 0, 8));
      payloadHandler(Utilities.packArrayBuffer("LLLL", 1, 2, 3, 4));

      responsePromise.then(function (payload) {
          expect(payload.byteLength).toBe(8);
          let values = Utilities.unpackArrayBuffer("LL", payload);
          expect(values[0]).toBe(1);
          expect(values[1]).toBe(2);

          done();
      }).catch(function (err) {
          done.fail(err.message);
      });
  })

  xit ('should fail an RPC if it times out', async function (done) {
      await iface.open(channel);

      try {
        await iface.rpc(8, 0x1000, new ArrayBuffer(0), 0);

        done.fail('No error thrown and timeout error expected')
      } catch (err) {
        expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.UnexpectedRPCTimeout);
        expect(iface.stoppedFromErrors).toBe(true);
        expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.UnexpectedRPCTimeout);
        done();
      } 
  })

  it ('should fail when receiving a payload with no header', async function (done) {
    await iface.open(channel);

    let promise = iface.rpc(8, 0x1000, new ArrayBuffer(0), .050);
    payloadHandler(Utilities.packArrayBuffer("LLLL", 1, 2, 3, 4));

    promise.then(function (value) {
        done.fail('No error thrown and timeout error expected');
    }).catch (function (err) {
        expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.ResponseReceivedAtInvalidTime);
        expect(iface.stoppedFromErrors).toBe(true);
        expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.ResponseReceivedAtInvalidTime);
        done();
      });
  })

  it ('should fail when receiving a too-small payload response', async function (done) {
    await iface.open(channel);

    let promise = iface.rpc(8, 0x1000, new ArrayBuffer(0), .050);
    headerHandler(Utilities.packArrayBuffer("BBBB", 1 << 7 | 1 << 6, 0, 0, 8));
    payloadHandler(new ArrayBuffer(0));

    promise.then(function (value) {
        done.fail('No error thrown and payload error expected');
    }).catch (function (err) {
        expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.IncorrectReceivedLength);
        expect(iface.stoppedFromErrors).toBe(true);
        expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.IncorrectReceivedLength);
        done();
      });
  })

  xit ('should timeout when receiving no payload response', async function (done) {
    await iface.open(channel);

    let promise = iface.rpc(8, 0x1000, new ArrayBuffer(0), .050);
    headerHandler(Utilities.packArrayBuffer("BBBB", 1 << 7 | 1 << 6, 0, 0, 8));

    promise.then(function (value) {
        done.fail('No error thrown and payload error expected');
    }).catch (function (err) {
        expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.UnexpectedRPCTimeout);
        expect(iface.stoppedFromErrors).toBe(true);
        expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.UnexpectedRPCTimeout);
        done();
      });
  })

  xit ('should fail additional RPCs after a fatal error', async function (done) {
      await iface.open(channel);

      try {
        await iface.rpc(8, 0x1000, new ArrayBuffer(0), 0);

        done.fail('No error thrown and timeout error expected');
      } catch (err) {
        
      }

      expect(iface.stoppedFromErrors).toBe(true);
      expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.UnexpectedRPCTimeout);

      try {
        await iface.rpc(8, 0x1000, new ArrayBuffer(0), .1);

        done.fail('No error thrown and queue should be stopped from errors');
      } catch (err) {
        expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.StoppedFromPreviousErrors);
        done();
      }
  })

  it ('should be able to use the autoResponseChannel', async function (done) {
    await iface.open(autoResponseChannel);

    try {
      await iface.rpc(8, 0x1000, new ArrayBuffer(0));

      expect(iface.stoppedFromErrors).toBe(false);
      expect(iface.lastError).toBe(IOTileDeviceModule.RPCError.OK);
      done();
    } catch (err) {
      done.fail(err.message);
    }
  })

  it ('should queue rpcs', async function (done) {
    await iface.open(autoResponseChannel);

    let promises = [];
    //Queue up 4 calls
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));

    try {
      await Promise.all(promises);
      
      done();
    } catch (err) {
      done.fail(err.message);
    }
  })

  it ('should fail all rpcs in queue on failure', async function (done) {
    await iface.open(fatalErrorChannel);

    let promises = [];
    //Queue up 4 calls
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));

    try {
      await promises[0]; //should fail with a protocol error
      
      done.fail();
    } catch (err) {
      expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.IncorrectReceivedLength);
    }

    try {
      await promises[1]; //should fail because we have stoppedFromErrors == true 
      
      done.fail();
    } catch (err) {
      expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.StoppedFromPreviousErrors);
    }

    try {
      await promises[2]; //should fail
      
      done.fail();
    } catch (err) {
      expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.StoppedFromPreviousErrors);
    }

    try {
      await promises[3]; //should fail
      
      done.fail();
    } catch (err) {
      expect(err.errorCode).toBe(IOTileDeviceModule.RPCError.StoppedFromPreviousErrors);
    }

    done();
  })

  it ('should notify when rpc processing fails', async function (done) {
    await iface.open(fatalErrorChannel);

    let promises = [];
    //Queue up 4 calls
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));
    promises.push(iface.rpc(8, 0x1000, new ArrayBuffer(0)));

    try {
      await Promise.all(promises);
      done.fail('Should have failed');
    } catch (err) {
      expect(fatalErrorChannel.notify).toHaveBeenCalledTimes(1);
      expect(fatalErrorChannel.notify).toHaveBeenCalledWith(IOTileTypes.AdapterEvent.UnrecoverableRPCError, jasmine.any(Object));

      done();
    }
  })
});