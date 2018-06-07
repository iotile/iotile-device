///<reference path="cordova_ble.d.ts"/>

import {} from "./iotile_utils";

interface Raven {
	setUserContext: ({}) => void;
	captureException: (message: any) => void;
	config: (url:string, options: {[key: string]: any}) => any;
}
declare global {
	interface Window {
		ble: CordovaBLECentral;
		device: any;
		fabric: any;
		cordova: any;
		Raven: Raven;
		resolveLocalFileSystemURL: (path: string, successCallback: (entry: any) => void, errorCallback: (any: any) => void) => void;
		FileTransfer: any;
		StatusBar: any;
		ionic: any;
		plugins: any;
	}
}
