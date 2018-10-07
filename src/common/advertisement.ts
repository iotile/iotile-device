export interface IOTileAdvertisementFlags {
    hasData: boolean,
    otherConnected: boolean,
    lowVoltage: boolean,
    robustReports: boolean,
    fastWrites: boolean
}
  
export interface IOTileAdvertisement {
    batteryVoltage: number,
    deviceID: number,
    rssi: number,
    flags: IOTileAdvertisementFlags,
    connectionID: any,
    slug: string
}
