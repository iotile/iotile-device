/**
 * Convert a base64 encoded file into an ArrayBuffer.
 */

class BinaryToArrayBuffer {
    process(src, filename, config, options) {
        var source = `
        function createArrayBuffer(base64Data) {
            var raw = atob(base64Data);
            var rawLength = raw.length;
            var array = new Uint8Array(new ArrayBuffer(rawLength));
        
            for(let i = 0; i < rawLength; i++) {
                array[i] = raw.charCodeAt(i);
            }
        
            return array.buffer;
        }

        var data = createArrayBuffer("${src}");

        module.exports = data;
        `;

        return source;
    }
}

module.exports = new BinaryToArrayBuffer();