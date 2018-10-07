import { IOTileAdvertisement } from "./advertisement";
import { DeviceAdapter, DeviceAdapterEvent, DeviceAdapterConfig } from "./device-adapter";
import { ArgumentError, delay } from "iotile-common";


const DEFAULT_EXPIRATION_TIME = 30; //By default, expire devices after 30 seconds

interface StoredAdvertisement {
    adapterID: number;
    lastSeen: Date;
    expirationTime: Date;
    advertisement: IOTileAdvertisement;
};

interface StoredAdapter {
    removeCallback: () => void;
    adapter: DeviceAdapter;
}


/**
 * This class will keep track of advertisements from a DeviceAdapter, maintaining an up to date list.
 * 
 * Since DeviceAdapters send advertisements via callback as they are discovered and these advertisements
 * have a validity period before they expire, this class handles keeping an up to date list of all of
 * the currently valid device advertisements.  It autoexpires old advertisements in the background.
 * 
 * The main way to interact with this class is to register an onDeviceFound and onDeviceLost callback
 * that will be called whenever a new device is seen and expires (respectively).  
 * 
 * You can also poll for the current list of devices by calling listDevices() and you can force clear
 * all devices by call clearDevices().
 */
export class AdvertisementAccumulator {
    private devices: {[key: string]: StoredAdvertisement};
    private adapters: {[key: number]: StoredAdapter};

    public onDeviceFound: (advert: IOTileAdvertisement) => void;
    public onDeviceLost: (advert: IOTileAdvertisement) => void;

    constructor() {
        this.devices = {};
        this.adapters = {};

        this.onDeviceFound = (advert) => {};
        this.onDeviceLost = (advert) => {};

        this.launchExpiryTask(1000);
    }

    public addAdapter(adapter: DeviceAdapter) {
        let adapterID = adapter.adapterID;

        if (adapterID in this.adapters) {
            throw new ArgumentError(`Adding DeviceAdapter with id ${adapterID} twice to AdvertisementAccumulator, class=${adapter.adapterClass}, name=${adapter.adapterName}`);
        }

        let removeHandler = adapter.addCallback(DeviceAdapterEvent.DeviceSeen, (event, advert) => {
            let expirationDelta = adapter.getConfig(DeviceAdapterConfig.ExpirationTime, DEFAULT_EXPIRATION_TIME) as number;
            this.handleAdvertisement(adapterID, expirationDelta, advert);
        });

        this.adapters[adapterID] = {adapter: adapter, removeCallback: removeHandler};
    }

    public removeAdapter(adapter: DeviceAdapter | number) {
        if (adapter instanceof DeviceAdapter) {
            adapter = adapter.adapterID;
        }

        if (adapter in this.adapters) {
            this.adapters[adapter].removeCallback();
            delete this.adapters[adapter];
        }

        /*
         * Also make sure to clean up any remaining advertisements that pertained to this adapter.
         */
        for (let slug in this.devices) {
            if (this.devices[slug].adapterID == adapter) {
                let advert = this.devices[slug].advertisement;
                
                //Notify after delete so if someone gets a list in the callback the device will not be there
                delete this.devices[slug];
                this.onDeviceLost(advert);
            }
        }
    }

    public listDevices(): IOTileAdvertisement[] {
        let adverts = [];

        for (let slug in this.devices)
            adverts.push(this.devices[slug].advertisement);
        
        return adverts;
    }

    public clearDevices() {
        for (let slug in this.devices) {
            let advert = this.devices[slug].advertisement;
            
            //Notify after delete so if someone gets a list in the callback the device will not be there
            delete this.devices[slug];
            this.onDeviceLost(advert);
        }
    }

    public handleAdvertisement(adapterID: number, expiryDelta: number, advert: IOTileAdvertisement) {
        let now = new Date();
        let expirationTime = new Date(now.getTime() + expiryDelta*1000);
        let isNew = !(advert.slug in this.devices);

        let stored = {
            adapterID: adapterID,
            lastSeen: now,
            expirationTime: expirationTime,
            advertisement: advert
        };
        
        this.devices[advert.slug] = stored;
        if (isNew)
            this.onDeviceFound(advert);
    }

    public removeExpiredDevices() {
        let now = new Date();

        for (let slug in this.devices) {
            if (this.devices[slug].expirationTime < now) {
                let advert = this.devices[slug].advertisement;
                
                //Notify after delete so if someone gets a list in the callback the device will not be there
                delete this.devices[slug];
                this.onDeviceLost(advert);
            }
        }
    }

    protected async launchExpiryTask(checkInterval: number) {
        while (true) {
            try {
                this.removeExpiredDevices();
                await delay(checkInterval);
            } catch (err) {
                // We want to make sure this background task never dies.
            }
        }
    }
}