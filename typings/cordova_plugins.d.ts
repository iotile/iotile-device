///<reference path="cordova_ble.d.ts"/>

import {MockFileTransfer, Entry} from "ng-iotile-app/mocks/mock-filesystem";

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
		resolveLocalFileSystemURL: (path: string, successCallback: (entry: Entry) => void, errorCallback: (any) => void) => void;
		FileTransfer: typeof MockFileTransfer;
		StatusBar: any;
		ionic: IonicStatic;
		plugins: any;
	}
}
