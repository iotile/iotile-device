///<reference path="../../typings/cordova_plugins.d.ts"/>
import {catStreaming} from "../config";
import * as IOTileTypes from "../common/iotile-types";
import {ReportParser} from "./iotile-report-parser";
import {SignedListReport, IndividualReport} from "../common/iotile-reports";

export class IOTileStreamingInterface {
    private channel: IOTileTypes.BLEChannel | undefined;
    private removeStreamingHandler: (() => Promise<void>) | null;
    private reportParser: ReportParser;

    constructor(bufferSize: number, expand:boolean = false) {
        this.removeStreamingHandler = null;
        this.reportParser = new ReportParser(bufferSize, expand);
    }

    public async open(channel: IOTileTypes.BLEChannel) {
        this.channel = channel;
        this.reportParser.reset();

        this.removeStreamingHandler = await this.channel.subscribe(IOTileTypes.IOTileCharacteristic.Streaming, (value: ArrayBuffer) => {
            this.receiveStreamingData(value);
        });
    }

    public async close() {
        if (this.removeStreamingHandler !== null) {
            await this.removeStreamingHandler();
            this.removeStreamingHandler = null;
            this.reportParser.reset();
        }
    }

    public stop() {
        this.reportParser.stop();
    }

    public reset() {
        this.reportParser.reset();
    }

    private receiveStreamingData(value: ArrayBuffer) {
        if (this.channel == null) {
            return;
        }

        try {
            let reports = this.reportParser.pushData(value);
            let event = this.reportParser.popLastEvent();

            if (event !== null) {
                switch (event.name) {
                    case 'ReportStartedEvent':
                    this.channel.notify(IOTileTypes.AdapterEvent.RobustReportStarted, event);
                    break;

                    case 'ReportStalledEvent':
                    this.channel.notify(IOTileTypes.AdapterEvent.RobustReportStalled, event);
                    break;

                    case 'ReportInvalidEvent':
                    this.channel.notify(IOTileTypes.AdapterEvent.RobustReportInvalid, event);
                    break;

                    case 'ReportProgressEvent':
                    this.channel.notify(IOTileTypes.AdapterEvent.RobustReportProgress, event);
                    break;

                    case 'ReportFinishedEvent':
                    this.channel.notify(IOTileTypes.AdapterEvent.RobustReportFinished, event);
                    break;
                }
            }

            for (let i = 0; i < reports.length; ++i) {
                let report = reports[i];

                if (report instanceof IndividualReport) {
                    try {
                        this.channel.notify(IOTileTypes.AdapterEvent.RawRealtimeReading, report);
                    } catch (err) {
                        catStreaming.error("Error notifying a callback for an individual report", err);
                    }
                } else if (report instanceof SignedListReport) {
                    try {
                        this.channel.notify(IOTileTypes.AdapterEvent.RawRobustReport, report);
                    } catch (err) {
                        catStreaming.error("Error notifying a callback for a robust report", err);
                    }
                } else {
                    //There should not be any other type of report that can be returned by the report parser but at least log a warning about this
                    catStreaming.warn('Unknown report type received from ReportParser, ignoring it.  Type: ' + report.constructor.name);
                }
            }
        } catch (err) {
            if (err.name === 'ReportParsingError' || err.name === 'InsufficientSpaceError') {
                this.channel.notify(IOTileTypes.AdapterEvent.UnrecoverableStreamingError, err);
            } else if (err.name === 'ReportParsingStoppedError') {
                //Ignore further errors if we've already reported that streaming has been stopped
                //due to an error.
            } else {
                catStreaming.error("Unknown error processing a streamed report", err);
            }
        }
    }
}

function buf2hex(buffer: ArrayBuffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
}