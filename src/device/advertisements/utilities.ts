import { numberToHexString } from "@iotile/iotile-common";

//Public domain code from https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
export function parseUTF8String(data: ArrayBuffer | SharedArrayBuffer): string {
    let bytes = new Uint8Array(data);
    let i = 0;
    let s = '';

    while (i < bytes.length) {
        var c = bytes[i++];
        if (c > 127) {
            if (c > 191 && c < 224) {
                if (i >= bytes.length)
                    throw new Error('UTF-8 decode: incomplete 2-byte sequence');
                c = (c & 31) << 6 | bytes[i++] & 63;
            } else if (c > 223 && c < 240) {
                if (i + 1 >= bytes.length)
                    throw new Error('UTF-8 decode: incomplete 3-byte sequence');
                c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else if (c > 239 && c < 248) {
                if (i + 2 >= bytes.length)
                    throw new Error('UTF-8 decode: incomplete 4-byte sequence');
                c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
        }

        if (c <= 0xffff) {
            s += String.fromCharCode(c);  
        } 
        else if (c <= 0x10ffff) {
            c -= 0x10000;
            s += String.fromCharCode(c >> 10 | 0xd800)
            s += String.fromCharCode(c & 0x3FF | 0xdc00)
        } else {
            throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');  
        } 
    }

    return s;
}

/**
 * Turn a binary 128 bit uuid into a string of the format {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
 * 
 * All hex digits are printing in upper case.
 *  
 * @param data A 16-byte data field containin a binary UUID in either little-endian
 *             or big endian format.
 * @param reverse Reverse the 16-bytes before parsing them.  This is useful if the
 *                data is being sent as a 128-bit little endian value such as what
 *                is included in Bluetooth advertisement packets.
 */
export function parseBinaryUUID(data: ArrayBuffer | SharedArrayBuffer, reverse: boolean): string {
    if (data.byteLength !== 16) throw new Error(`A binary 128-bit uuid must be exactly 16 bytes long, length was  ${data.byteLength}`);

    if (reverse) {
        let reversedData = new Uint8Array(16);
        let origData = new Uint8Array(data);

        for (let i = 0; i < 16; ++i) {
            reversedData[15 - i] = origData[i];
        }

        data = <any>reversedData.buffer;
    }

    let view = new DataView(data);

    let timeLow = numberToHexString(view.getUint32(0, false), 8);
    let timeMid = numberToHexString(view.getUint16(4, false), 4);
    let timeHigh = numberToHexString(view.getUint16(6, false), 4);
    let clockResHigh = numberToHexString(view.getUint8(8), 2);
    let clockResLow = numberToHexString(view.getUint8(9), 2);
    let node1 = numberToHexString(view.getUint16(10, false), 4);
    let node2 = numberToHexString(view.getUint32(12, false), 8);

    let guid = `${timeLow}-${timeMid}-${timeHigh}-${clockResHigh}${clockResLow}-${node1}${node2}`;
    return guid.toUpperCase();
}

/**
 * Turn a binary 16 bit uuid into a string of the format {xxxx}
 * 
 * All hex digits are printing in upper case.
 *  
 * @param data A 2-byte data field containin a binary UUID in either little-endian
 *             or big endian format.
 * @param reverse Reverse the 2-bytes before parsing them.  This is useful if the
 *                data is being sent as a 16-bit little endian value such as what
 *                is included in Bluetooth advertisement packets.
 */
export function parseBinary16BitUUID(data: ArrayBuffer | SharedArrayBuffer, reverse: boolean): string {
    if (data.byteLength !== 2) throw new Error(`A binary 16-bit uuid must be exactly 2 bytes long, length was  ${data.byteLength}`);

    if (reverse) {
        let reversedData = new Uint8Array(2);
        let origData = new Uint8Array(data);

        for (let i = 0; i < 2; ++i) {
            reversedData[1 - i] = origData[i];
        }

        data = <any>reversedData.buffer;
    }

    let view = new DataView(data);

    let UUID = numberToHexString(view.getUint16(0, false), 4);

    return UUID.toUpperCase();
}