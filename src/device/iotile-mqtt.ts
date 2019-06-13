import { ArgumentError, stringToBuffer } from '@iotile/iotile-common';
import { AbstractIOTileAdapter } from './iotile-base-types';
import { RPCError } from '../common/error-space';

export enum BridgeEnum {    
  Connection = 1,
  Address = 2,
  RemoteUsername = 4,
  RemotePassword = 5,
  Topic = 6,
  TryPrivate = 7,
  TLS = 8
}

export enum TLSEnum {
  CAFile = 0,
  CertFile = 1,
  KeyFile = 2
}

/**
 * A proxy object to configure a local MQTT broker that is in bridge mode
 */
export class MQTTBridgeConfig {

  private adapter: AbstractIOTileAdapter;
  private address: number;
  constructor(adapter: AbstractIOTileAdapter, address: number) {
    this.adapter = adapter;
    this.address = address;
  }

  /**
   * Brokers currently supported must be running with anonymous connections allowed,
        or require a username and/or password for auth. If you are using TLS, you should
        have sent the required files over using the TLS methods in this proxy first.

        Please note that we currently only support a single TLS connected broker. If you
        overwrite the TLS files that another connection is using, you will break it.

        You can add connections that have either plain or password authentication in any quantity.

   * @param {string} name Unique connection name.
   * @param {string} url IP or URL that the bridged broker is running on
   * @param {number} port Port used by the bridged broker. Defaults to 1883. Must be numeric.
   * @param {string} remoteUsername Optional username if the bridge requires one
   * @param {string} remotePassword Optional password if the bridge requires one 
   * @param {boolean} tls Optionally set TLS mode. Send certificates first.
   */
  public async addBridge(name: string, url: string, port:number = 1883, remoteUsername:string|null = null, 
    remotePassword:string|null = null, tls:boolean|null = null) {

      if (typeof port !== 'number') {
        throw new ArgumentError('Error, your port must contain only numbers. Please try again.')
      }

      await this._clearPendingBridge()

      // Add name
      let offset = 0;
      let done = 0;
      while (!done) {
        const end = Math.min(offset + 19, name.length);
        if (end === name.length) {
          done = 1;
        }
        try {
          await this.adapter.errorHandlingRPC(this.address, 0xAA02, 'BV', 'L', [done, stringToBuffer(name.slice(offset,end))]);
        } catch (err) {
          if (err instanceof RPCError && err.errorCode === 2) {
            throw new ArgumentError('Error, that connection name is already taken, please try again.');
          } else {
            throw err
          }
        }
        offset += 19;
      }

      // Add url:port combo
      await this._buildBridge(BridgeEnum.Address, url + ':' + port);

      if ((tls && remoteUsername) || (tls && remotePassword)) {
        throw new ArgumentError('Cannot set both TLS and login mode');
      }

      if (remoteUsername) {
        await this._buildBridge(BridgeEnum.RemoteUsername, remoteUsername);
      }
      if (remotePassword) {
        await this._buildBridge(BridgeEnum.RemotePassword, remotePassword);
      }
      if (tls) {
        await this._buildBridge(BridgeEnum.TLS, 'on');
      }

      // Commit the new bridge
      try {
        await this.adapter.errorHandlingRPC(this.address, 0xAA04, '', 'B', []);
      } catch (err) {
        if (err instanceof RPCError && err.errorCode === 2) {
          throw new ArgumentError('Error committing bridge, you set TLS but the certificates were incomplete.');
        } else {
          throw err
        }
      }
  }

  /**
   * Remove an existing bridge by name
   * @param {string} bridgeName Name of the bridge that you wish to remove
   */
  public async removeBridge(bridgeName: string) {
    let offset = 0;
    let done = 0;
    while (!done) {
      const end = Math.min(offset + 19, bridgeName.length);
      if (end === bridgeName.length) {
        done = 1;
      }

      try {
        await this.adapter.errorHandlingRPC(this.address, 0xAA05, 'BV', 'B', [done, stringToBuffer(bridgeName.slice(offset, end))]);
      } catch (err) {
        if (err instanceof RPCError && err.errorCode === 2) {
          throw new ArgumentError('Bridge not removed because the name doesn\'t exist, please double check spelling.');
        } else if (err.errorCode !== 1) { // errorCode 1 is actually success
          console.log("ERR:", err);
          throw err
        }
      }
      offset += 19;
    }
  }

  /**
   * Your CA certificate. Needs to be pem encoded. Will overwrite an existing CA certificate.
   * @param {string} source Path to file 
   */
  public async sendCertfile(source: string, readFileSync: any) {
    await this._sendTLSFile(source, TLSEnum.CertFile, readFileSync);
  }

  /**
   * The CA file is typically obtained from your certificate authority. Will overwrite an existing CA file.

        It might show up with a name like rootCA.pem

   * @param {string} source Path to file 
   */
  public async sendCAFile(source: string, readFileSync: any) {
    await this._sendTLSFile(source, TLSEnum.CAFile, readFileSync);
  }

  /**
   * The actual text content of the entire mosquitto configuration file.

        Right now, this just contains bridge info, but in the future might also contain security settings,
        certificate file locations for various bridges, and other configurable items.

      @returns {Promise<string>} The full mosquitto config
   */
  public async listFullMosquittoConfig(): Promise<string> {
    let offset = 0;
    let full = '';
    let  [res]: [string] = await this.adapter.typedRPC(this.address, 0xAA00, 'L', 'V', [offset]);
    
    full += res;
    while (res.length === 20) {
      offset += 20;
      [res] = await this.adapter.typedRPC(this.address, 0xAA00, 'L', 'V', [offset]);
      full += res;
    }

    return full;
  }

  /**
   * Your private keyfile. Should be pem encoded. Will overwrite an existing keyfile.
   * @param {string} source Path to file 
   */
  public async sendKeyFile(source: string, readFileSync: any) {
    await this._sendTLSFile(source, TLSEnum.KeyFile, readFileSync);
  }

  private async _clearPendingBridge() {
    await this.adapter.typedRPC(this.address, 0xAA06, '', '', []);
  }

  /**
   * Builds all enumerated bridge setting values
   */
  private async _buildBridge(itemId: BridgeEnum, itemData: string) {
    let offset = 0;
    let done = 0;
    while (!done) {
      const end = Math.min(offset + 18, itemData.length);
      if (end === itemData.length) {
        done = 1;
      }
      await this.adapter.typedRPC(this.address, 0xAA03, 'BBV', '', [itemId, done, stringToBuffer(itemData.slice(offset, end))]);
      offset += 18;
    }
  }

  private async _sendTLSFile(source: string, tlsFileType: TLSEnum, readFileSync: any) {
    await this.adapter.typedRPC(this.address, 0xAA10, '', '', []); // clear
    await this.adapter.typedRPC(this.address, 0xAA11, 'B', '', [tlsFileType]); // set which file

    const src = readFileSync(source, {"encoding": "utf8"});
    
    let offset = 0;
    let done = 0;
    while (!done) {
      const end = Math.min(offset + 20, src.length);
      if (end === src.length) {
        done = 1;
      }
      await this.adapter.typedRPC(this.address, 0xAA13, 'V', '', [stringToBuffer(src.slice(offset, end))]);
      offset += 20;
    }

  }
}