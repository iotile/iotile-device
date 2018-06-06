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

	read(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer) => void, failure: (string) => void);
	write(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, value: ArrayBuffer, success: () => void, failure: (string) => void);
	writeWithoutResponse(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, value: ArrayBuffer, success: () => void, failure: (string) => void);	
	
	startNotification(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer) => void, failure: (string) => void);
	stopNotification(bleDeviceID: any, serviceUUID: any, characteristicUUID: any, success: (ArrayBuffer) => void, failure: (string) => void);
	
	isEnabled(success: (any) => void, failure: (any) => void);
	isConnected(bleDeviceID: any, success: (any) => void, failure: (any) => void);
	//Only provided by mock BLE implementation for testing
	force_disconnect();
}
