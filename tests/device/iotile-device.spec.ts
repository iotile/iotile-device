import {IOTileDevice, StreamerInfo, ReceiveReportsOptions, ReceiveReportsResult, Config} 
    from "../../src/device/iotile-device";
import {IOTileAdvertisement}  from "../../src/device/iotile-advert-serv";
import {IOTileAdapter}  from "../../src/device/iotile-serv";
import  {Platform, AdapterEvent, IOTileCharacteristic} from "../../src/common/iotile-types";
import {catAdapter, catBLEOptimizer, catService} from "../../src/config";
import {setupMockBLE} from "../../src/mocks/helpers/mock-ble-setup";
import { BasicNotificationService } from "../../src/common/notification-service";
import {createIndividualReport, expectIndividual, createSequentialReport, createReading, expectSequential} from "../../src/mocks/helpers/report-creation.util";

describe('module: iotile.device, IOTileDevice', function () {
    let device: IOTileDevice;
    let adapter;
    let advert;

    beforeEach(function () {
        adapter = {};
        advert = {};

        device = new IOTileDevice(adapter, advert);
        // @ts-ignore
        device.adapter.typedRPC = function(){};
    });

    // TODO
    it('should correctly receive reports from specified streamers', async function() {
        expect(true).toBeTruthy();

        let options: ReceiveReportsOptions;
        options = { expectedStreamers: {0:'Environmental', 1:'System', 2:'Trip'},
                                  requireAll: true };

        // // CHECKME: streamer names for above
        // let report1 = createSequentialReport(1, 'output 1', 100, 0);
        // let report2 = createSequentialReport(1, 'output 2', 100, 1);
        // let report3 = createSequentialReport(1, 'output 3', 100, 2);
        
        // // ugh also you'll need to make the relevant rpc spies

        // let results = await device.receiveReports(options);
        // expect(results.reports).toBeDefined();
        // expect(results.reports.length).toEqual(3);
        // expect(results.receivedFromAll).toBeTruthy();
        // expect(results.receivedExtra).toBeFalsy();

    });
});