declare type BLEProperty = "Read" | "Write" | "Notify" | "WriteWithoutResponse";

declare interface BLEDescriptor {
	uuid: string
}

declare interface BLECharacteristic {
	service: string,
	characteristic: string,
	properties: BLEProperty[],
	descriptors?: BLEDescriptor[]
}

declare interface BLEPeripheral {
	name: string,
	id: string,
	advertising: {},
	rssi: number,
	services: string[],
	characteristics: BLECharacteristic[]
}

declare class CordovaBLECentral {
	startScan(uuidList: string[], callback: (peripheral: any) => void): void;
	stopScan(resolve: () => void, reject: (reason: string) => void): Promise<void>;
	connect(bleDeviceID: any, resolve: (peripheral: BLEPeripheral) => void, reject: (reason: string) => void): Promise<void>;
	disconnect(bleDeviceID: any, resolve: () => void, reject: (reason: string) => void): Promise<void>;

	read(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer: ArrayBuffer) => void, failure: (string: string) => void): any;
	write(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, value: ArrayBuffer, success: () => void, failure: (string: string) => void): any;
	writeWithoutResponse(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, value: ArrayBuffer, success: () => void, failure: (string: string) => void): any;	
	
	startNotification(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer: ArrayBuffer) => void, failure: (string: string) => void): any;
	stopNotification(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer: ArrayBuffer) => void, failure: (string: string) => void): any;
	
	isEnabled(success: (any: any) => void, failure: (any: any) => void): any;
	isConnected(bleDeviceID: any, success: (any: any) => void, failure: (any: any) => void): any;
	//Only provided by mock BLE implementation for testing
	force_disconnect(): any;
}
