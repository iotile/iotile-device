import * as Errors from "../common/error-space";
import * as IOTileTypes from "../common/iotile-types";
import {IOTileDevice, RemoteBridgeState} from "./iotile-device";
import {delay, ProgressNotifier} from "@iotile/iotile-common";

export class IOTileScriptInterface {
	private channel: IOTileTypes.BLEChannel | undefined;
	private device: IOTileDevice | undefined;

	public async open(device: IOTileDevice, channel: IOTileTypes.BLEChannel) {
		this.channel = channel;
		this.device = device;
	}

	public async send(script: ArrayBuffer, notifier: any) {
		if (this.channel && this.device){
			notifier.setTotal(Math.ceil(script.byteLength / 20) + 1);
		
		notifier.startOne("Preparing for firmware update", 1);
		let bridge = this.device.remoteBridge();
		let status = await bridge.queryStatus();

		/*
		 * There is a narrow window between when a script has been received and when it is triggered for 
		 * processing where starting a new script is disallowed.  If we find ourselves in that window,
		 * delay and check again to make sure that we avoid a race condition and then if we are still
		 * in a received script but didn't trigger it state, reset the processing engine.
		 */
		if (status.state == RemoteBridgeState.ReceivedCompleteScript) {
			await delay(2000);
			let status = await bridge.queryStatus();
		}

		if (status.state == RemoteBridgeState.ValidatedScript || status.state == RemoteBridgeState.ExecutingScript)
			throw new Errors.ScriptSentAtInvalidTime("Script sent while remote bridge was processing another script");
		
		/**
		 * If we still have a complete script that has not been triggered after the 2 second delay above, it should
		 * be safe to abandon it because no one else is going to trigger it.
		 */
		if (status.state == RemoteBridgeState.ReceivedCompleteScript) {
			notifier.updateDescription("Clearing previous script");
			await bridge.resetScript();
		}

		//Start our script
		await bridge.beginScript();
		notifier.finishOne();

		let speedCalculator = new SpeedCalculator(script.byteLength);

		for(let i = 0; i < script.byteLength; i += 20) {
			let slice = script.slice(i, i + 20);

			speedCalculator.update(i);
			notifier.startOne(`${speedCalculator.estimateRemaining()} remaining`, 1);
			await this.channel.write(IOTileTypes.IOTileCharacteristic.HighspeedData, slice);
			notifier.finishOne();
		}

		await bridge.endScript();
		}
	}

	public async close() {
		
	}
}

class SpeedCalculator {
	static readonly SETTLING_UPDATES: number = 100;

	private finished: number;
	private start: number;
	private updateCount: number;
	private invSpeed: number;

	constructor(private totalSize: number) {
		this.start = new Date().getTime();
		this.updateCount = 0;
		this.finished = 0;
		this.invSpeed = 0;
	}

	public update(finished: number) {
		if (finished === 0)
			return;

		let now = new Date().getTime();
		
		this.invSpeed = (now - this.start) / finished;
		this.updateCount += 1;
		this.finished = finished;
	}

	public estimateRemaining(): string {
		if (this.updateCount < SpeedCalculator.SETTLING_UPDATES)
			return "Estimating time";

		let remaining = this.invSpeed * (this.totalSize - this.finished) / 1000.0;
		let remMinutes = Math.floor(remaining / 60.0);
		let remSeconds = remaining - (remMinutes * 60.0);

		let minString = remMinutes.toFixed(0);
		let secString = remSeconds.toFixed(0);

		return `${minString} min ${secString} sec`;
	}
}