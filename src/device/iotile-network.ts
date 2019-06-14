import { WifiConfigError, EthernetConfigError } from './../common/error-space';
import { ArgumentError, unpackArrayBuffer, packArrayBuffer, padArrayBuffer, stringToBuffer, toUint32 } from '@iotile/iotile-common';
import { AbstractIOTileAdapter } from './iotile-base-types';
import { get } from 'lodash';

/**
 * All known short codes for converting settings into string names.
 */
export enum SettingCodes {
  IPConfig = 0,
  NetworkName = 1,
  NetworkKey = 2,
  SharedConnection = 3,
  InterfaceIndex = 4,
  ModemAPN = 5,
}

export enum NetworkInterfaces {
  Ethernet = 0,
  Wifi = 1
}

/**
 * A simple class for holding an IPV4 address and converting between representations
 */
export class IPV4Address {
  public address: any;
  private _parts: number[];

  constructor(address: any) {
    if (address instanceof IPV4Address) {
      address = address.asUint32()
    }
    if (typeof address === 'string') {
      const parts = address.split('.')
      if (parts.length != 4) {
        throw(new ArgumentError(`String IPV4 address did not have 4 dot separated parts: ${address}`))
      }
      this._parts = parts.map(x => parseInt(x));
    } else if (typeof address === 'number') {
      this._parts = [((address as number) >> 24) & 0xFF, ((address as number) >> 16) & 0xFF, ((address as number) >> 8) & 0xFF, ((address as number) >> 0) & 0xFF]
    } else if (address.length === 4) {
      this._parts = address.map((x: string) => parseInt(x));
    } else if (!address) {
      this._parts = [0, 0, 0, 0]
    } else {
      throw new ArgumentError(`Unknown type to create IPV4Address from: ${address}`)
    }
  }

  /**
   * Return the dotted address as a single 32 bit integer
   * 
   * X.Y.Z.W returns 0xXXYYZZWW
   */
  public asUint32(): number {
    const x = this._parts[0]
    const y = this._parts[1]
    const z = this._parts[2]
    const w = this._parts[3]

    return toUint32((x << 24) | (y << 16) | (z << 8) | w)
  }

  public toString(): string {
    return this._parts.join('.')
  }

  public isEqual(ip1: IPV4Address, ip2: IPV4Address): boolean {
    return ip1.asUint32() === ip2.asUint32()
  }
}

/**
 * A data class encapsulating a wifi or cellular network.
 */
export class WirelessNetwork {
  public static NO_AUTH = 0
  public static WPA2_PSK_AUTH = 1
  public static WPA2_ENTERPRISE = 2
  public static WEP_AUTH = 3
  public static UNKNOWN_AUTH = 4
  public static CELLULAR = 5

  public static AUTH_TABLE = {
    [WirelessNetwork.NO_AUTH]: 'Open',
    [WirelessNetwork.WPA2_PSK_AUTH]: 'WPA2 PSK',
    [WirelessNetwork.WPA2_ENTERPRISE]: 'WPA2 Enterprise',
    [WirelessNetwork.WEP_AUTH]: 'WEP',
    [WirelessNetwork.UNKNOWN_AUTH]: 'Unknown Auth',
    [WirelessNetwork.CELLULAR]: 'Cellular'
  };

  public ssid: string;
  public authType: number;
  public quality: any;
  public valid: boolean;

  /**
   * 
   * @param ssid 
   * @param authType 
   * @param quality 
   */
  constructor(ssid: string, authType: number, quality: number|null=null) {
    this.ssid = ssid;
    this.authType = authType;
    this.quality = quality;
    this.valid = true;
  }

  /**
   * Rebuild a WirelessNetwork from one or more encoded chunks.
   */
  public static FromEncodedChunks(encodedChunks: ArrayBuffer[]): WirelessNetwork {
    let valid = false;
    let authType = 0;
    let quality = null;
    let ssid = '';

    for (let i = 0; i < encodedChunks.length; i++) {
      const chunk = encodedChunks[i];
      let [authByte, signalQuality, totalLength, validLength, ssidChunk] = unpackArrayBuffer('BBBB16s', chunk);

      if (i === 0) {
        valid = !!(authByte & (1 << 4));
        authType = authByte & 0b1111;
        quality = signalQuality;
      }

      if (validLength < ssidChunk.length) {
        ssidChunk = ssidChunk.slice(0, validLength)
      }

      ssid += ssidChunk;
    }

    if (!valid) {
      return WirelessNetwork.InvalidNetwork();
    }

    return new WirelessNetwork(ssid, authType, quality);
  }

  public static InvalidNetwork(): WirelessNetwork {
    const net = new WirelessNetwork('None', WirelessNetwork.NO_AUTH);
    net.valid = false;
    return net;
  }

  public requiresPassword(): boolean {
    return this.authType !== WirelessNetwork.NO_AUTH;
  }

  public toString(): string {
    if (!this.valid) {
      return 'Invalid network';
    }
    return `${this.ssid} (${get(WirelessNetwork.AUTH_TABLE, this.authType, 'Unsupported auth')}, \
    quality=${this.quality})`
  }

  public encode(nameOffset: number): ArrayBuffer {
    const authByte = (this.authType & 0b1111) | ((this.valid as any << 0) << 4);

    let encodedName = new ArrayBuffer(0);

    if (this.ssid) {
      encodedName = stringToBuffer(this.ssid);
    }

    const totalLength = encodedName.byteLength;
    const remainingLength = Math.max(0, totalLength - nameOffset);
    const containedLength = Math.min(remainingLength, 16);
    let quality = this.quality;
    if (quality === null) {
      quality = 0;
    }

    let nameChunk = encodedName.slice(nameOffset, containedLength);
    if (nameChunk.byteLength < 16) {
      nameChunk = padArrayBuffer(nameChunk, 16);
    }

    return packArrayBuffer('BBBB16s', authByte, quality, totalLength, containedLength, nameChunk);
  }

}

export class NetworkInterfaceInfo {
  public id: any;
  public configured: boolean;
  public autoconnect: boolean;
  public valid: boolean;
  public static: boolean;
  public sharing: boolean | null;
  public error: number;
  public type: any;
  public carrier: any;
  
  private _ip4Addr: IPV4Address;
  private _ip4Gateway: IPV4Address;
  private _ip4Netmask: IPV4Address;
  private _ip4DNS: IPV4Address[];

  constructor(ifaceId: any, configured: boolean, ifaceType: any, carrier: any) {
    this.id = ifaceId
    this.configured = configured
    this.autoconnect = false
    this.valid = true
    this.static = false
    this.sharing = false
    this.error = 0
    this.type = ifaceType
    this.carrier = carrier
    this._ip4Addr = new IPV4Address("0.0.0.0")
    this._ip4Gateway = new IPV4Address("0.0.0.0")
    this._ip4Netmask = new IPV4Address("0.0.0.0")
    this._ip4DNS = []
  }

  get address() {
    return this._ip4Addr;
  }

  get gateway() {
    return this._ip4Gateway;
  }

  get netmask() {
    return this._ip4Netmask;
  }

  get dnsServers() {
    return this._ip4DNS;
  }

  /**
   * Build a NetworkInterfaceInfo object from an RPC response
   * @param {Arraybuffer} data The 20 byte packed binary data produced
   *    by a call to asRPCPayload
   */
  public static FromRPC(data: ArrayBuffer) {
    if (data.byteLength !== 20) {
      throw new ArgumentError(`Invalid rpc payload with the wrong length", expected=20, found=${data.byteLength}`)
    }

    const [ifaceByte, flags, error, ip4Addr, ip4Mask, ip4Gateway, dns] = unpackArrayBuffer('BBBxLLLL', data);

    const isStatic = !!(ifaceByte & (1 << 7));
    const ifaceId = ifaceByte & (0b111111);

    const [ifaceType, configured, media, sharing, autoconf, valid] = NetworkInterfaceInfo.ParseFlags(flags);

    const status = new NetworkInterfaceInfo(ifaceId, configured, ifaceType, media);
    status.sharing = sharing;
    status.error = error;
    status.autoconnect = autoconf;
    status.valid = valid;

    if (new IPV4Address(ip4Addr).toString() !== '0.0.0.0') {
      status.setIp4Info(ip4Addr, ip4Gateway, ip4Mask);
    }

    if (new IPV4Address(dns).toString() !== '0.0.0.0') {
      status.addDNS(dns);
    }

    status.static = isStatic;

    return status;
  }

  public static ParseFlags(flags: number): [number, boolean, boolean, boolean, boolean, boolean] {
    const ifaceType = flags & 0b111;

    const autoconf = !!(flags & (1 << 3));
    const configured = !!(flags & (1 << 4));
    const media = !!(flags & (1 << 5));
    const sharing = !!(flags & (1 << 6));
    const valid = !!(flags & (1 << 7));

    return [ifaceType, configured, media, sharing, autoconf, valid];
  }

  /**
   * Configure the ip address information for this interface.
   */
  public setIp4Info(addr: any, gateway: any, netmask: any) {
    this._ip4Addr = new IPV4Address(addr);
    this._ip4Gateway = new IPV4Address(gateway);
    this._ip4Netmask = new IPV4Address(netmask);
  }

  public addDNS(addr: any) {
    this._ip4DNS.push(new IPV4Address(addr));
  }

  public toString(): string {
    if (!this.valid) {
      return `Invalid Interface ${this.id}`
    }

    let out = 
    `
    Interface ${this.id}
      Basic Info:
        - Type: ${this.type}
        - Configured: ${this.configured}
        - Cable Plugged/Has Coverage: ${this.carrier}
        - Hotspot: ${this.sharing}
        - Autoconnect: ${this.autoconnect}
        - Error Code: ${this.error}
      IP Info:
        - Static IP: ${this.static}
        - IP Address: ${this._ip4Addr.toString()}
        - Netmask: ${this._ip4Netmask.toString()}
        - Gateway: ${this._ip4Gateway.toString()}
      DNS Servers:
    `

    for (const server of this._ip4DNS) {
      out += `  - ${server.toString()}\n`
    }

    return out;
  }

  public invalidInterface(ifaceId: number) {
    const info = new NetworkInterfaceInfo(ifaceId, false, 0, false);
    info.valid = false;
    return info;
  }

  /**
   * Pack this interface status as a an RPC response payload
   */
  public asRPCPayload() {
    const ifaceByte = this.id | (this.static as any << 7)
    const flags = this._packFlags();

    let dns = new IPV4Address('0.0.0.0');
    if (this._ip4DNS.length > 0) {
      dns = this._ip4DNS[0];
    }

    return packArrayBuffer('BBBxLLLL', ifaceByte, flags, this.error, this._ip4Addr.asUint32(), 
      this._ip4Netmask.asUint32(), this._ip4Gateway.asUint32(), dns.asUint32());
  }

  public _packFlags() {
    return (this.type & 0b111) | (this.valid as any << 7) | (this.sharing as any << 6)
      | (this.carrier as any << 5) | (this.configured as any << 4) | (this.autoconnect as any << 3)
  }
}

/**
 * Class to configure the network for a raspberry pi based access point
 */
export class NetworkConfig {

  private adapter: AbstractIOTileAdapter;
  private address: number;
  constructor(adapter: AbstractIOTileAdapter, address: number) {
    this.adapter = adapter;
    this.address = address;
  }

  /**
   * Capture and count the network interfaces on this device.
   *
   * This function must be called before any other interface related
   * functions are called since it captures the network devices for
   * future access.
   *
   * The interfaces may be accessed by index after calling this function
   * and their index number will always point to the same device until
   * this function is called again.
   *
   * @returns {Promise<number>}: The count of network devices.
   * 
   * @param address 
   */
  public async listInterfaces() {
    return this.adapter.errorHandlingRPC(this.address, 0x8000, "", "LL", [])
  }

  /**
   * Get basic information about a network interface.
   * 
   * This information includes the type of interface, whether it is currently
   * connected to a media / ethernet cable and what its IP information is.
   * 
   * @returns {Promise<string>} InterfaceInfo show-as string: An InterfaceInfo structure with the interface info.
   * 
   * @param {number} index The index of the interface we wish to query.
   *   This must be < the count returned by list_interfaces.
   */
  public async interfaceInfo(index: number): Promise<NetworkInterfaceInfo> {
    const [res] = await this.adapter.typedRPC(this.address, 0x8001, 'L', 'V', [index]);
    return NetworkInterfaceInfo.FromRPC(stringToBuffer(res)); 
  }

  /**
   * List all visible networks for a given interface.
   * 
   * @returns {Promise<string[]>} A list of visible WirelessNetwork objects
   * 
   * @param {number} index A network interface index.
   */
  public async listNetworks(index: number): Promise<WirelessNetwork[]> {
    const count = await this._captureNetworkList(index);

    let networks = [];
    for (let i = 0; i < count; i++) {
      networks.push(await this.networkInfo(i));
    }

    return networks;
  }

  /**
   * Get the active network for a given interface.
   *    
   * @returns {Promise<string>} WirelessNetwork show-as string: The active wireless network.
   *
   * @param {number} index A network interface index.
   */
  public async activeNetwork(index: number): Promise<WirelessNetwork> {
    await this._captureNetworkList(index);
    return this.networkInfo(-1);
  }

  /**
   * Get information on a given wireless network.

      You must have previously called list_networks to capture network
      information from a given interface and then you can iterate over those
      results by calling this function.  If the network name is longer than
      20 bytes, you can call this function with a nonzero offset in order to
      retrieve the higher parts of the name.  The same header information is
      repeated with each call, not just when offset=0.

      The response contains:
      - Network auth type and flags
      - Signal quality
      - Total name length
      - Valid name length in this segment
      - up to 16 bytes of the access point ssid or carrier name depending on whether
        the network is wifi or cellular.

      To enquire about the active network for the interface, pass -1 as the
      index.

   * @param {number} index The index of the network to enquire about. Pass -1 to
   *    ask about the active network
   */
  public async networkInfo(index: number): Promise<WirelessNetwork> {
    const chunks = [];
    let accumLength = 0;
    let totalLength = null;
    let chunkLength: number;

    while (totalLength === null || accumLength < totalLength) {
      const chunk = await this._networkInfoChunk(index, accumLength);
      [totalLength, chunkLength] = unpackArrayBuffer('xxBB', chunk.slice(0,4));
      accumLength += chunkLength;
      chunks.push(chunk);
    }

    return WirelessNetwork.FromEncodedChunks(chunks);
  }

  /**
   * Setup a basic wifi connection.

        You need to enter the network ssid and password (if there is one).  If
        you want a default dhcp based connection those are the only settings
        you need.  Otherwise, you can specify a static IP address by passing
        static_ip, dns, netmask and gateway.

        If you want to create a wifi hotspot, you can pass shared=True and the
        network name and password are used to create a wifi hotspot.  If you
        combine shared=True with a static IP then you can set the IP of the
        node and the netmask it will use to allocate IPs for other computers
        connecting to its hotspot.  The dns and gateway options are ignored if
        shared=True.

   * @param {number} iface The index of the interface that we wish to configure as
                a wifi network.  This should be a wifi type interface.
   * @param {string} networkName The ssid of the network that you wish to join
   * @param {string} password An optional password for the network
   * @param {string} staticIp An optional static ipv4 address in X.Y.Z.W format
   * @param {string} dns An optional dns server in X.Y.Z.W format, only used if
                combined with static_ip.
   * @param {string} netmask An optional netmask in X.Y.Z.W format, only used if
                combined with static_ip.
   * @param {string} gateway An optional default gateway for routing traffic.  Only
                used if combined with static_ip.
   * @param {boolean} shared Whether to setup the interface as a hotspot or not.
   */
  public async configWifi(iface: number, networkName: string, password: string="", staticIp:(string | null)=null,
    dns:(string | null)=null, netmask:(string | null)=null, gateway:(string | null)=null, shared:boolean=false) {

      await this.beginConnection()

      await this.pushConfigSetting(SettingCodes.InterfaceIndex, iface);
      await this.pushConfigSetting(SettingCodes.NetworkName, networkName);

      if (password) {
        await this.pushConfigSetting(SettingCodes.NetworkKey, password);
      }

      const ipv4Config = new NetworkInterfaceInfo(iface, true, 0, true);
      ipv4Config.autoconnect = true;

      if (staticIp) {
        ipv4Config.static = true;
        if (!shared) {
          if (dns === null || netmask === null || gateway === null) {
            throw new WifiConfigError(`You specified a static IP address but did not also specify a DNS server,
            netmask and gateway.`, staticIp as any, dns as any, netmask as any, gateway as any)
          }

          ipv4Config.setIp4Info(staticIp, gateway, netmask);
          ipv4Config.addDNS(dns);
        } else {
          if (netmask === null) {
            throw new WifiConfigError(`You specified a static IP address as a hotspot but did not include a netmask.`,
             staticIp as any, dns as any, netmask as any, gateway as any);
          }

          ipv4Config.setIp4Info(staticIp, '0.0.0.0', netmask);
        }
      }

      ipv4Config.sharing = shared;

      await this.pushConfigSetting(SettingCodes.IPConfig, ipv4Config);
      await this.pushConfigSetting(SettingCodes.SharedConnection, shared);
      await this.finishConnection(iface);
  }

  /**
   * Set up the ethernet configuration of a device. Currently only designed for static ip allocation.
   * 
   * @param {number} iface The index of the interface that we wish to configure as
                an ethernet network.  This should be a wifi type interface.
   * @param {string} staticIp An optional static ipv4 address in X.Y.Z.W format
   * @param {string} dns An optional dns server in X.Y.Z.W format, only used if
                combined with static_ip.
   * @param {string} netmask An optional netmask in X.Y.Z.W format, only used if
                combined with static_ip.
   * @param {string} gateway An optional default gateway for routing traffic.  Only
                used if combined with static_ip.
   */
  public async configEthernet(iface: number, staticIp:(string | null)=null,
  dns:(string | null)=null, netmask:(string | null)=null, gateway:(string | null)=null) {
    await this.beginConnection();

    await this.pushConfigSetting(SettingCodes.InterfaceIndex, iface);

    const ipv4Config = new NetworkInterfaceInfo(iface, true, 1, true);
    ipv4Config.autoconnect = true;

    if (staticIp) {
      ipv4Config.static = true;
      if (netmask === null || gateway === null) {
        throw new EthernetConfigError(`You specified a static IP address but did not also specify a 
        netmask and gateway.`, staticIp as any, dns as any, netmask as any, gateway as any)
      }
      ipv4Config.setIp4Info(staticIp, gateway, netmask);
      if (dns) {
        ipv4Config.addDNS(dns);
      }
    }
    ipv4Config.sharing = false;

    await this.pushConfigSetting(SettingCodes.IPConfig, ipv4Config);
    await this.pushConfigSetting(SettingCodes.SharedConnection, false);
    await this.finishConnection(iface);
  }

  /**
   * Begin pushing settings for a new configuration.
   */
  public beginConnection() {
    return this.adapter.typedRPC(this.address, 0x8005, "", "", [])
  }

  /**
   * Finish pushing settings for a new configuration.
   */
  public async finishConnection(index: any) {
     try {
       await this.adapter.errorHandlingRPC(this.address, 0x8008, "L", "L", [index])
     } catch(err) {
       if (err.name === 'RPCError') {
         err.message = "Unable to configure connection";
       }
       throw err;
     }
  }

  /**
   * Push a config setting by short id code.
   */
  public async pushConfigSetting(settingCode: SettingCodes, value: any) {
    if (!(value instanceof ArrayBuffer)) {
      value = this.encodeValue(value)
    }

    const autocommit = value.byteLength < 16
    const flags = autocommit as any << 0

    const initialChunk = value.slice(0, 16);
    const validLength = initialChunk.byteLength;

    const initialData = padArrayBuffer(initialChunk, 16);

    try {
      await this.adapter.errorHandlingRPC(this.address, 0x8006, "HBB16s", "L", [settingCode, flags, validLength, initialData]);
    } catch(err) {
      if (err.name === 'RPCError') {
        err.message = `Error starting connection setting value. \
        initialData=${initialData}; settingCode=${settingCode}`;
      }
      throw err;
    }

    let remaining: ArrayBuffer = value.slice(16, value.byteLength);

    while (remaining.byteLength > 0) {
      const commit = remaining.byteLength <= 18
      await this._pushSettingValueChunk(remaining.slice(0, 18), commit);

      remaining = remaining.slice(18, remaining.byteLength);
    }
  }

  public encodeValue(value: any): ArrayBuffer {
    if (typeof value === 'boolean') {
      return packArrayBuffer('B', value);
    }
    if (typeof value === 'number') {
      return packArrayBuffer('l', value);
    }
    if (typeof value === 'string') {
      return packArrayBuffer(value.length + 's', value)
    }
    if (value instanceof NetworkInterfaceInfo) {
      return value.asRPCPayload();
    }

    throw new ArgumentError(`Unknown value type, cannot encode, type=${typeof value}, value=${value}`)
  }

  private async _pushSettingValueChunk(data: ArrayBuffer, commit: boolean=false) {
    const flags = commit as any << 0;

    if (data.byteLength > 18) {
      throw new ArgumentError('Attempting to send too much data in a single rpc')
    }

    const validLength = data.byteLength;
    if (data.byteLength < 18) {
      data = padArrayBuffer(data, 18);
    }

    try {
      await this.adapter.errorHandlingRPC(this.address, 0x8007, 'BB18s', 'L', [flags, validLength, data])
    } catch(err) {
      if (err.name === 'RPCError') {
        err.message = `Error pushing chunk of conection setting value. \
        data=${data}, commit=${commit}`;
      }
      throw err;
    }
  }

  /**
   * Get information on a given wireless network.

        You must have previously called list_networks to capture network
        information from a given interface and then you can iterate over those
        results by calling this function.  If the network name is longer than
        20 bytes, you can call this function with a nonzero offset in order to
        retrieve the higher parts of the name.  The same header information is
        repeated with each call, not just when offset=0.

        The response contains:
        - Network auth type and flags
        - Signal quality
        - Total name length
        - Valid name length in this segment
        - up to 16 bytes of the access point ssid or carrier name depending on whether
          the network is wifi or cellular.

        To enquire about the active network for the interface, pass -1 as the
        index.

   * @param index 
   * @param offset 
   */
  private async _networkInfoChunk(index: number, offset: number): Promise<ArrayBuffer> {
    const [info] = await this.adapter.typedRPC(this.address, 0x8003, 'lB', '20s', [index, offset]);
    return stringToBuffer(info);
  }

  private async _captureNetworkList(index: number): Promise<number> {
    try {
      const [count] = await this.adapter.errorHandlingRPC(this.address, 0x8002, 'L', 'LL', [index]);
      return count;
    } catch(err) {
      if (err.name === 'RPCError') {
        err.message = `Error listing networks for interface, interface_index=${index}`;
      }
      throw err;
    }
  }
}