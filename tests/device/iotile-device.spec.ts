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
    let Config;
    let notification = new BasicNotificationService();
    let adapter: IOTileAdapter;
    let advert: IOTileAdvertisement;
    let device: IOTileDevice;

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
        spyOn(catService, 'error').and.returnValue('');
        spyOn(catAdapter, 'info').and.returnValue('');
        spyOn(catAdapter, 'error').and.returnValue('');
        spyOn(catAdapter, 'debug').and.returnValue('');
        spyOn(catBLEOptimizer, 'info').and.returnValue('');
        spyOn(catBLEOptimizer, 'error').and.returnValue('');
        spyOn(catBLEOptimizer, 'warn').and.returnValue('');

        adapter = new IOTileAdapter(config, notification, Platform.Android);
        // TODO
        //advert = ;

        device = new IOTileDevice(adapter, advert);
    });

    it('should correctly receive reports from specified streamers', async function() {
        let options: ReceiveReportsOptions;
        options = { expectedStreamers: {0:'Environmental', 1:'System', 2:'Trip'},
                                  requireAll: true };

        // CHECKME: streamer names for above
        let report1 = createSequentialReport(1, 'output 1', 100, 0);
        let report2 = createSequentialReport(1, 'output 2', 100, 1);
        let report3 = createSequentialReport(1, 'output 3', 100, 2);
        
        // ugh also you'll need to make the relevant rpc spies

        let results = await device.receiveReports(options);
        expect(results.reports).toBeDefined();
        expect(results.reports.length).toEqual(3);
        expect(results.receivedFromAll).toBeTruthy();
        expect(results.receivedExtra).toBeFalsy();

    });
});